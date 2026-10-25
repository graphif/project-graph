import { Vector } from "@graphif/data-structures";
import { Line } from "./Line";
import { Rectangle } from "./Rectangle";
import { Shape } from "./Shape";

/**
 * 贝塞尔曲线
 */
export class CubicBezierCurve extends Shape {
  constructor(
    public start: Vector,
    public ctrlPt1: Vector,
    public ctrlPt2: Vector,
    public end: Vector,
  ) {
    super();
  }

  toString(): string {
    return `CubicBezierCurve(start:${this.start}, ctrlPt1:${this.ctrlPt1}, ctrlPt2:${this.ctrlPt2}, end:${this.end})`;
  }

  /**
   * 根据参数t（范围[0, 1]）获取贝塞尔曲线上的点
   * @param t
   * @returns
   */
  getPointByT(t: number): Vector {
    return this.start
      .multiply(Math.pow(1 - t, 3))
      .add(this.ctrlPt1.multiply(3 * t * Math.pow(1 - t, 2)))
      .add(this.ctrlPt2.multiply(3 * Math.pow(t, 2) * (1 - t)).add(this.end.multiply(Math.pow(t, 3))));
  }

  // /**
  //  * 根据参数t（范围[0, 1]）获取贝塞尔曲线上的导数
  //  * @param t
  //  * @returns
  //  */
  // private derivative(t: number): Vector {
  //   return this.start.multiply(-3 * Math.pow(1 - t, 2)).add(
  //     this.ctrlPt1.multiply(3 * (3 * Math.pow(t, 2) - 4 * t + 1)).add(
  //       this.ctrlPt2.multiply(3 * (2 * t - 3 * Math.pow(t, 2))).add(
  //         this.end.multiply(3 * Math.pow(t, 2))
  //       )
  //     )
  //   );
  // }

  // /**
  //  * 根据参数t（范围[0, 1]）获取贝塞尔曲线上的二阶导数
  //  * @param t
  //  * @returns
  //  */
  // private secondDerivative(t: number): Vector {
  //   return this.start.multiply(6 * (1 - t)).add(
  //     this.ctrlPt1.multiply(3 * (6 * t - 4)).add(
  //       this.ctrlPt2.multiply(3 * (2 - 6 * t)).add(
  //         this.end.multiply(6 * t)
  //       )
  //     )
  //   );
  // }

  // private newtonIteration(last: number) {

  // }

  // private findMaxMinValue() {
  //   const b = this.start.multiply(6).subtract(
  //     this.ctrlPt1.multiply(12)).add(this.ctrlPt2.multiply(6));
  //   const delta = b.componentMultiply(b).subtract(
  //     this.ctrlPt1.multiply(3).subtract(this.start.multiply(3)).multiply(4).componentMultiply(
  //       this.start.multiply(-3).add(this.ctrlPt1.multiply(9)).subtract(
  //         this.ctrlPt2.multiply(9)).add(this.end.multiply(3))
  //     ));
  //   let minX, maxX;
  //   if (delta.x < 0) {
  //     minX = Math.min(this.start.x, this.end.x);
  //     maxX = Math.max(this.start.x, this.end.x);
  //   } else {

  //   }
  // }

  // computeAabb(start: number, end: number): Rectangle {

  // }

  private static segment = 40;

