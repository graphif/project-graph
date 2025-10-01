import { serializable } from "@graphif/serializer";
import { Point } from "pixi.js";

export class Vector {
  @serializable
  x: number;
  @serializable
  y: number;

  constructor(x: number, y: number);
  constructor(pixiPoint: Point);
  constructor(arg1: number | Point, arg2?: number) {
    if (typeof arg1 === "number" && typeof arg2 === "number") {
      this.x = arg1;
      this.y = arg2;
    } else if (arg1 instanceof Point) {
      this.x = arg1.x;
      this.y = arg1.y;
    } else {
      throw new Error("Invalid arguments");
    }
  }

  static getZero(): Vector {
    return new Vector(0, 0);
  }

  isZero(): boolean {
    return this.x === 0 && this.y === 0;
  }

  add(vector: Vector): Vector {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  subtract(vector: Vector): Vector {
    return new Vector(this.x - vector.x, this.y - vector.y);
  }

  multiply(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector {
    if (scalar === 0) {
      return Vector.getZero();
    }
    return new Vector(this.x / scalar, this.y / scalar);
  }

  /**
   * 获得向量的模长
   * @returns
   */
  magnitude(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  /**
   * 获得向量的单位向量
   * 如果向量的模长为0，则返回(0,0)
   * @returns
   */
  normalize(): Vector {
    const mag = this.magnitude();
    const x = this.x / mag;
    const y = this.y / mag;

    if (Number.isNaN(x) || Number.isNaN(y)) {
      return Vector.getZero();
    }

    return new Vector(x, y);
  }

  dot(vector: Vector): number {
    return this.x * vector.x + this.y * vector.y;
  }

  /**
   * 获得一个与该向量垂直的单位向量
   */
  getPerpendicular(): Vector {
    return new Vector(-this.y, this.x).normalize();
  }

  /**
   * 将自身向量按顺时针旋转一定角度，获得一个新的向量
   * @param angle 单位：弧度
   */
  rotate(angle: number): Vector {
    const x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
    const y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
    return new Vector(x, y);
  }
  /**
   * 将自身向量按逆时针旋转一定角度，获得一个新的向量
   * @param degrees 单位：度
   */
  rotateDegrees(degrees: number): Vector {
    return this.rotate(degrees * (Math.PI / 180));
  }

  /**
   * 计算自己向量与另一个向量之间的角度
   * @param vector
   * @returns 单位：弧度
   */
  angle(vector: Vector): number {
    const dot = this.dot(vector);
    const mag1 = this.magnitude();
    const mag2 = vector.magnitude();

    return Math.acos(dot / (mag1 * mag2));
  }
  /**
   * 计算自己向量与另一个向量之间的夹角
   * @param vector
   * @returns 单位：度
   */
  angleTo(vector: Vector): number {
    return (this.angle(vector) * 180) / Math.PI;
  }
  /**
   * 计算自己向量与另一个向量之间的夹角，但带正负号
   * 如果另一个向量相对自己是顺时针，则返回正值，否则返回负值
   * @param vector
   * @returns 单位：度
   */
  angleToSigned(vector: Vector): number {
    const angle = this.angleTo(vector);
    const cross = this.cross(vector);
    if (cross > 0) {
      return angle;
    } else {
      return -angle;
    }
  }

  /**
   * 从自己这个向量所指向的点到另一个向量所指向的点的距离
   * @param vector
   * @returns
   */
  distance(vector: Vector): number {
    if (vector === null || vector === undefined) {
      throw new Error("vector is null or undefined");
    }
    const dx = this.x - vector.x;
    const dy = this.y - vector.y;
    return Math.sqrt(dx ** 2 + dy ** 2);
  }

  // 计算两个向量的叉积
  cross(other: Vector): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * 向量之间的分量分别相乘
   * @param other
   */
  componentMultiply(other: Vector): Vector {
    return new Vector(this.x * other.x, this.y * other.y);
  }

  /**
   * 根据角度构造一个单位向量
   * @param angle 单位：弧度
   */
  static fromAngle(angle: number): Vector {
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    return new Vector(x, y);
  }

  /**
   * 根据角度构造一个单位向量
   * @param degrees 单位：度
   */
  static fromDegrees(degrees: number): Vector {
    return Vector.fromAngle(degrees * (Math.PI / 180));
  }

  /**
   * 计算两个点之间的向量，让两个点构成一个向量
   * @param p1 起始点
   * @param p2 终止点
   */
  static fromTwoPoints(p1: Vector, p2: Vector): Vector {
    const x = p2.x - p1.x;
    const y = p2.y - p1.y;
    return new Vector(x, y);
  }

  /**
   * 将自己方向的单位向量分解成一堆向量，就像散弹分裂子弹一样
   * 返回的都是单位向量
   *
   * 根据散弹数量和间隔角度，计算出每个散弹的方向单位向量
   * 做法是先依次生成 bulletCount 个向量，每个间隔角度为 bulletIntervalDegrees，顺时针旋转
   * 第一个生成的向量恰好就是攻击方向。
   * 最后再整体 逆时针旋转总角度的一半，得到每个向量最终的方向向量
   */
  splitVector(splitCount: number, splitDegrees: number): Vector[] {
    let vectors: Vector[] = [];
    const selfNormalized = this.normalize();
    for (let i = 0; i < splitCount; i++) {
      vectors.push(selfNormalized.rotateDegrees(i * splitDegrees));
    }
    // 计算最终需要的总偏移角度
    const totalOffsetDegrees = ((splitCount - 1) * splitDegrees) / 2;
    vectors = vectors.map((d) => d.rotateDegrees(-totalOffsetDegrees));
    return vectors;
  }

  /**
   * 计算两个点的中心点
   * @param p1
   * @param p2
   * @returns
   */
  static fromTwoPointsCenter(p1: Vector, p2: Vector): Vector {
    const x = (p2.x + p1.x) / 2;
    const y = (p2.y + p1.y) / 2;
    return new Vector(x, y);
  }

  /**
   * 获得两个点的中间连线一点，当rate为0时，返回p1，当rate为1时，返回p2
   * @param p1
   * @param p2
   * @param rate
   */
  static fromTwoPointsRate(p1: Vector, p2: Vector, rate: number): Vector {
    const x = p1.x + (p2.x - p1.x) * rate;
    const y = p1.y + (p2.y - p1.y) * rate;
    return new Vector(x, y);
  }
  /**
   * 计算两个向量所代表位置的中点
   * @param p1
   * @param p2
   */
  static average(p1: Vector, p2: Vector): Vector {
    return new Vector((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  }

  /**
   * 计算多个向量所代表位置的平均点
   * @param vectors 向量数组
   * @returns 平均位置向量
   */
  static averageMultiple(vectors: Vector[]): Vector {
    if (vectors.length === 0) {
      return Vector.getZero();
    }

    const sumX = vectors.reduce((sum, vec) => sum + vec.x, 0);
    const sumY = vectors.reduce((sum, vec) => sum + vec.y, 0);

    return new Vector(sumX / vectors.length, sumY / vectors.length);
  }
  /**
   * 将自己这个向量转换成角度数字
   * 例如当自己 x=1 y=1 时，返回 45
   */
  toDegrees(): number {
    let result = (Math.atan2(this.y, this.x) * 180) / Math.PI;
    if (result < 0) {
      result += 360;
    }
    if (result >= 360) {
      result -= 360;
    }
    return result;
  }
  clone(): Vector {
    return new Vector(this.x, this.y);
  }
  equals(vector: Vector): boolean {
    return this.x === vector.x && this.y === vector.y;
  }
  nearlyEqual(vector: Vector, radius: number): boolean {
    return Math.abs(this.x - vector.x) <= radius && Math.abs(this.y - vector.y) <= radius;
  }

  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  // /**
  //  * 获取一个随机方向上的单位向量
  //  */
  // static randomUnit(): Vector {
  //   const angle = uniform(0, 2 * Math.PI);
  //   return Vector.fromAngle(angle);
  // }

  limitX(min: number, max: number): Vector {
    return new Vector(Math.min(Math.max(this.x, min), max), this.y);
  }

  limitY(min: number, max: number): Vector {
    return new Vector(this.x, Math.min(Math.max(this.y, min), max));
  }

  /**
   * 创建x和y相同的向量 (其实就是正方形，从左上到右下)
   */
  static same(value: number): Vector {
    return new Vector(value, value);
  }
  static fromTouch(touch: Touch): Vector {
    return new Vector(touch.clientX, touch.clientY);
  }

  toInteger(): Vector {
    return new Vector(Math.round(this.x), Math.round(this.y));
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  __add__(other: Vector): Vector {
    return this.add(other);
  }
}
