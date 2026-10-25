import { describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Project } from "@/core/Project";
vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
import { ShapeRenderer } from "./shapeRenderer";

describe("polygon outlines", () => {
  it("skips invisible rectangle passes without inheriting a previous stroke", () => {
    const ctx = { beginPath: vi.fn(), rect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), lineWidth: 10 };
    const renderer = new ShapeRenderer({ canvas: { ctx } } as unknown as Project);
    const rect = new Rectangle(Vector.getZero(), new Vector(100, 50));
    renderer.renderRect(rect, Color.Transparent, Color.Transparent, 0);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    renderer.renderRect(rect, Color.Transparent, Color.White, 2);
    expect(ctx.fill).not.toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.lineWidth).toBe(2);
    renderer.renderRect(rect, Color.White, Color.White, 0);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });
  it("does not inherit the previous thick stroke for a fill-only arrow", () => {
    const ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      lineWidth: 10,
    };
    const renderer = new ShapeRenderer({ canvas: { ctx } } as unknown as Project);
    const points = [new Vector(0, 0), new Vector(20, 5), new Vector(0, 10)];
    renderer.renderPolygonAndFill(points, Color.White, Color.White, 0);
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.stroke).not.toHaveBeenCalled();
    renderer.renderPolygonAndFill(points, Color.White, Color.White, 2);
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.lineWidth).toBe(2);
  });
});
