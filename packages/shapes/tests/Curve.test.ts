import { describe, it, expect, vi } from "vitest";
import { CubicBezierCurve, SymmetryCurve } from "../src/Curve";
import { Line } from "../src/Line";
import { Vector } from "@graphif/data-structures";

describe("CubicBezierCurve 贝塞尔曲线", () => {
  it("创建贝塞尔曲线", () => {
    const curve = new CubicBezierCurve(new Vector(0, 0), new Vector(10, 20), new Vector(30, 40), new Vector(50, 60));
    expect(curve.start.x).toBe(0);
    expect(curve.ctrlPt1.y).toBe(20);
    expect(curve.ctrlPt2.x).toBe(30);
    expect(curve.end.y).toBe(60);
  });

  it("根据参数t获取曲线上的点", () => {
    const curve = new CubicBezierCurve(new Vector(0, 0), new Vector(0, 100), new Vector(100, 100), new Vector(100, 0));
    const point = curve.getPointByT(0.5);
    expect(point.x).toBe(50);
    expect(point.y).toBe(75);
  });

  it("skips sampling distant curves", () => {
    const curve = new CubicBezierCurve(new Vector(0, 0), new Vector(0, 100), new Vector(100, 100), new Vector(100, 0));
    const sample = vi.spyOn(curve, "getPointByT");
    expect(curve.isPointIn(new Vector(1000, 1000))).toBe(false);
    expect(sample).not.toHaveBeenCalled();
  });

  it("preserves the inclusive line hit tolerance", () => {
    const curve = new CubicBezierCurve(new Vector(0, 0), new Vector(25, 0), new Vector(75, 0), new Vector(100, 0));
    expect(curve.isPointIn(new Vector(50, 12))).toBe(true);
    expect(curve.isPointIn(new Vector(-12, 0))).toBe(true);
    expect(curve.isPointIn(new Vector(50, 12.01))).toBe(false);
  });

  it("matches sampled collision checks for loops, bulges, degenerate and edited curves", () => {
    const curves = [
      new CubicBezierCurve(new Vector(0, 0), new Vector(-100, 150), new Vector(200, -150), new Vector(100, 0)),
      new CubicBezierCurve(new Vector(0, 0), new Vector(100, 100), new Vector(-100, 100), new Vector(0, 0)),
      new CubicBezierCurve(Vector.getZero(), Vector.getZero(), Vector.getZero(), Vector.getZero()),
    ];
    for (const curve of curves) {
      for (const offset of [0, 300]) {
        curve.ctrlPt1.x += offset;
        for (let x = -140; x <= 440; x += 17) {
          for (let y = -180; y <= 180; y += 19) {
            const point = new Vector(x, y);
            let expected = false;
            let previous = curve.start;
            for (let i = 1; i <= 40; i++) {
              const next = curve.getPointByT(i / 40);
              if (new Line(previous, next).isPointIn(point)) {
                expected = true;
                break;
              }
              previous = next;
            }
            expect(curve.isPointIn(point)).toBe(expected);
          }
        }
      }
    }
  });
});

describe("SymmetryCurve 对称曲线", () => {
  it.each([
    [new Vector(48, -10), new Vector(1, 0), new Vector(-1, 0), "x" as const, 1],
    [new Vector(24, -52), new Vector(0, -1), new Vector(0, 1), "y" as const, -1],
    [new Vector(8, 200), new Vector(1, 0), new Vector(-1, 0), "x" as const, 1],
  ])("keeps nearby facing ports monotonic without pinched control points", (end, from, to, axis, sign) => {
    const curve = new SymmetryCurve(Vector.getZero(), from, end, to);
    const bezier = curve.bezier;
    expect(sign * bezier.ctrlPt1[axis]).toBeLessThanOrEqual(sign * bezier.ctrlPt2[axis]);
    let previous = 0;
    for (let i = 1; i <= 100; i++) {
      const position = sign * bezier.getPointByT(i / 100)[axis];
      expect(position).toBeGreaterThanOrEqual(previous);
      previous = position;
    }
    const scaled = new SymmetryCurve(Vector.getZero(), from, end.multiply(10), to);
    expect(scaled.bending).toBeCloseTo(curve.bending * 10);
  });

  it("keeps coincident endpoints finite", () => {
    const curve = new SymmetryCurve(Vector.getZero(), new Vector(1, 0), Vector.getZero(), new Vector(-1, 0));
    expect(curve.bending).toBe(0);
    expect(curve.bezier.getPointByT(0.5)).toEqual(Vector.getZero());
  });

  it("创建对称曲线", () => {
    const curve = new SymmetryCurve(new Vector(0, 0), new Vector(1, 0), new Vector(100, 0), new Vector(-1, 0), 50);
    expect(curve.start.x).toBe(0);
    expect(curve.end.x).toBe(100);
    expect(curve.bending).toBe(50);
  });

  it("获取其对应的贝塞尔曲线", () => {
    const curve = new SymmetryCurve(new Vector(0, 0), new Vector(1, 0), new Vector(100, 0), new Vector(-1, 0), 50);
    const bezier = curve.bezier;
    expect(bezier.start.x).toBe(0);
    expect(bezier.ctrlPt1.x).toBe(50);
    expect(bezier.ctrlPt2.x).toBe(50);
    expect(bezier.end.x).toBe(100);
  });
});
