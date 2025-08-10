import { Project, service } from "@/core/Project";
import { PenStrokeSegment } from "@/core/stage/stageObject/entity/PenStroke";
import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";
import { CubicBezierCurve, SymmetryCurve } from "@graphif/shapes";

/**
 * 关于各种曲线和直线的渲染
 * 注意：这里全都是View坐标系
 */
@service("curveRenderer")
export class CurveRenderer {
  constructor(private readonly project: Project) {}

  /**
   * 绘制一条直线实线
   * @param start
   * @param end
   * @param color
   * @param width
   */
  renderSolidLine(start: Vector, end: Vector, color: Color, width: number): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(start.x, start.y);
    this.project.canvas.ctx.lineTo(end.x, end.y);
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.stroke();
  }

  /**
   * 绘制折线实线
   * @param locations 所有点构成的数组
   * @param color
   * @param width
   */
  renderSolidLineMultiple(locations: Vector[], color: Color, width: number): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(locations[0].x, locations[0].y);
    for (let i = 1; i < locations.length; i++) {
      this.project.canvas.ctx.lineTo(locations[i].x, locations[i].y);
    }
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.stroke();
  }
  renderPenStroke(stroke: PenStrokeSegment[], color: Color): void {
    this.project.canvas.ctx.strokeStyle = color.toString();
    // 在canvas上绘制笔画
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.lineJoin = "round";
    this.project.canvas.ctx.moveTo(stroke[0].startLocation.x, stroke[0].startLocation.y);
    for (let i = 0; i < stroke.length; i++) {
      /*
      // 修改循环开始从0
      if (i > 0) {
        this.project.canvas.ctx.lineTo(stroke[i].endLocation.x, stroke[i].endLocation.y);
      }
        */
      // 上述代码这样，导致开头少了一段。如果是按住shift键画出来的直线就看不到了。

      this.project.canvas.ctx.lineTo(stroke[i].endLocation.x, stroke[i].endLocation.y);

      this.project.canvas.ctx.lineWidth = stroke[i].width; // 更新线宽为当前线段的宽度
      this.project.canvas.ctx.stroke(); // 为了确保每个线段按照不同的宽度绘制，需要在这里调用stroke
      if (i < stroke.length - 1) {
        this.project.canvas.ctx.beginPath(); // 开始新的路径，以便每个线段可以有不同的宽度
        this.project.canvas.ctx.moveTo(stroke[i].endLocation.x, stroke[i].endLocation.y);
      }
    }
    // this.project.canvas.ctx.strokeStyle = color.toString();
    // 更改颜色要在操作之前就更改，否则会出现第一笔画的颜色还是上一次的颜色这种诡异现象。
  }

  /**
   * 绘制经过平滑后的折线
   * 核心思路：将折线的顶点转换为连续贝塞尔曲线的控制点。
   * @param locations
   * @param color
   * @param width
   */
  renderSolidLineMultipleSmoothly(locations: Vector[], color: Color, width: number): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(locations[0].x, locations[0].y);

    const segments = this.smoothPoints(locations, 0.25);
    segments.forEach((seg) => {
      this.project.canvas.ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.end.x, seg.end.y);
    });
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.lineJoin = "round";
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.stroke();
  }

  private smoothPoints(points: Vector[], tension = 0.5) {
    const smoothed = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      // 计算控制点（基于前后点位置）
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      // 添加三次贝塞尔曲线段
      smoothed.push({
        type: "bezier",
        cp1: { x: cp1x, y: cp1y },
        cp2: { x: cp2x, y: cp2y },
        end: p2,
      });
    }
    return smoothed;
  }

  /**
   * 画一段折线，带有宽度实时变化
   * 实测发现有宽度变化，频繁变更粗细会导致渲染卡顿
   * @param locations
   * @param color
   * @param widthList
   */
  renderSolidLineMultipleWithWidth(locations: Vector[], color: Color, widthList: number[]): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.lineJoin = "round";
    this.project.canvas.ctx.lineWidth = widthList[0];
    this.project.canvas.ctx.moveTo(locations[0].x, locations[0].y);
    for (let i = 1; i < locations.length; i++) {
      this.project.canvas.ctx.lineTo(locations[i].x, locations[i].y);
      // this.project.canvas.ctx.stroke();
    }
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.stroke();
    // this.project.canvas.ctx.strokeStyle = color.toString();
    // this.project.canvas.ctx.beginPath();
    // for (let i = 0; i < locations.length - 1; i++) {
    //   const start = locations[i];
    //   const end = locations[i + 1];
    //   this.project.canvas.ctx.lineWidth = widthList[i + 1];
    //   this.project.canvas.ctx.moveTo(start.x, start.y);
    //   this.project.canvas.ctx.lineTo(end.x, end.y);
    //   this.project.canvas.ctx.stroke();
    // }
  }

  /**
   * 绘制折线实线，带有阴影
   * @param locations
   * @param color
   * @param width
   * @param shadowColor
   * @param shadowBlur
   */
  renderSolidLineMultipleWithShadow(
    locations: Vector[],
    color: Color,
    width: number,
    shadowColor: Color,
    shadowBlur: number,
  ): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(locations[0].x, locations[0].y);
    for (let i = 1; i < locations.length; i++) {
      this.project.canvas.ctx.lineTo(locations[i].x, locations[i].y);
    }
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.shadowColor = shadowColor.toString();
    this.project.canvas.ctx.shadowBlur = shadowBlur;
    this.project.canvas.ctx.stroke();
    this.project.canvas.ctx.shadowBlur = 0;
  }

  /**
   * 绘制一条虚线
   *
   * 2024年11月10日 发现虚线渲染不生效，也很难排查到原因
   * 2024年12月5日 突然发现又没有问题了，也不知道为什么。
   * @param start
   * @param end
   * @param color
   * @param width
   * @param dashLength 虚线的长度，效果： =2: "--  --  --  --", =1: "- - - - -"
   */
  renderDashedLine(start: Vector, end: Vector, color: Color, width: number, dashLength: number): void {
    this.project.canvas.ctx.setLineDash([dashLength, dashLength]);
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(start.x, start.y);
    this.project.canvas.ctx.lineTo(end.x, end.y);
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.stroke();
    // 重置线型
    this.project.canvas.ctx.setLineDash([]);
  }

  /**
   * 绘制一条贝塞尔曲线
   * @param curve
   */
  renderBezierCurve(curve: CubicBezierCurve, color: Color, width: number): void {
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(curve.start.x, curve.start.y);
    this.project.canvas.ctx.bezierCurveTo(
      curve.ctrlPt1.x,
      curve.ctrlPt1.y,
      curve.ctrlPt2.x,
      curve.ctrlPt2.y,
      curve.end.x,
      curve.end.y,
    );
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.strokeStyle = color.toString();
    this.project.canvas.ctx.stroke();
  }

  /**
   * 绘制一条对称曲线
   * @param curve
   */
  renderSymmetryCurve(curve: SymmetryCurve, color: Color, width: number): void {
    this.renderBezierCurve(curve.bezier, color, width);
  }

  /**
   * 绘制一条从颜色渐变到另一种颜色的实线
   */
  renderGradientLine(start: Vector, end: Vector, startColor: Color, endColor: Color, width: number): void {
    const gradient = this.project.canvas.ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    // 添加颜色
    gradient.addColorStop(0, startColor.toString()); // 起始颜色
    gradient.addColorStop(1, endColor.toString()); // 结束颜色
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(start.x, start.y);
    this.project.canvas.ctx.lineTo(end.x, end.y);
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.strokeStyle = gradient;
    this.project.canvas.ctx.stroke();
  }
  /**
   * 绘制一条颜色渐变的贝塞尔曲线
   * @param curve
   */
  renderGradientBezierCurve(curve: CubicBezierCurve, startColor: Color, endColor: Color, width: number): void {
    const gradient = this.project.canvas.ctx.createLinearGradient(
      curve.start.x,
      curve.start.y,
      curve.end.x,
      curve.end.y,
    );
    // 添加颜色
    gradient.addColorStop(0, startColor.toString()); // 起始颜色
    gradient.addColorStop(1, endColor.toString()); // 结束颜色
    this.project.canvas.ctx.beginPath();
    this.project.canvas.ctx.moveTo(curve.start.x, curve.start.y);
    this.project.canvas.ctx.bezierCurveTo(
      curve.ctrlPt1.x,
      curve.ctrlPt1.y,
      curve.ctrlPt2.x,
      curve.ctrlPt2.y,
      curve.end.x,
      curve.end.y,
    );
    this.project.canvas.ctx.lineWidth = width;
    this.project.canvas.ctx.strokeStyle = gradient;
    this.project.canvas.ctx.stroke();
  }
}
