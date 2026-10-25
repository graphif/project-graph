import { describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { SymmetryCurve } from "@graphif/shapes";
import type { Project } from "@/core/Project";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
import { WorldRenderUtils } from "./WorldRenderUtils";

describe("edge stroke scaling", () => {
  it.each([0.001, 0.1, 1, 10])("keeps subpixel widths at scale %s", (scale) => {
    const solid = vi.fn(),
      dashed = vi.fn(),
      double = vi.fn();
    const project = {
      camera: { currentScale: scale },
      renderer: { transformWorld2View: (point: Vector) => point.multiply(scale) },
      curveRenderer: {
        renderBezierCurve: solid,
        renderDashedBezierCurve: dashed,
        renderDoubleBezierCurve: double,
      },
    } as unknown as Project;
    const renderer = new WorldRenderUtils(project);
    const curve = new SymmetryCurve(new Vector(0, 0), new Vector(1, 0), new Vector(100, 30), new Vector(-1, 0));
    renderer.renderSymmetryCurve(curve, Color.White, 2 * scale);
    renderer.renderDashedSymmetryCurve(curve, Color.White, 2, 10 * scale);
    renderer.renderDoubleSymmetryCurve(curve, Color.White, 2, 4 * scale);
    for (const draw of [solid, dashed, double]) {
      expect(draw.mock.calls[0][2]).toBe(2 * scale);
    }
  });
});
