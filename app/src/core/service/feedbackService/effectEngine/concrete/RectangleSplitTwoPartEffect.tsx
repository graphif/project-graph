import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 一个矩形被一刀切成两半，两个多边形的的特效
 */
export class RectangleSplitTwoPartEffect extends Effect {
  /**
   * 长度只有2
   */
  private splitedRectangles: SplitedRectangle[] = [];
  private initFillColor: Color;
  private endFillColor: Color;

  constructor(
    rectangle: Rectangle,
    twoPoint: Vector[],
    time: number,
    fillColor: Color,
    strokeColor: Color,
    strokeWidth: number,
  ) {
    super(new ProgressNumber(0, time));
    this.initFillColor = fillColor.clone();
    this.endFillColor = fillColor.toTransparent();

    const leftTop = rectangle.location;
    const rightTop = new Vector(leftTop.x + rectangle.size.x, leftTop.y);
    const rightBottom = new Vector(rightTop.x, leftTop.y + rectangle.size.y);
    const leftBottom = new Vector(leftTop.x, rightBottom.y);
    const p1 = twoPoint[0];
    const p2 = twoPoint[1];

    const getEdge = (rect: Rectangle, point: Vector): string => {
      const x = rect.location.x;
      const y = rect.location.y;
      const w = rect.size.x;
      const h = rect.size.y;
      if (point.x === x) return "left";
      if (point.x === x + w) return "right";
      if (point.y === y) return "top";
      if (point.y === y + h) return "bottom";
      // throw new Error("Point is not on the rectangle's edge");
      // 其他有一种意外情况就是在内部
      return "inner";
    };

    const edge1 = getEdge(rectangle, p1);
    const edge2 = getEdge(rectangle, p2);

    let poly1: Vector[], poly2: Vector[];

    // 处理对边情况
    if ((edge1 === "left" && edge2 === "right") || (edge1 === "right" && edge2 === "left")) {
      // 横着切
      const [leftPt, rightPt] = edge1 === "left" ? [p1, p2] : [p2, p1];
      poly1 = [leftTop, leftPt, rightPt, rightTop];
      poly2 = [leftPt, leftBottom, rightBottom, rightPt];
    } else if ((edge1 === "top" && edge2 === "bottom") || (edge1 === "bottom" && edge2 === "top")) {
      // 竖着切
      const [topPt, bottomPt] = edge1 === "top" ? [p1, p2] : [p2, p1];
      poly1 = [leftTop, topPt, bottomPt, leftBottom];
      poly2 = [topPt, rightTop, rightBottom, bottomPt];
    } else if ((edge1 === "left" && edge2 === "bottom") || (edge1 === "bottom" && edge2 === "left")) {
      const [leftPt, bottomPt] = edge1 === "left" ? [p1, p2] : [p2, p1];
      // 切左下角
      poly1 = [leftPt, leftTop, rightTop, rightBottom, bottomPt];
      poly2 = [leftPt, leftBottom, bottomPt];
    } else if ((edge1 === "right" && edge2 === "top") || (edge1 === "top" && edge2 === "right")) {
      // 切右上角
      const [rightPt, topPt] = edge1 === "right" ? [p1, p2] : [p2, p1];
      poly1 = [rightPt, rightTop, topPt];
      poly2 = [rightPt, rightBottom, leftBottom, leftTop, topPt];
    } else if ((edge1 === "left" && edge2 === "top") || (edge1 === "top" && edge2 === "left")) {
      // 左上切割（连接左边和顶边）
      const [leftPt, topPt] = edge1 === "left" ? [p1, p2] : [p2, p1];

      // 多边形1（左上三角）：leftPt -> leftTop -> topPt
      poly1 = [leftPt, leftTop, topPt];

      // 多边形2（剩余部分）：leftPt -> leftBottom -> rightBottom -> rightTop -> topPt
      poly2 = [leftPt, leftBottom, rightBottom, rightTop, topPt];
    } else if ((edge1 === "right" && edge2 === "bottom") || (edge1 === "bottom" && edge2 === "right")) {
      // 右下切割（连接右边和底边）
      const [rightPt, bottomPt] = edge1 === "right" ? [p1, p2] : [p2, p1];

      // 多边形1（右下三角）：rightPt -> rightBottom -> bottomPt
      poly1 = [rightPt, rightBottom, bottomPt];

      // 多边形2（剩余部分）：rightPt -> rightTop -> leftTop -> leftBottom -> bottomPt
      poly2 = [rightPt, rightTop, leftTop, leftBottom, bottomPt];
    } else if (edge1 === "inner" || edge2 === "inner") {
      const innerPt = edge1 === "inner" ? p1 : p2;
      // 直接裂成四块
      poly1 = [leftTop, rightTop, innerPt];
      poly2 = [leftTop, leftBottom, innerPt];
      const poly3 = [rightTop, rightBottom, innerPt];
      const poly4 = [leftBottom, rightBottom, innerPt];
      this.splitedRectangles.push(
        new SplitedRectangle(poly1, fillColor, strokeColor, strokeWidth),
        new SplitedRectangle(poly2, fillColor, strokeColor, strokeWidth),
        new SplitedRectangle(poly3, fillColor, strokeColor, strokeWidth),
        new SplitedRectangle(poly4, fillColor, strokeColor, strokeWidth),
      );
      for (const rect of this.splitedRectangles) {
        rect.speed = new Vector(0, -Random.randomInt(1, 10)).rotateDegrees(Random.randomInt(-45, 45));
        rect.accleration = new Vector(0, 0.5);
      }
      return;
    } else {
      // 处理其他情况或抛出错误
      // throw new Error(`Unsupported edge combination: ${edge1} and ${edge2}`);
      poly1 = [leftTop, rightTop, rightBottom, leftBottom];
      poly2 = [leftTop, rightTop, rightBottom, leftBottom];
    }

    this.splitedRectangles.push(
      new SplitedRectangle(poly1, fillColor, strokeColor, strokeWidth),
      new SplitedRectangle(poly2, fillColor, strokeColor, strokeWidth),
    );
    this.splitedRectangles.sort((a, b) => a.center.x - b.center.x);
    this.splitedRectangles[0].speed = new Vector(-Random.randomInt(1, 10), -Random.randomInt(0, 3));
    this.splitedRectangles[1].speed = new Vector(Random.randomInt(1, 10), -Random.randomInt(0, 3));
    // 重力加速度
    this.splitedRectangles[0].accleration = new Vector(0, 0.5);
    this.splitedRectangles[1].accleration = new Vector(0, 0.5);
  }
  render(project: Project) {
    for (const rect of this.splitedRectangles) {
      rect.render(project);
    }
  }
  override tick(project: Project) {
    super.tick(project);
    for (const rect of this.splitedRectangles) {
      rect.tick();
      rect.fillColor = this.initFillColor.with({ a: this.timeProgress.rate });
      rect.strokeColor = rect.strokeColor.with({ a: 1 - this.timeProgress.rate });
    }
  }
}

