import { afterEach, describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

vi.mock("@/core/project", () => ({ Project: class Project {} }));
vi.mock("@/core/stage/stage-object/abstract/connectable-entity", () => ({
  ConnectableEntity: class ConnectableEntity {},
}));

import { SvgNode } from "./svg-node";
import { CollisionBox } from "../collision-box/collision-box";

describe("SVG resource lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("constructs deferred nodes without browser APIs and retains missing attachment geometry", () => {
    vi.stubGlobal("Image", undefined);
    const collisionBox = new CollisionBox([new Rectangle(new Vector(12.34, 5.67), new Vector(120, 80))]);
    const node = new SvgNode({ attachments: new Map() } as never, { collisionBox }, { deferResources: true });
    expect(node.image).toBeUndefined();
    node.initializeResources();
    expect(node.collisionBox).toBe(collisionBox);
  });

  it("links resources explicitly, replaces URLs and ignores late load events after disposal", () => {
    const images: Array<{
      src: string;
      naturalWidth: number;
      naturalHeight: number;
      onload: (() => void) | null;
      onerror: (() => void) | null;
    }> = [];
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        naturalWidth = 100;
        naturalHeight = 50;
        onload = null;
        onerror = null;
        constructor() {
          images.push(this);
        }
      },
    );
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:first")
      .mockReturnValueOnce("blob:second");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const node = new SvgNode(
      { attachments: new Map([["svg", new Blob(["svg"])]]) } as never,
      { attachmentId: "svg", scale: 0.5 },
      { deferResources: true },
    );
    expect(createUrl).not.toHaveBeenCalled();
    node.initializeResources();
    images[0].onload!();
    expect(node.collisionBox.getRectangle().size).toEqual(new Vector(50, 25));
    const staleLoad = images[0].onload!;
    node.initializeResources();
    expect(revokeUrl).toHaveBeenCalledWith("blob:first");
    node.dispose();
    expect(revokeUrl).toHaveBeenCalledWith("blob:second");
    staleLoad();
    expect(node.image).toBeUndefined();
    node.initializeResources();
    expect(createUrl).toHaveBeenCalledTimes(2);
  });
});
