import { Vector } from "@graphif/data-structures";

/**
 * 凸包算法合集
 */
export namespace ConvexHull {
  /**
   * 计算给定二维点的凸包（Andrew's Monotone Chain 算法）
   * 时间复杂度 O(n log n)，空间复杂度 O(n)
   * @param points 二维点数组
   * @returns 按逆时针顺序排列的凸包顶点数组（自动去除共线点）
   */
  export function computeConvexHull(points: Vector[]): Vector[] {
    if (points.length <= 1) return [...points];

    // 排序点集：先按 x 坐标，再按 y 坐标
    const sorted = [...points].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));

    // 检查所有点是否共线
    if (isCollinear(sorted)) {
      return [sorted[0], sorted[sorted.length - 1]];
    }

    // 构建下凸包和上凸包
    const lower: Vector[] = [];
    const upper: Vector[] = [];

    for (const point of sorted) {
      buildHull(lower, point, (a, b, c) => cross(a, b, c) <= 0);
    }

    for (const point of sorted.reverse()) {
      buildHull(upper, point, (a, b, c) => cross(a, b, c) <= 0);
    }

    // 合并结果并去除重复点
    const hull = [...lower, ...upper];
    return Array.from(new Set(hull.slice(0, -1))); // 使用 Set 去重
  }

  /** 辅助函数：三点叉积计算 */
  function cross(a: Vector, b: Vector, c: Vector): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  /** 辅助函数：构建单边凸包 */
  function buildHull(hull: Vector[], point: Vector, shouldRemove: (a: Vector, b: Vector, c: Vector) => boolean) {
    while (hull.length >= 2) {
      const [b, a] = [hull[hull.length - 1], hull[hull.length - 2]];
      if (shouldRemove(a, b, point)) {
        hull.pop();
      } else {
        break;
      }
    }
    hull.push(point);
  }

  /** 判断所有点是否共线 */
  function isCollinear(points: Vector[]): boolean {
    if (points.length < 3) return true;

    const [a, b] = [points[0], points[1]];
    return points.every((c) => cross(a, b, c) === 0);
  }
}
