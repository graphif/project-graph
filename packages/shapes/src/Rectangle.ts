import { Vector } from "@graphif/data-structures";
import { serializableType } from "@graphif/serializer";
import { Line } from "./Line";
import { Shape } from "./Shape";

@serializableType("Rectangle", { fields: ["location", "size"] })
export class Rectangle extends Shape {
  location: Vector;
  size: Vector;

  constructor(location: Vector, size: Vector) {
    super();
    this.location = location;
    this.size = size;
  }

  /**
   * 构造一个相对于屏幕来说内容居中的矩形
   * 用于UI初始化窗口
   */
  public static inCenter(size: Vector): Rectangle {
    const screenCenter = new Vector(window.innerWidth, window.innerHeight).divide(2);
    const location = screenCenter.subtract(size.divide(2));
    return new Rectangle(location, size);
  }

  public get left(): number {
    return this.location.x;
  }

  public get right(): number {
    return this.location.x + this.size.x;
  }

  public get top(): number {
    return this.location.y;
  }

  public get bottom(): number {
    return this.location.y + this.size.y;
  }

  public get center(): Vector {
    return this.location.add(this.size.divide(2));
  }

  public getInnerLocationByRateVector(rateVector: Vector) {
    return this.location.add(new Vector(this.size.x * rateVector.x, this.size.y * rateVector.y));
  }

  public get leftCenter(): Vector {
    return new Vector(this.left, this.center.y);
  }

  public get rightCenter(): Vector {
    return new Vector(this.right, this.center.y);
  }

  public get topCenter(): Vector {
    return new Vector(this.center.x, this.top);
  }

  public get bottomCenter(): Vector {
    return new Vector(this.center.x, this.bottom);
  }
  public get leftTop(): Vector {
    return new Vector(this.left, this.top);
  }
  public get rightTop(): Vector {
    return new Vector(this.right, this.top);
  }
  public get leftBottom(): Vector {
    return new Vector(this.left, this.bottom);
  }
  public get rightBottom(): Vector {
    return new Vector(this.right, this.bottom);
  }

  public get width(): number {
    return this.size.x;
  }
  public get height(): number {
    return this.size.y;
  }
  getRectangle(): Rectangle {
    return this.clone();
  }

  /**
   * 以中心点为中心，扩展矩形
   * @param amount
   * @returns
   */
  public expandFromCenter(amount: number): Rectangle {
    // const halfAmount = amount / 2;
    // const newSize = this.size.add(new Vector(amount, amount));
    // const newLocation = this.center
    //   .subtract(newSize.divide(2))
    //   .subtract(new Vector(halfAmount, halfAmount));
    // return new Rectangle(newLocation, newSize);
    return Rectangle.fromEdges(this.left - amount, this.top - amount, this.right + amount, this.bottom + amount);
  }

  public clone(): Rectangle {
    return new Rectangle(this.location.clone(), this.size.clone());
  }

  /**
   * 通过四条边来创建矩形
   * @param left
   * @param top
   * @param right
   * @param bottom
   * @returns
   */
  public static fromEdges(left: number, top: number, right: number, bottom: number): Rectangle {
    const location = new Vector(left, top);
    const size = new Vector(right - left, bottom - top);
    return new Rectangle(location, size);
  }

  /**
   * 通过两个点来创建矩形，可以用于框选生成矩形
   * @param p1
   * @param p2
   * @returns
   */
  public static fromTwoPoints(p1: Vector, p2: Vector): Rectangle {
    const left = Math.min(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const right = Math.max(p1.x, p2.x);
    const bottom = Math.max(p1.y, p2.y);
    return Rectangle.fromEdges(left, top, right, bottom);
  }

  /**
   * 获取多个矩形的最小外接矩形
   * @param rectangles
   * @returns
   */
  public static getBoundingRectangle(rectangles: Rectangle[], padding: number = 0): Rectangle {
    if (rectangles.length === 0) {
      // 抛出异常
      throw new Error("rectangles is empty");
    }

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const rect of rectangles) {
      left = Math.min(left, rect.left - padding);
      top = Math.min(top, rect.top - padding);
      right = Math.max(right, rect.right + padding);
      bottom = Math.max(bottom, rect.bottom + padding);
    }
    return Rectangle.fromEdges(left, top, right, bottom);
  }

