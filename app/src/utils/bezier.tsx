import { PointData } from "pixi.js";

export namespace BezierUtils {
  /**
   * 判断点是否在三阶贝塞尔曲线内（考虑宽度）
   */
  export function isPointInBezierCurve(
    from: PointData,
    cp1: PointData,
    cp2: PointData,
    to: PointData,
    point: PointData,
    width: number,
  ): boolean {
    const halfWidth = width / 2;
    const segments = 50;

    // 采样贝塞尔曲线，分解成多个线段进行碰撞检测
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;

      const p1 = getBezierPoint(from, cp1, cp2, to, t1);
      const p2 = getBezierPoint(from, cp1, cp2, to, t2);

      if (distanceFromPointToLineSegment(p1, p2, point) <= halfWidth) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取三阶贝塞尔曲线上参数 t 对应的点
   * 公式: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
   */
  function getBezierPoint(p0: PointData, p1: PointData, p2: PointData, p3: PointData, t: number): PointData {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;

    return { x, y };
  }

  /**
   * 计算点到线段的最短距离
   */
  function distanceFromPointToLineSegment(p1: PointData, p2: PointData, point: PointData): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // 线段退化为点
      return Math.hypot(point.x - p1.x, point.y - p1.y);
    }

    // 计算点在线段上的投影参数 t
    // t = 0 对应线段起点，t = 1 对应线段终点
    let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    // 计算投影点坐标
    const projectionX = p1.x + t * dx;
    const projectionY = p1.y + t * dy;

    // 返回点到投影点的距离
    return Math.hypot(point.x - projectionX, point.y - projectionY);
  }
}