  isPointIn(point: Vector): boolean {
    // 曲线及采样折线都在控制点凸包内；保留线段的命中容差再做粗筛。
    const tolerance = Line.pointHitTolerance;
    if (
      point.x < Math.min(this.start.x, this.ctrlPt1.x, this.ctrlPt2.x, this.end.x) - tolerance ||
      point.x > Math.max(this.start.x, this.ctrlPt1.x, this.ctrlPt2.x, this.end.x) + tolerance ||
      point.y < Math.min(this.start.y, this.ctrlPt1.y, this.ctrlPt2.y, this.end.y) - tolerance ||
      point.y > Math.max(this.start.y, this.ctrlPt1.y, this.ctrlPt2.y, this.end.y) + tolerance
    ) {
      return false;
    }
    let lastPoint = this.start;
    for (let i = 1; i <= CubicBezierCurve.segment; i++) {
      const line = new Line(lastPoint, this.getPointByT(i / CubicBezierCurve.segment));
      if (line.isPointIn(point)) {
        return true;
      }
      lastPoint = line.end;
    }
    return false;
  }
  isCollideWithRectangle(rectangle: Rectangle): boolean {
    let lastPoint = this.start;
    for (let i = 1; i <= CubicBezierCurve.segment; i++) {
      const line = new Line(lastPoint, this.getPointByT(i / CubicBezierCurve.segment));
      if (line.isCollideWithRectangle(rectangle)) {
        return true;
      }
      lastPoint = line.end;
    }
    return false;
  }
  isCollideWithLine(l: Line): boolean {
    let lastPoint = this.start;
    for (let i = 1; i <= CubicBezierCurve.segment; i++) {
      const line = new Line(lastPoint, this.getPointByT(i / CubicBezierCurve.segment));
      if (line.isCollideWithLine(l)) {
        return true;
      }
      lastPoint = line.end;
    }
    return false;
  }
  getRectangle(): Rectangle {
    const minX = Math.min(this.start.x, this.ctrlPt1.x, this.ctrlPt2.x, this.end.x);
    const maxX = Math.max(this.start.x, this.ctrlPt1.x, this.ctrlPt2.x, this.end.x);
    const minY = Math.min(this.start.y, this.ctrlPt1.y, this.ctrlPt2.y, this.end.y);
    const maxY = Math.max(this.start.y, this.ctrlPt1.y, this.ctrlPt2.y, this.end.y);
    const leftTop = new Vector(minX, minY);
    const size = new Vector(maxX - minX, maxY - minY);
    return new Rectangle(leftTop, size);
  }
}

/**
 * 对称曲线
 */
export class SymmetryCurve extends Shape {
  constructor(
    public start: Vector,
    public startDirection: Vector,
    public end: Vector,
    public endDirection: Vector,
    public bending = SymmetryCurve.defaultBending(start, startDirection, end, endDirection),
  ) {
    super();
  }

  private static defaultBending(start: Vector, startDirection: Vector, end: Vector, endDirection: Vector): number {
    const delta = end.subtract(start);
    let bending = delta.magnitude() / 2;
    // 面向彼此的控制点不能越过间距中点，否则短连线会被挤出急弯。
    for (const direction of [startDirection.normalize(), endDirection.normalize().multiply(-1)]) {
      const forwardGap = delta.x * direction.x + delta.y * direction.y;
      if (forwardGap > 0) bending = Math.min(bending, forwardGap / 2);
    }
    return bending;
  }

  get bezier(): CubicBezierCurve {
    return new CubicBezierCurve(
      this.start,
      this.startDirection.normalize().multiply(this.bending).add(this.start),
      this.endDirection.normalize().multiply(this.bending).add(this.end),
      this.end,
    );
  }

  isPointIn(point: Vector): boolean {
    return this.bezier.isPointIn(point);
  }
  isCollideWithRectangle(rectangle: Rectangle): boolean {
    return this.bezier.isCollideWithRectangle(rectangle);
  }
  isCollideWithLine(line: Line): boolean {
    return this.bezier.isCollideWithLine(line);
  }

  toString(): string {
    return `SymmetryCurve(start:${this.start}, startDirection:${this.startDirection}, end:${this.end}, endDirection:${this.endDirection}, bending:${this.bending})`;
  }
  getRectangle(): Rectangle {
    const minX = Math.min(this.start.x, this.end.x);
    const maxX = Math.max(this.start.x, this.end.x);
    const minY = Math.min(this.start.y, this.end.y);
    const maxY = Math.max(this.start.y, this.end.y);
    const leftTop = new Vector(minX, minY);
    const size = new Vector(maxX - minX, maxY - minY);
    return new Rectangle(leftTop, size);
  }
}