  /**
   * 按照 上右下左 的顺序返回四条边
   * @returns
   */
  public getBoundingLines(): Line[] {
    const lines: Line[] = [
      // top line
      new Line(new Vector(this.left, this.top), new Vector(this.right, this.top)),
      // right line
      new Line(new Vector(this.right, this.top), new Vector(this.right, this.bottom)),
      // bottom line
      new Line(new Vector(this.right, this.bottom), new Vector(this.left, this.bottom)),
      // left line
      new Line(new Vector(this.left, this.bottom), new Vector(this.left, this.top)),
    ];

    return lines;
  }

  getFroePoints(): Vector[] {
    const points = [
      new Vector(this.left, this.top),
      new Vector(this.right, this.top),
      new Vector(this.right, this.bottom),
      new Vector(this.left, this.bottom),
    ];
    return points;
  }

  /**
   * 和另一个矩形有部分相交（碰到一点点就算）
   */
  public isCollideWith(other: Rectangle): boolean {
    const collision_x = this.right > other.left && this.left < other.right;
    const collision_y = this.bottom > other.top && this.top < other.bottom;
    return collision_x && collision_y;
  }

  /**
   * 判断一个矩形是否完全在某个矩形内部
   * @param otherBig
   */
  public isAbsoluteIn(otherBig: Rectangle): boolean {
    return (
      this.left >= otherBig.left &&
      this.right <= otherBig.right &&
      this.top >= otherBig.top &&
      this.bottom <= otherBig.bottom
    );
  }
  isCollideWithRectangle(rectangle: Rectangle): boolean {
    return this.isCollideWith(rectangle);
  }

  /**
   * 已知两个矩形必定相交，返回重叠部分的矩形区域
   */
  static getIntersectionRectangle(rect1: Rectangle, rect2: Rectangle) {
    // 计算重叠部分的左上角和右下角坐标
    const left = Math.max(rect1.left, rect2.left);
    const top = Math.max(rect1.top, rect2.top);
    const right = Math.min(rect1.right, rect2.right);
    const bottom = Math.min(rect1.bottom, rect2.bottom);

    // 返回新的矩形对象表示重叠区域
    return Rectangle.fromEdges(left, top, right, bottom);
  }

  /**
   * 自己这个矩形是否和线段有交点
   * 用于节点切割检测
   *
   * @param line
   */
  public isCollideWithLine(line: Line): boolean {
    if (this.isPointIn(line.start) || this.isPointIn(line.end)) {
      // 当用于切割线的时候，两个端点必定都在矩形外
      // 这个实际上是不可能的，但是为了保险起见，还是加上判断
      return true;
    }

    if (line.isIntersectingWithHorizontalLine(this.location.y, this.left, this.right)) {
      return true;
    }

    if (line.isIntersectingWithHorizontalLine(this.location.y + this.size.y, this.left, this.right)) {
      return true;
    }

    if (line.isIntersectingWithVerticalLine(this.location.x, this.bottom, this.top)) {
      return true;
    }

    if (line.isIntersectingWithVerticalLine(this.location.x + this.size.x, this.bottom, this.top)) {
      return true;
    }
    return false;
  }

