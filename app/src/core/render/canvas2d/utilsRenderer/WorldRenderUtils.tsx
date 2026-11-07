import { Color, Vector } from "@graphif/data-structures";
import { CubicBezierCurve, CubicCatmullRomSpline, Rectangle, SymmetryCurve } from "@graphif/shapes";
import { Project, service } from "@/core/Project";
import { superellipseRect } from "@/utils/superellipse";

/**
 * 一些基础的渲染图形
 * 注意：这些渲染的参数都是World坐标系下的。
 */
@service("worldRenderUtils")
export class WorldRenderUtils {
  constructor(private readonly project: Project) {}

  /**
   * 绘制一条Catmull-Rom样条线
   * @param curve
   */
  renderCubicCatmullRomSpline(spline: CubicCatmullRomSpline, color: Color, width: number): void {
    const points = spline.computePath().map((it) => this.project.renderer.transformWorld2View(it));
    width *= this.project.camera.currentScale;
    const start = this.project.renderer.transformWorld2View(spline.controlPoints[1]);
    const end = this.project.renderer.transformWorld2View(spline.controlPoints[spline.controlPoints.length - 2]);
    // 绘制首位控制点到曲线首尾的虚线
    const dashedColor = color.clone();
    dashedColor.a /= 2;
    this.project.curveRenderer.renderDashedLine(
      this.project.renderer.transformWorld2View(spline.controlPoints[0]),
      start,
      dashedColor,
      width,
      width * 2,
    );
    this.project.curveRenderer.renderDashedLine(
      end,
      this.project.renderer.transformWorld2View(spline.controlPoints[spline.controlPoints.length - 1]),
      dashedColor,
      width,
      width * 2,
    );
    // 绘制曲线
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.lineJoin = "bevel";
    this.project.canvas.ctx.moveTo(points[0].x, points[0].y);
    this.project.canvas.ctx.lineWidth = width;
    for (let i = 1; i < points.length; i++) {
      this.project.canvas.ctx.lineTo(points[i].x, points[i].y);
    }
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.stroke();
    // 绘制曲线上的样点
    // for (const p of points) {
    //   RenderUtils.renderCircle(p, width, color, color, width);
    // }
    // 绘制控制点
    // for (const p of spline.controlPoints) {
    //   RenderUtils.renderCircle(
    //     Renderer.transformWorld2View(p),
    //     width * 2,
    //     Color.Red,
    //     dashedColor,
    //     Camera.currentScale,
    //   );
    // }
  }

  /**
   * 绘制一条贝塞尔曲线
   * @param curve
   */
  private renderBezierCurve(curve: CubicBezierCurve, color: Color, width: number): void {
    // 创建新的曲线对象，避免修改原始曲线数据
    const viewStart = this.project.renderer.transformWorld2View(curve.start);
    const viewEnd = this.project.renderer.transformWorld2View(curve.end);
    const viewCtrlPt1 = this.project.renderer.transformWorld2View(curve.ctrlPt1);
    const viewCtrlPt2 = this.project.renderer.transformWorld2View(curve.ctrlPt2);

    // 使用视图坐标系下的点创建新的贝塞尔曲线
    const viewBezier = new CubicBezierCurve(viewStart, viewCtrlPt1, viewCtrlPt2, viewEnd);

    this.project.curveRenderer.renderBezierCurve(viewBezier, color, width);
  }

  /**
   * 绘制一条对称曲线
   * @param curve
   */
  public renderSymmetryCurve(curve: SymmetryCurve, color: Color, width: number): void {
    this.renderBezierCurve(curve.bezier, color, width);
  }

  /**
   * 绘制一条虚线对称曲线
   * @param curve
   */
  renderDashedSymmetryCurve(curve: SymmetryCurve, color: Color, width: number, dashLength: number): void {
    // 创建新的曲线对象，避免修改原始曲线数据
    const viewStart = this.project.renderer.transformWorld2View(curve.start);
    const viewEnd = this.project.renderer.transformWorld2View(curve.end);
    const viewCtrlPt1 = this.project.renderer.transformWorld2View(curve.bezier.ctrlPt1);
    const viewCtrlPt2 = this.project.renderer.transformWorld2View(curve.bezier.ctrlPt2);

    // 使用视图坐标系下的点创建新的贝塞尔曲线
    const viewBezier = new CubicBezierCurve(viewStart, viewCtrlPt1, viewCtrlPt2, viewEnd);

    this.project.curveRenderer.renderDashedBezierCurve(
      viewBezier,
      color,
      width * this.project.camera.currentScale,
      dashLength,
    );
  }

  /**
   * 绘制一条双实线对称曲线
   * @param curve
   */
  renderDoubleSymmetryCurve(curve: SymmetryCurve, color: Color, width: number, gap: number): void {
    // 创建新的曲线对象，避免修改原始曲线数据
    const viewStart = this.project.renderer.transformWorld2View(curve.start);
    const viewEnd = this.project.renderer.transformWorld2View(curve.end);
    const viewCtrlPt1 = this.project.renderer.transformWorld2View(curve.bezier.ctrlPt1);
    const viewCtrlPt2 = this.project.renderer.transformWorld2View(curve.bezier.ctrlPt2);

    // 使用视图坐标系下的点创建新的贝塞尔曲线
    const viewBezier = new CubicBezierCurve(viewStart, viewCtrlPt1, viewCtrlPt2, viewEnd);

    this.project.curveRenderer.renderDoubleBezierCurve(
      viewBezier,
      color,
      width * this.project.camera.currentScale,
      gap,
    );
  }

