import { Vector } from "@graphif/data-structures";

export namespace Random {
  export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
  export function randomBoolean(): boolean {
    return Math.random() < 0.5;
  }
  export function randomItem<T>(items: T[]): T {
    return items[randomInt(0, items.length - 1)];
  }
  export function randomItems<T>(items: T[], count: number): T[] {
    return items.slice(0, count).sort(() => Math.random() - 0.5);
  }

  /**
   * 返回x坐标均匀分布在[min.x, max.x], y坐标均匀分布在[min.y, max.y]的随机向量
   */
  export function randomVector(min: Vector, max: Vector): Vector {
    return new Vector(randomFloat(min.x, max.x), randomFloat(min.y, max.y));
  }

  /**
   * 返回在单位圆上的随机点（落在圆周上）
   */
  export function randomVectorOnNormalCircle(): Vector {
    const randomDegrees = randomFloat(0, 360);
    return new Vector(1, 0).rotateDegrees(randomDegrees);
  }

  /**
   * 泊松分布随机数
   * @param lambda 泊松分布参数
   */
  export function poissonRandom(lambda: number): number {
    const L = Math.exp(-lambda);
    let p = 1.0;
    let k = 0;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }
}
