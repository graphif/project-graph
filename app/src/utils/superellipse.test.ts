import { describe, expect, it, vi } from "vitest";
import { superellipseRect, superellipseSvgPath } from "./superellipse";

describe("n=4 corners", () => {
  it("samples the quartic superellipse and stays inside its rectangle", () => {
    const ctx = { moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), rect: vi.fn() };
    superellipseRect(ctx, 10, 20, 100, 60, 12);
    for (const [x, y] of ctx.lineTo.mock.calls) {
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThanOrEqual(110);
      expect(y).toBeGreaterThanOrEqual(20);
      expect(y).toBeLessThanOrEqual(80);
    }
    for (const [x, y] of ctx.lineTo.mock.calls.slice(0, 33)) {
      expect(Math.abs((x - 98) / 12) ** 4 + Math.abs((y - 68) / 12) ** 4).toBeCloseTo(1, 10);
    }
    expect(ctx.closePath).toHaveBeenCalledOnce();
  });
  it("clamps oversized corners, handles negative dimensions and preserves square corners", () => {
    expect(superellipseSvgPath(100, 60, -100, -60, 999)).toBe(superellipseSvgPath(0, 0, 100, 60, 30));
    expect(superellipseSvgPath(0, 0, 100, 60, 0)).toBe("M0 0h100v60h-100Z");
  });
});
