import { describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { Line } from "@graphif/shapes";
import type { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/render/canvas2d/renderer", () => ({ Renderer: { NODE_ROUNDED_RADIUS: 8 } }));
vi.mock("@/core/service/Settings", () => ({ Settings: { enableCollisionBoxAutoWidth: true } }));

import { CollisionBoxRenderer } from "./CollisionBoxRenderer";

describe("line collision outlines", () => {
  it("strokes a closed outline once without overlapping segment passes or bridging separate paths", () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      lineWidth: 0,
    };
    const renderer = new CollisionBoxRenderer({
      canvas: { ctx },
      camera: { currentScale: 0.1, isDefaultZoom: () => false },
      renderer: { transformWorld2View: (point: Vector) => point.multiply(0.1) },
    } as unknown as Project);
    const points = [new Vector(0, 0), new Vector(100, 0), new Vector(50, 100), new Vector(0, 0)];
    renderer.render(
      new CollisionBox([
        new Line(points[0], points[1]),
        new Line(points[1], points[2]),
        new Line(points[2], points[3]),
        new Line(new Vector(200, 200), new Vector(300, 300)),
      ]),
      Color.White.toNewAlpha(0.5),
    );
    expect(ctx.beginPath).toHaveBeenCalledOnce();
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.moveTo.mock.calls).toEqual([
      [0, 0],
      [20, 20],
    ]);
    expect(ctx.lineTo.mock.calls).toEqual([
      [10, 0],
      [5, 10],
      [0, 0],
      [30, 30],
    ]);
    expect(ctx.lineWidth).toBe(8);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    expect(ctx.restore).toHaveBeenCalledOnce();
  });
});
