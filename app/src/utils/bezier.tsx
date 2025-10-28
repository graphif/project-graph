import { PointData } from "pixi.js";

export namespace BezierUtils {
  /**
   * 计算贝塞尔曲线上参数为 t (0-1) 的点
   */
  function getBezierPoint(from: PointData, cp1: PointData, cp2: PointData, to: PointData, t: number): PointData {
    const mt = 1 - t;
    // 三次贝塞尔曲线公式: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
    const x = mt * mt * mt * from.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * to.x;
    const y = mt * mt * mt * from.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * to.y;
    return { x, y };
  }

  /**
   * 使用牛顿法找到曲线上离给定点最近的参数 t
   */
  function findClosestT(
    from: PointData,
    cp1: PointData,
    cp2: PointData,
    to: PointData,
    point: PointData,
    initialT: number = 0.5,
    iterations: number = 10,
  ): number {
    let t = initialT;

    for (let i = 0; i < iterations; i++) {
      const mt = 1 - t;

      // 计算曲线上的点
      const bezierPoint = {
        x: mt * mt * mt * from.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * to.x,
        y: mt * mt * mt * from.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * to.y,
      };

      // 计算一阶导数（切线方向）
      const dx = 3 * mt * mt * (cp1.x - from.x) + 6 * mt * t * (cp2.x - cp1.x) + 3 * t * t * (to.x - cp2.x);

      const dy = 3 * mt * mt * (cp1.y - from.y) + 6 * mt * t * (cp2.y - cp1.y) + 3 * t * t * (to.y - cp2.y);

      // 计算二阶导数
      const d2x = 6 * mt * (cp2.x - 2 * cp1.x + from.x) + 6 * t * (to.x - 2 * cp2.x + cp1.x);

      const d2y = 6 * mt * (cp2.y - 2 * cp1.y + from.y) + 6 * t * (to.y - 2 * cp2.y + cp1.y);

      // 向量 (point - bezierPoint)
      const px = point.x - bezierPoint.x;
      const py = point.y - bezierPoint.y;

      // 牛顿法: f'(t) = (point - B(t)) · B'(t) = 0
      const f = px * dx + py * dy;
      const df = dx * dx + dy * dy + px * d2x + py * d2y;

      if (Math.abs(f) < 1e-6) break;
      if (Math.abs(df) < 1e-10) break;

      t = t - f / df;
      t = Math.max(0, Math.min(1, t)); // 约束 t 在 [0, 1]
    }

    return t;
  }

  /**
   * 使用采样方法找到最近的 t 作为初始值
   */
  function findInitialT(
    from: PointData,
    cp1: PointData,
    cp2: PointData,
    to: PointData,
    point: PointData,
    samples: number = 50,
  ): number {
    let minDist = Infinity;
    let bestT = 0;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = getBezierPoint(from, cp1, cp2, to, t);
      // 计算距离
      const dx = p.x - point.x;
      const dy = p.y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        bestT = t;
      }
    }

    return bestT;
  }

  /**
   * 判断点是否在二次贝塞尔曲线内（考虑宽度）
   * @param curve 贝塞尔曲线定义
   * @param point 要检测的点
   * @param width 曲线的宽度
   * @returns 是否在曲线内
   */
  export function isPointInBezierCurve(
    from: PointData,
    cp1: PointData,
    cp2: PointData,
    to: PointData,
    point: PointData,
    width: number,
  ): boolean {
    const radius = width / 2;

    // 1. 先用采样找到粗略的最近 t
    const initialT = findInitialT(from, cp1, cp2, to, point, 50);

    // 2. 用牛顿法精细化
    const t = findClosestT(from, cp1, cp2, to, point, initialT, 20);

    // 3. 计算曲线上最近点到给定点的距离
    const closestPoint = getBezierPoint(from, cp1, cp2, to, t);
    const dx = closestPoint.x - point.x;
    const dy = closestPoint.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 4. 判断是否在范围内
    return dist <= radius;
  }

  /**
   * 获取曲线上参数为 t 的点（公开 API）
   */
  export function getPointAt(from: PointData, cp1: PointData, cp2: PointData, to: PointData, t: number): PointData {
    return getBezierPoint(from, cp1, cp2, to, t);
  }
}