  renderLaser(start: Vector, end: Vector, width: number, color: Color): void {
    const ctx = this.project.canvas.ctx;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    if (start.distance(end) === 0) {
      for (const [extraWidth, alphaScale] of [
        [12, 0.15],
        [6, 0.3],
        [2, 0.6],
      ] as const) {
        this.renderPrismaticBlock(start, 4, Color.Transparent, color.toNewAlpha(color.a * alphaScale), 2 + extraWidth);
      }
      this.renderPrismaticBlock(
        start,
        4,
        Color.Transparent,
        this.project.stageStyleManager.currentStyle.effects.flash,
        2,
      );
      return;
    }

    const viewStart = this.project.renderer.transformWorld2View(start);
    const viewEnd = this.project.renderer.transformWorld2View(end);
    const originLineCap = ctx.lineCap;
    ctx.lineCap = "round";

    for (const [extraWidth, alphaScale] of [
      [12, 0.15],
      [6, 0.3],
      [2, 0.6],
    ] as const) {
      this.project.curveRenderer.renderSolidLine(
        viewStart,
        viewEnd,
        color.toNewAlpha(color.a * alphaScale),
        width + extraWidth,
      );
    }
    this.project.curveRenderer.renderSolidLine(
      viewStart,
      viewEnd,
      this.project.stageStyleManager.currentStyle.effects.flash,
      width,
    );

    ctx.lineCap = originLineCap;
  }

  renderPrismaticBlock(
    centerLocation: Vector,
    radius: number,
    color: Color,
    strokeColor: Color,
    strokeWidth: number,
  ): void {
    const c = this.project.renderer.transformWorld2View(centerLocation);
    // radius *= this.project.camera.currentScale;
    // strokeWidth *= this.project.camera.currentScale;
    const originLineJoin = this.project.canvas.ctx.lineJoin;
    this.project.canvas.ctx.lineJoin = "miter";
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(c.x + radius, c.y);
    this.project.canvas.ctx.lineTo(c.x, c.y - radius);
    this.project.canvas.ctx.lineTo(c.x - radius, c.y);
    this.project.canvas.ctx.lineTo(c.x, c.y + radius);
    this.project.canvas.ctx.closePath();
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fill();
    this.project.canvas.ctx.lineWidth = strokeWidth;
    this.project.canvas.ctx.strokeStyle = strokeColor.toString();
    this.project.canvas.ctx.stroke();
    this.project.canvas.ctx.lineJoin = originLineJoin;
  }

  renderRectangleFlash(rectangle: Rectangle, shadowColor: Color, shadowBlur: number, roundedRadius = 0) {
    const ctx = this.project.canvas.ctx;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    if (shadowBlur <= 0 || shadowColor.a <= 0) {
      return;
    }

    const originLineJoin = ctx.lineJoin;
    ctx.lineJoin = "round";
    ctx.beginPath();
    superellipseRect(
      ctx,
      rectangle.location.x,
      rectangle.location.y,
      rectangle.size.x,
      rectangle.size.y,
      roundedRadius,
    );

    for (const [widthScale, alphaScale] of [
      [0.6, 0.15],
      [0.3, 0.3],
      [0.12, 0.6],
    ] as const) {
      ctx.lineWidth = Math.max(1, shadowBlur * widthScale);
      ctx.strokeStyle = shadowColor.toNewAlpha(shadowColor.a * alphaScale).toString();
      ctx.stroke();
    }

    ctx.lineJoin = originLineJoin;
  }

  renderCuttingFlash(start: Vector, end: Vector, width: number, shadowColor: Color): void {
    const ctx = this.project.canvas.ctx;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    width = Math.min(width, 20);
    if (start.distance(end) === 0 || width <= 0) {
      return;
    }

    const direction = end.subtract(start).normalize();
    const headShiftBack = end.subtract(direction.multiply(20));
    const headLeft = headShiftBack.add(direction.rotateDegrees(90).multiply(width / 2));
    const headRight = headShiftBack.add(direction.rotateDegrees(-90).multiply(width / 2));
    const points = [
      this.project.renderer.transformWorld2View(start),
      this.project.renderer.transformWorld2View(headLeft),
      this.project.renderer.transformWorld2View(end),
      this.project.renderer.transformWorld2View(headRight),
    ];

    for (const [strokeWidth, alphaScale] of [
      [12, 0.15],
      [6, 0.3],
      [2, 0.6],
    ] as const) {
      this.project.shapeRenderer.renderPolygonAndFill(
        points,
        Color.Transparent,
        shadowColor.toNewAlpha(shadowColor.a * alphaScale),
        strokeWidth,
      );
    }

    this.project.shapeRenderer.renderPolygonAndFill(
      points,
      this.project.stageStyleManager.currentStyle.effects.flash,
      Color.Transparent,
      0,
    );
  }
}
