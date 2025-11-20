import { Vector } from "@graphif/data-structures";
import { Line } from "./Line";
import { Rectangle } from "./Rectangle";
import { Shape } from "./Shape";

/**
 * 圆形，
 * 注意：坐标点location属性是圆心属性
 */
export class Circle extends Shape {
  constructor(
    public location: Vector,
    public radius: number,
  ) {
    super();
  }

  isPointIn(point: Vector) {
    const distance = this.location.distance(point);
    return distance <= this.radius;
  }

  isCollideWithRectangle(rectangle: Rectangle): boolean {
    return rectangle.isPointIn(this.location);
  }

  isCollideWithLine(line: Line): boolean {
    return line.isIntersectingWithCircle(this);
  }

  getRectangle(): Rectangle {
    const left = this.location.x - this.radius;
    const top = this.location.y - this.radius;
    return new Rectangle(new Vector(left, top), Vector.same(this.radius * 2));
  }

  toString(): string {
    return `Circle(${this.location.toString()}, ${this.radius})`;
  }
}