/**
 * 被切割了的矩形
 * @param polygon 切割后的多边形
 */
class SplitedRectangle {
  // 当前速度
  public speed = new Vector(0, 0);
  public accleration = new Vector(0, 0);

  /**
   * 多边形的顶点，按照一个时针方向排列，起点和终点不重复出现在数组中。
   * @param polygon 切割后的多边形
   */
  constructor(
    public polygon: Vector[],
    public fillColor: Color,
    public strokeColor: Color,
    private strokeWidth: number,
  ) {
    if (polygon.length < 3 || polygon.length > 5) {
      throw new Error("Polygon must have 3 or 5 points");
    }
  }

  get center(): Vector {
    // 获取这个碎片形状的外接矩形的中心点
    const minX = Math.min(...this.polygon.map((v) => v.x));
    const maxX = Math.max(...this.polygon.map((v) => v.x));
    const minY = Math.min(...this.polygon.map((v) => v.y));
    const maxY = Math.max(...this.polygon.map((v) => v.y));
    return new Vector((minX + maxX) / 2, (minY + maxY) / 2);
  }

  public tick() {
    // 移动这个碎片形状
    this.speed = this.speed.add(this.accleration);
    this.move(this.speed);
  }

  public move(offset: Vector) {
    // 移动这个碎片形状
    const newPoints = this.polygon.map((v) => v.add(offset));
    this.polygon = newPoints;
  }

  public moveTo(position: Vector) {
    // 移动这个碎片形状到指定的位置
    const offset = position.subtract(this.center);
    this.move(offset);
  }

  render(project: Project) {
    project.shapeRenderer.renderPolygonAndFill(
      this.polygon.map((v) => project.renderer.transformWorld2View(v)),
      this.fillColor,
      this.strokeColor,
      this.strokeWidth * project.camera.currentScale,
      "round",
    );
  }
}
