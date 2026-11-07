import { describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Project } from "@/core/Project";

vi.mock("../abstract/Association", () => ({ Association: class {} }));
vi.mock("../entity/Section", () => ({ Section: class {} }));
vi.mock("../entity/TextNode", () => ({ TextNode: class {} }));
vi.mock("../entity/LatexNode", () => ({
  LatexNode: class {
    constructor(_project: unknown, options: object) {
      Object.assign(this, options);
    }
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { Association } from "../abstract/Association";
import { CollisionBox } from "../collisionBox/collisionBox";
import { Section } from "../entity/Section";
import { TextNode } from "../entity/TextNode";
import { LatexNode } from "../entity/LatexNode";
import { convertLatexNodes } from "./convertLatexNodes";
import { toast } from "sonner";

const textNode = (text: string) =>
  Object.assign(Object.create(TextNode.prototype), {
    uuid: crypto.randomUUID(),
    text,
    details: [],
    fontScaleLevel: 2,
    isSelected: false,
    collisionBox: new CollisionBox([new Rectangle(new Vector(10, 20), new Vector(200, 60))]),
  }) as TextNode;

describe("loaded formula conversion", () => {
  it("preserves node identity, geometry, selection, groups and edge endpoints", () => {
    const formula = textNode(String.raw`\begin{equation}\mathbf{F}=m\mathbf{a}\end{equation}`);
    const prose = textNode("普通说明 $x$ 不转换");
    const group = Object.assign(Object.create(Section.prototype), { children: [formula, prose] });
    const edge = Object.assign(Object.create(Association.prototype), { associationList: [prose, formula] });
    const project = { stage: [group, formula, prose, edge] } as Project;
    expect(convertLatexNodes(project)).toBe(1);
    const converted = project.stage[1] as LatexNode;
    expect(converted).toBeInstanceOf(LatexNode);
    expect(converted.uuid).toBe(formula.uuid);
    expect(converted.details).toBe(formula.details);
    expect(converted.fontScaleLevel).toBe(2);
    expect(converted.isSelected).toBe(false);
    expect(converted.collisionBox.getRectangle()).toEqual(formula.collisionBox.getRectangle());
    expect(group.children).toEqual([converted, prose]);
    expect(edge.associationList).toEqual([prose, converted]);
    expect(convertLatexNodes(project, [formula, prose])).toBe(0);
  });

  it("keeps invalid source intact and reports the parse error", () => {
    const node = textNode(String.raw`$\frac{$`);
    const project = { stage: [node] } as unknown as Project;
    expect(convertLatexNodes(project, [node])).toBe(0);
    expect(project.stage[0]).toBe(node);
    expect(toast.error).toHaveBeenCalledOnce();
  });
});
