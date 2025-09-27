import { Project, service } from "@/core/Project";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 基础图形渲染器
 * 注意：全部都是基于View坐标系
 */
@service("shapeRenderer")
export class ShapeRenderer {
  constructor(private readonly project: Project) {}

  /**
   * 画一个圆
   * @param ctx
   * @param centerLocation
   * @param radius
   * @param color
   * @param strokeColor
   * @param strokeWidth
   */
  renderCircle(centerLocation: Vector, radius: number, color: Color, strokeColor: Color, strokeWidth: number): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.arc(centerLocation.x, centerLocation.y, radius, 0, 2 * Math.PI);
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fill();
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
  }

  /**
   * 画一个圆弧但不填充
   * 从开始弧度到结束弧度，逆时针转过去。（因为y轴向下）
   * @param centerLocation 圆弧的中心
   * @param radius 半径
   * @param angle1 开始弧度
   * @param angle2 结束弧度
   * @param strokeColor
   * @param strokeWidth
   */
  renderArc(
    centerLocation: Vector,
    radius: number,
    angle1: number,
    angle2: number,
    strokeColor: Color,
    strokeWidth: number,
  ): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.arc(centerLocation.x, centerLocation.y, radius, angle1, angle2);
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
  }

  /**
   * 画一个矩形，但是坐标点是矩形的中心点
   * @param centerLocation
   * @param width
   * @param height
   * @param color
   * @param strokeColor
   * @param strokeWidth
   * @param radius
   */
  renderRectFromCenter(
    centerLocation: Vector,
    width: number,
    height: number,
    color: Color,
    strokeColor: Color,
    strokeWidth: number,
    radius: number = 0,
  ): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.roundRect(
      centerLocation.x - width / 2,
      centerLocation.y - height / 2,
      width,
      height,
      radius,
    );
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fill();
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
  }

  /**
   * 画矩形
   * @param rect
   * @param color
   * @param strokeColor
   * @param strokeWidth
   * @param radius
   */
  renderRect(rect: Rectangle, color: Color, strokeColor: Color, strokeWidth: number, radius: number = 0) {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.roundRect(rect.location.x, rect.location.y, rect.size.x, rect.size.y, radius);
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fill();
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
  }

  renderDashedRect(
    rect: Rectangle,
    color: Color,
    strokeColor: Color,
    strokeWidth: number,
    radius: number = 0,
    dashLength = 5,
  ) {
    this.project.canvas.ctx.setLineDash([dashLength, dashLength]);
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.roundRect(rect.location.x, rect.location.y, rect.size.x, rect.size.y, radius);
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fill();
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
    // 重置线型
    this.project.canvas.ctx.setLineDash([]);
  }

  /**
   * 画一个带阴影的矩形
   * @param rect
   */
  renderRectWithShadow(
    rect: Rectangle,
    fillColor: Color,
    strokeColor: Color,
    strokeWidth: number,
    shadowColor: Color,
    shadowBlur: number,
    shadowOffsetX: number = 0,
    shadowOffsetY: number = 0,
    radius: number = 0,
  ) {
    this.project.canvas.ctx.shadowColor = shadowColor.toString();
    this.project.canvas.ctx.shadowBlur = shadowBlur;
    this.project.canvas.ctx.shadowOffsetX = shadowOffsetX;
    this.project.canvas.ctx.shadowOffsetY = shadowOffsetY;
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.roundRect(rect.location.x, rect.location.y, rect.size.x, rect.size.y, radius);
    this.project.canvas.ctx.fillStyle = fillColor.toString();
    this.project.canvas.ctx.fill();
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
    this.project.canvas.ctx.shadowColor = "transparent";
    this.project.canvas.ctx.shadowBlur = 0;
    this.project.canvas.ctx.shadowOffsetX = 0;
    this.project.canvas.ctx.shadowOffsetY = 0;
  }

  /**
   * 绘制一个多边形并填充
   * @param points 多边形的顶点数组，三角形就只需三个点，
   * 不用考虑首尾点闭合。
   * @param fillColor
   * @param strokeColor
   * @param strokeWidth
   */
  renderPolygonAndFill(
    points: Vector[],
    fillColor: Color,
    strokeColor: Color,
    strokeWidth: number,
    lineJoin: "round" | "bevel" = "round",
  ): void {
    this.project.canvas.ctx.lineJoin = lineJoin; // 圆角
    // bevel，斜角
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.project.canvas.ctx.lineTo(points[i].x, points[i].y);
    }
    this.project.canvas.ctx.closePath();
    this.project.canvas.ctx.fillStyle = fillColor.toString();
    this.project.canvas.ctx.fill();
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
  }

  /**
   * 绘制中心过渡的圆形不加边框
   * 常用于一些特效
   */
  renderCircleTransition(viewLocation: Vector, radius: number, centerColor: Color) {
    const gradient = this.project.canvas.ctx.createRadialGradient(
      viewLocation.x,
      viewLocation.y,
      0,
      viewLocation.x,
      viewLocation.y,
      radius,
    );
    // 添加颜色
    gradient.addColorStop(0, centerColor.toString()); // 中心
    const transparentColor = centerColor.clone();
    transparentColor.a = 0;
    gradient.addColorStop(1, transparentColor.toString()); // 边缘透明
    this.project.canvas.ctx.fillStyle = gradient;
    this.project.canvas.ctx.strokeStyle = "transparent";
    // 绘制圆形
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.arc(viewLocation.x, viewLocation.y, radius, 0, 2 * Math.PI, false);
    this.project.canvas.ctx.fill();
  }

  /**
   * 画一个类似摄像机的形状，矩形边框
   * 表面上看上去是一个矩形框，但是只有四个角，每隔边的中间部分是透明的
   * @param rect 矩形
   * @param borderColor 边框颜色
   * @param borderWidth 边框宽度
   */
  renderCameraShapeBorder(rect: Rectangle, borderColor: Color, borderWidth: number) {
    const x = rect.location.x;
    const y = rect.location.y;
    const w = rect.size.x;
    const h = rect.size.y;

    // 计算四个角线段的长度（取各边长的25%）
    const hLineLen = w * 0.25;
    const vLineLen = h * 0.25;

    this.project.canvas.ctx.beginPath();

    // 左上角（右向线段 + 下向线段）
    this.project.canvas.ctx.moveTo(x, y);
    this.project.canvas.ctx.lineTo(x + hLineLen, y);
    this.project.canvas.ctx.moveTo(x, y);
    this.project.canvas.ctx.lineTo(x, y + vLineLen);

    // 右上角（左向线段 + 下向线段）
    this.project.canvas.ctx.moveTo(x + w, y);
    this.project.canvas.ctx.lineTo(x + w - hLineLen, y);
    this.project.canvas.ctx.moveTo(x + w, y);
    this.project.canvas.ctx.lineTo(x + w, y + vLineLen);

    // 右下角（左向线段 + 上向线段）
    this.project.canvas.ctx.moveTo(x + w, y + h);
    this.project.canvas.ctx.lineTo(x + w - hLineLen, y + h);
    this.project.canvas.ctx.moveTo(x + w, y + h);
    this.project.canvas.ctx.lineTo(x + w, y + h - vLineLen);

    // 左下角（右向线段 + 上向线段）
    this.project.canvas.ctx.moveTo(x, y + h);
    this.project.canvas.ctx.lineTo(x + hLineLen, y + h);
    this.project.canvas.ctx.moveTo(x, y + h);
    this.project.canvas.ctx.lineTo(x, y + h - vLineLen);

    // 设置绘制样式
    this.project.canvas.ctx.strokeStyle = borderColor.toString();
    this.project.canvas.ctx.lineWidth = borderWidth;
    this.project.canvas.ctx.lineCap = "round"; // 线段末端圆角
    this.project.canvas.ctx.stroke();
  }
}