  /**
   * 获取线段和矩形的交点
   * @param line
   */
  public getCollidePointsWithLine(line: Line): Vector[] {
    const result: Vector[] = [];
    if (this.isPointIn(line.start)) {
      result.push(line.start);
    }
    if (this.isPointIn(line.end)) {
      result.push(line.end);
    }
    const topResult = line.getIntersectingWithHorizontalLine(this.location.y, this.left, this.right);
    if (topResult.intersects) {
      result.push(topResult.point!);
    }
    const bottomResult = line.getIntersectingWithHorizontalLine(this.location.y + this.size.y, this.left, this.right);
    if (bottomResult.intersects) {
      result.push(bottomResult.point!);
    }
    const leftResult = line.getIntersectingWithVerticalLine(this.location.x, this.bottom, this.top);
    if (leftResult.intersects) {
      result.push(leftResult.point!);
    }
    const rightResult = line.getIntersectingWithVerticalLine(this.location.x + this.size.x, this.bottom, this.top);
    if (rightResult.intersects) {
      result.push(rightResult.point!);
    }

    return result;
  }
  /**
   * 是否完全在另一个矩形内
   * AI写的，有待测试
   * @param other
   * @returns
   */
  public isInOther(other: Rectangle): boolean {
    const collision_x = this.left > other.left && this.right < other.right;
    const collision_y = this.top > other.top && this.bottom < other.bottom;
    return collision_x && collision_y;
  }
  /**
   * 获取两个矩形的重叠区域的矩形的宽度和高度
   * 如果没有重叠区域，则宽度和高度都是0
   * 返回的x,y 都大于零
   */
  public getOverlapSize(other: Rectangle): Vector {
    if (!this.isCollideWith(other)) {
      return new Vector(0, 0);
    }
    const left = Math.max(this.left, other.left);
    const top = Math.max(this.top, other.top);
    const right = Math.min(this.right, other.right);
    const bottom = Math.min(this.bottom, other.bottom);
    const width = right - left;
    const height = bottom - top;
    return new Vector(width, height);
  }

  /**
   * 判断点是否在矩形内/边上也算
   * 为什么边上也算，因为节点的位置在左上角上，可以用于判断节点是否存在于某位置
   */
  public isPointIn(point: Vector): boolean {
    const collision_x = this.left <= point.x && point.x <= this.right;
    const collision_y = this.top <= point.y && point.y <= this.bottom;
    return collision_x && collision_y;
  }

  /**
   *
   * @param scale
   * @returns
   */

  public multiply(scale: number): Rectangle {
    return new Rectangle(this.location.multiply(scale), this.size.multiply(scale));
  }

  public toString(): string {
    return `[${this.location.toString()}, ${this.size.toString()}]`;
  }

  public getCenter(): Vector {
    return this.location.add(this.size.divide(2));
  }

  static fromPoints(p1: Vector, p2: Vector): Rectangle {
    const location = p1.clone();
    const size = p2.clone().subtract(p1);
    return new Rectangle(location, size);
  }

  /**
   * 返回一个线段和这个矩形的交点，如果没有交点，就返回这个矩形的中心点
   * 请确保线段和矩形只有一个交点，出现两个交点的情况还未测试
   */
  public getLineIntersectionPoint(line: Line) {
    const topLine = new Line(this.location, this.location.add(new Vector(this.size.x, 0)));
    const topIntersection = topLine.getIntersection(line);
    if (topIntersection) {
      return topIntersection;
    }
    const bottomLine = new Line(this.location.add(new Vector(0, this.size.y)), this.location.add(this.size));
    const bottomIntersection = bottomLine.getIntersection(line);
    if (bottomIntersection) {
      return bottomIntersection;
    }
    const leftLine = new Line(this.location, this.location.add(new Vector(0, this.size.y)));
    const leftIntersection = leftLine.getIntersection(line);
    if (leftIntersection) {
      return leftIntersection;
    }
    const rightLine = new Line(this.location.add(new Vector(this.size.x, 0)), this.location.add(this.size));
    const rightIntersection = rightLine.getIntersection(line);
    if (rightIntersection) {
      return rightIntersection;
    }
    return this.getCenter();
  }

  /**
   * 获取在this矩形边上的point的单位法向量,若point不在this矩形边上，则该函数可能返回任意向量。
   * @param point
   */
  public getNormalVectorAt(point: Vector): Vector {
    if (point.x === this.left) {
      return new Vector(-1, 0);
    } else if (point.x === this.right) {
      return new Vector(1, 0);
    } else if (point.y === this.top) {
      return new Vector(0, -1);
    } else {
      return new Vector(0, 1);
    }
  }

  public translate(offset: Vector): Rectangle {
    return new Rectangle(this.location.add(offset), this.size);
  }

  public limit(limit: Rectangle): Rectangle {
    const left = Math.max(limit.left, this.left);
    const top = Math.max(limit.top, this.top);
    const right = Math.min(limit.right, this.right);
    const bottom = Math.min(limit.bottom, this.bottom);
    return Rectangle.fromEdges(left, top, right, bottom);
  }
}
