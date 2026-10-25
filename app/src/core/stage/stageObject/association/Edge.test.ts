import { beforeEach, describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

const setting = vi.hoisted(() => ({ style: (() => {}) as (value: string) => void }));
vi.mock("@/core/Project", () => ({ Project: class {} }));
vi.mock("@/core/render/canvas2d/renderer", () => ({ Renderer: { FONT_SIZE: 24 } }));
vi.mock("@/core/service/Settings", () => ({
  Settings: {
    enableAutoEdgeWidth: false,
    watch: (_key: string, callback: (value: string) => void) => {
      setting.style = callback;
      callback("bezier");
    },
  },
}));
vi.mock("@/utils/font", () => ({ getMultiLineTextSize: () => new Vector(20, 20) }));
vi.mock("../abstract/ConnectableEntity", () => ({ ConnectableEntity: class {} }));
vi.mock("../entity/ConnectPoint", () => ({ ConnectPoint: class {} }));
vi.mock("../entity/TextNode", () => ({ TextNode: class {} }));
vi.mock("../entity/Section", () => ({ Section: class {} }));
vi.mock("../entity/ImageNode", () => ({ ImageNode: class {} }));

import { CollisionBox } from "../collisionBox/collisionBox";
import { TextNode } from "../entity/TextNode";
import { Section } from "../entity/Section";
import { LineEdge } from "./LineEdge";
import { EdgeCollisionBoxGetter } from "./EdgeCollisionBoxGetter";
import { Settings } from "@/core/service/Settings";

function node(x: number) {
  return Object.assign(Object.create(TextNode.prototype), {
    uuid: crypto.randomUUID(),
    collisionBox: new CollisionBox([new Rectangle(new Vector(x, 0), new Vector(100, 80))]),
    getBorderWidth: () => 2,
    clipConnectionToBoundary: true,
  }) as TextNode;
}
function setup() {
  const source = node(0),
    target = node(300);
  const edge = new LineEdge({} as never, { associationList: [source, target] });
  return { source, target, edge };
}
beforeEach(() => {
  EdgeCollisionBoxGetter.init();
  Settings.enableAutoEdgeWidth = false;
});

describe("edge geometry cache", () => {
  it("clips non-center text anchors to node boundaries", () => {
    const { edge } = setup();
    edge.sourceRectangleRate = new Vector(0.25, 0.25);
    edge.targetRectangleRate = new Vector(0.75, 0.25);
    expect(edge.bodyLine.start).toEqual(new Vector(100, 20));
    expect(edge.bodyLine.end).toEqual(new Vector(300, 20));
  });
  it("reuses world geometry while endpoints and connection rates are unchanged", () => {
    const { edge } = setup();
    const line = edge.bodyLine,
      box = edge.collisionBox;
    for (let i = 0; i < 120; i++) {
      expect(edge.bodyLine).toBe(line);
      expect(edge.collisionBox).toBe(box);
    }
  });
  it("invalidates on in-place movement, resizing, rate changes and endpoint replacement", () => {
    const { source, target, edge } = setup();
    let line = edge.bodyLine;
    (source.collisionBox.shapes[0] as Rectangle).location.x += 40;
    expect(edge.bodyLine.start.x).toBe(140);
    expect(edge.bodyLine).not.toBe(line);
    line = edge.bodyLine;
    (target.collisionBox.shapes[0] as Rectangle).size.y += 60;
    expect(edge.bodyLine).not.toBe(line);
    line = edge.bodyLine;
    edge.sourceRectangleRate.y = 0.01;
    expect(edge.bodyLine.start).toEqual(new Vector(90, 0));
    expect(edge.bodyLine).not.toBe(line);
    line = edge.bodyLine;
    edge.target = node(300);
    expect(edge.bodyLine).not.toBe(line);
  });
  it("invalidates collision geometry for line style, offset and width changes", () => {
    const { source, edge } = setup();
    let box = edge.collisionBox;
    setting.style("straight");
    expect(edge.collisionBox).not.toBe(box);
    box = edge.collisionBox;
    edge.shiftingIndex = 1;
    expect(edge.collisionBox).not.toBe(box);
    box = edge.collisionBox;
    setting.style("bezier");
    source.getBorderWidth = () => 8;
    expect(edge.collisionBox).not.toBe(box);
    box = edge.collisionBox;
    Settings.enableAutoEdgeWidth = true;
    expect(edge.collisionBox).not.toBe(box);
  });
  it("refreshes self-loop bounds and section edges after resizing", () => {
    const { source, edge } = setup();
    edge.target = source;
    const box = edge.collisionBox;
    (source.collisionBox.shapes[0] as Rectangle).size.y = 200;
    expect(edge.collisionBox).not.toBe(box);
    expect(edge.collisionBox.getRectangle().height).toBe(200);
    Object.setPrototypeOf(source, Section.prototype);
    expect(edge.collisionBox.getRectangle().height).toBe(200);
  });
});
