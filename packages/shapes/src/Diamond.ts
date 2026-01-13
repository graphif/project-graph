import { Vector } from "@graphif/data-structures";
import { serializable } from "@graphif/serializer";
import { Line } from "./Line";
import { Rectangle } from "./Rectangle";
import { Shape } from "./Shape";

/**
 * 菱形（钻石形）
 * location 是左上角，size 是外接矩形的宽高
 */
export class Diamond extends Shape {
  @serializable
  location: Vector;
  @serializable
  size: Vector;

  constructor(location: Vector, size: Vector) {
    super();
    this.location = location;
    this.size = size;
  }

  /**
   * 获取菱形的四个顶点（按顺序：上、右、下、左）
   */
  getVertices(): Vector[] {
    const center = this.getCenter();
    const halfWidth = this.size.x / 2;
    const halfHeight = this.size.y / 2;
    return [
      new Vector(center.x, center.y - halfHeight), // 上
      new Vector(center.x + halfWidth, center.y), // 右
      new Vector(center.x, center.y + halfHeight), // 下
      new Vector(center.x - halfWidth, center.y), // 左
    ];
  }

  getCenter(): Vector {
    return this.location.add(this.size.divide(2));
  }

  isPointIn(point: Vector): boolean {
    const vertices = this.getVertices();
    // 使用射线法判断点是否在多边形内
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;

      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  isCollideWithRectangle(rectangle: Rectangle): boolean {
    // 检查矩形的四个角是否在菱形内，或者菱形的顶点是否在矩形内
    const rectCorners = [
      rectangle.location,
      new Vector(rectangle.right, rectangle.top),
      new Vector(rectangle.right, rectangle.bottom),
      new Vector(rectangle.left, rectangle.bottom),
    ];
    const diamondVertices = this.getVertices();

    // 检查矩形角是否在菱形内
    for (const corner of rectCorners) {
      if (this.isPointIn(corner)) return true;
    }

    // 检查菱形顶点是否在矩形内
    for (const vertex of diamondVertices) {
      if (rectangle.isPointIn(vertex)) return true;
    }

    // 检查边是否相交（简化处理：检查中心点是否重叠）
    const diamondCenter = this.getCenter();
    const rectCenter = rectangle.center;
    const distance = diamondCenter.distance(rectCenter);
    const minDistance = Math.min(this.size.x, this.size.y) / 2 + Math.min(rectangle.size.x, rectangle.size.y) / 2;
    return distance < minDistance;
  }

  isCollideWithLine(line: Line): boolean {
    // 检查线是否与菱形的边相交
    const vertices = this.getVertices();
    for (let i = 0; i < vertices.length; i++) {
      const nextIndex = (i + 1) % vertices.length;
      const edge = new Line(vertices[i], vertices[nextIndex]);
      if (line.isIntersecting(edge)) {
        return true;
      }
    }
    return false;
  }

  getRectangle(): Rectangle {
    return new Rectangle(this.location.clone(), this.size.clone());
  }

  clone(): Diamond {
    return new Diamond(this.location.clone(), this.size.clone());
  }

  toString(): string {
    return `Diamond(${this.location.toString()}, ${this.size.toString()})`;
  }
}
