import { describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/stage/stageObject/association/MutiTargetUndirectedEdge", () => ({
  MultiTargetUndirectedEdge: class {},
}));
import { MouseInteraction } from "./stageMouseInteractionCore";

describe("hover coalescing", () => {
  it("tests only the latest location and shares results across renderers and edit actions", () => {
    const contains = vi.fn((location: Vector) => location.x === 99);
    const edge = { collisionBox: { isContainsPoint: contains } };
    const project = {
      stageManager: {
        getEdges: () => [edge],
        getAssociations: () => [],
        getSections: () => [],
        getConnectPoints: () => [],
      },
      sectionMethods: { isAssociationCoveredByBigTitleSection: () => false },
    };
    const interaction = new MouseInteraction(project as never);
    for (let i = 0; i < 100; i++) interaction.updateByMouseMove(new Vector(i, 0));
    expect(contains).not.toHaveBeenCalled();
    expect(interaction.firstHoverEdge).toBe(edge);
    expect(interaction.hoverEdges).toEqual([edge]);
    expect(interaction.hoverSections).toEqual([]);
    expect(contains).toHaveBeenCalledTimes(1);
    interaction.updateByMouseMove(new Vector(0, 0));
    expect(interaction.firstHoverEdge).toBeUndefined();
    expect(contains).toHaveBeenCalledTimes(2);
  });
});
