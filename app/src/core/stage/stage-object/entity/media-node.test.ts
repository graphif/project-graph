import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/project", () => ({ Project: class Project {} }));
vi.mock("@/core/service/media-playback-service/media-playback-manager", () => ({ MediaPlaybackManager: class {} }));
vi.mock("@/core/stage/stage-object/abstract/connectable-entity", () => ({
  ConnectableEntity: class ConnectableEntity {},
}));

import { MediaNode } from "./media-node";

describe("media resource initialization", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(["audio", "video"] as const)("defers %s loading until the graph is linked", (mediaKind) => {
    const load = vi.spyOn(MediaNode.prototype, "loadMedia").mockResolvedValue();
    const project = { attachments: new Map([["media", new Blob(["media"])]]) };
    const node = new MediaNode(
      project as never,
      { attachmentId: "media", mediaKind, title: "Saved title" },
      false,
      undefined,
      { deferResources: true },
    );
    expect(load).not.toHaveBeenCalled();
    expect(node.title).toBe("Saved title");
    expect(node.mediaKind).toBe(mediaKind);
    node.initializeResources();
    expect(load).toHaveBeenCalledOnce();
  });

  it("retains missing attachment state without starting browser resources", () => {
    const load = vi.spyOn(MediaNode.prototype, "loadMedia").mockResolvedValue();
    const node = new MediaNode({ attachments: new Map() } as never, {}, false, undefined, { deferResources: true });
    expect(node.state).toBe("notFound");
    node.initializeResources();
    expect(node.state).toBe("notFound");
    expect(load).not.toHaveBeenCalled();
  });
});
