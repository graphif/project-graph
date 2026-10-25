import { describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import type { Project } from "@/core/Project";
import { ConnectionPulseEffect } from "./ConnectionPulseEffect";

describe("connection pulse", () => {
  it.each([0.1, 1, 8])("keeps its screen width and short trail at zoom %s", (zoom) => {
    const gradient = vi.fn();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      lineCap: "butt",
      fillStyle: "",
    };
    const project = {
      canvas: { ctx },
      renderer: { transformWorld2View: (p: Vector) => p.multiply(zoom) },
      stageStyleManager: { currentStyle: { CollideBoxSelected: Color.White } },
      curveRenderer: { renderGradientLine: gradient },
    } as unknown as Project;
    const effect = new ConnectionPulseEffect(Vector.getZero(), new Vector(1000, 0));
    effect.timeProgress.add(12);
    effect.render(project);
    const [tail, head, , , width] = gradient.mock.calls[0];
    expect(head.x).toBe(500 * zoom);
    expect(head.distance(tail)).toBeLessThanOrEqual(32.001);
    expect(width).toBe(2);
    expect(ctx.arc.mock.calls[0][2]).toBe(2.5);
    expect(ctx.restore).toHaveBeenCalledOnce();
    effect.timeProgress.add(12);
    effect.render(project);
    expect(gradient).toHaveBeenCalledOnce();
  });
});
