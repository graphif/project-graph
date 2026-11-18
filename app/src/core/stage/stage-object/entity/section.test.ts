import { describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
vi.mock("@/core/project", () => ({ Project: class {} }));
vi.mock("@/core/render/canvas2d/renderer", () => ({ Renderer: { FONT_SIZE: 24, NODE_PADDING: 10 } }));
vi.mock("@/core/service/settings", () => ({ Settings: {} }));
vi.mock("@/core/stage/stage-object/abstract/connectable-entity", () => ({ ConnectableEntity: class {} }));
vi.mock("@/core/stage/stage-object/abstract/stage-entity", () => ({ Entity: class {} }));
vi.mock("@/core/stage/stage-object/association/muti-target-undirected-edge", () => ({
  MultiTargetUndirectedEdge: class {},
}));
vi.mock("@/utils/font", () => ({ getTextSize: () => new Vector(50, 24) }));
import { Section } from "./section";
import { MultiTargetUndirectedEdge } from "../association/muti-target-undirected-edge";
import { CollisionBox } from "../collision-box/collision-box";

describe("section enclosure bounds", () => {
  it.each(["convex", "circle"])("includes internal %s outlines but excludes crossing edges", (renderType) => {
    const node = (x: number) => ({
      collisionBox: new CollisionBox([new Rectangle(new Vector(x, 100), new Vector(40, 40))]),
    });
    const a = node(100),
      b = node(200),
      outside = node(2000);
    const edge = Object.assign(Object.create(MultiTargetUndirectedEdge.prototype), {
      renderType,
      associationList: [a, b],
      collisionBox: new CollisionBox([new Rectangle(new Vector(50, 20), new Vector(300, 300))]),
    });
    const crossing = Object.assign(Object.create(MultiTargetUndirectedEdge.prototype), {
      renderType,
      associationList: [a, outside],
      collisionBox: new CollisionBox([new Rectangle(new Vector(-1000, -1000), new Vector(4000, 4000))]),
    });
    const section = Object.assign(Object.create(Section.prototype), {
      text: "group",
      children: [a, b],
      project: { stageManager: { getAssociations: () => [edge, crossing] } },
      _collisionBoxNormal: new CollisionBox([]),
      collapsedCollisionBox: () => new CollisionBox([]),
    });
    section.adjustLocationAndSize();
    let rect = section._collisionBoxNormal.getRectangle();
    expect(rect.left).toBe(20);
    expect(rect.right).toBe(380);
    expect(rect.bottom).toBe(350);
    edge.renderType = "line";
    section.adjustLocationAndSize();
    rect = section._collisionBoxNormal.getRectangle();
    expect(rect.left).toBe(70);
    expect(rect.right).toBe(270);
    expect(rect.bottom).toBe(170);
  });
});
