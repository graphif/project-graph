import { describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Project } from "@/core/Project";
import type { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/render/canvas2d/renderer", () => ({ Renderer: {} }));
vi.mock("@/core/stage/stageObject/association/MutiTargetUndirectedEdge", () => ({
  MultiTargetUndirectedEdge: class {},
}));
import { MultiTargetUndirectedEdgeRenderer } from "./MultiTargetUndirectedEdgeRenderer";

describe("zoomed-out enclosure strokes", () => {
  it.each([0.03, 0.064, 0.065, 0.066, 1])("scales all circle and hull line styles at %s", (scale) => {
    const circle = vi.fn();
    const line = vi.fn();
    const double = vi.fn();
    const renderer = new MultiTargetUndirectedEdgeRenderer({
      camera: { currentScale: scale },
      canvas: { ctx: { setLineDash: vi.fn() } },
      renderer: { transformWorld2View: (point: Vector) => point.multiply(scale) },
      shapeRenderer: { renderCircle: circle },
      curveRenderer: { renderSolidLineMultiple: line, renderDoubleLine: double },
    } as unknown as Project);
    for (const renderType of ["circle", "convex"]) {
      for (const lineType of ["solid", "dashed", "double"]) {
        circle.mockClear();
        line.mockClear();
        double.mockClear();
        renderer.render({
          renderType,
          lineType,
          text: "",
          padding: 10,
          color: Color.White,
          associationList: [0, 100].map((x) => ({
            collisionBox: { getRectangle: () => new Rectangle(new Vector(x, 0), new Vector(40, 30)) },
          })),
        } as unknown as MultiTargetUndirectedEdge);
        const calls =
          renderType === "circle" ? circle.mock.calls : lineType === "double" ? double.mock.calls : line.mock.calls;
        const widthIndex = renderType === "circle" ? 4 : lineType === "double" ? 3 : 2;
        expect(calls.length).toBeGreaterThan(0);
        for (const call of calls) expect(call[widthIndex]).toBeCloseTo((lineType === "double" ? 2 : 8) * scale);
      }
    }
  });
});
