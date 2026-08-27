// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/Project", () => ({ Project: class Project {} }));
vi.mock("@/core/stage/stageObject/abstract/ConnectableEntity", () => ({
  ConnectableEntity: class ConnectableEntity {
    details = [];
    parentSection = null;
    updateFatherSectionByMove() {}
  },
}));
vi.mock("@/core/service/Settings", () => ({
  Settings: {
    compressImageToBlackAndWhite: false,
    compressImageToWebp: false,
    maxPastedImageSize: 1024,
    resizePastedImages: false,
    webpQuality: 0.8,
  },
}));
vi.mock("@/core/service/dataManageService/imageUtils", () => ({ applyBlackAndWhite: vi.fn() }));

import { ImageNode } from "./ImageNode";

describe("ImageNode cleanup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("waits for an in-flight bitmap and closes it when disposal has started", async () => {
    let resolveBitmap: ((bitmap: ImageBitmap) => void) | undefined;
    const bitmap = { close: vi.fn(), width: 20, height: 10 } as unknown as ImageBitmap;
    const createBitmap = vi.fn(
      () =>
        new Promise<ImageBitmap>((resolve) => {
          resolveBitmap = resolve;
        }),
    );
    vi.stubGlobal("createImageBitmap", createBitmap);
    const project = {
      addAttachment: vi.fn(),
      attachments: new Map([["image", new Blob(["image"])]]),
    };
    const node = new ImageNode(project as never, { attachmentId: "image" });
    const dispose = (node as unknown as { dispose?: () => Promise<void> }).dispose;

    expect(dispose).toBeTypeOf("function");
    const disposal = dispose!.call(node);
    resolveBitmap?.(bitmap);
    await disposal;

    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(node.bitmap).toBeUndefined();
  });

  it("reports bitmap loading failure to the DOM and preserves it for cleanup", async () => {
    const failure = new Error("bitmap decode failed");
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => Promise.reject(failure)),
    );
    const project = {
      addAttachment: vi.fn(),
      attachments: new Map([["image", new Blob(["image"])]]),
    };
    const onError = vi.fn((event: ErrorEvent) => event.preventDefault());
    window.addEventListener("error", onError);
    const node = new ImageNode(project as never, { attachmentId: "image" });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onError.mock.calls[0][0].error).toBe(failure);
    await expect(node.dispose()).rejects.toEqual(
      expect.objectContaining({ errors: [failure], message: "ImageNode cleanup failed" }),
    );

    window.removeEventListener("error", onError);
  });
});
