import { ConvexHull } from "@/core/algorithm/geometry/convexHull";
import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Color, Vector } from "@graphif/data-structures";
import { Line } from "@graphif/shapes";

@service("multiTargetUndirectedEdgeRenderer")
export class MultiTargetUndirectedEdgeRenderer {
  constructor(private readonly project: Project) {}

  render(edge: MultiTargetUndirectedEdge) {
    if (edge.isSelected) {
      this.project.collisionBoxRenderer.render(
        edge.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }
    if (edge.associationList.length < 2) {
      // 特殊情况，出问题了属于是
      if (edge.associationList.length === 1) {
        // 画一个圆环
        const node = edge.associationList[0];
        const center = node.collisionBox.getRectangle().center;
        this.project.shapeRenderer.renderCircle(
          this.project.renderer.transformWorld2View(center),
          100 * this.project.camera.currentScale,
          Color.Transparent,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2 * this.project.camera.currentScale,
        );
      }
      if (edge.associationList.length === 0) {
        // 在0 0 位置画圆
        this.project.shapeRenderer.renderCircle(
          this.project.renderer.transformWorld2View(Vector.getZero()),
          100 * this.project.camera.currentScale,
          Color.Transparent,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2 * this.project.camera.currentScale,
        );
      }
      return;
    }

    // 正常情况, target >= 2
    const centerLocation = edge.centerLocation;
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;
    // 画文字
    if (edge.text !== "") {
      // 画文字
      this.project.textRenderer.renderMultiLineTextFromCenter(
        edge.text,
        this.project.renderer.transformWorld2View(centerLocation),
        Renderer.FONT_SIZE * this.project.camera.currentScale,
        Infinity,
        edgeColor,
      );
    }
    if (edge.renderType === "line") {
      // if (edge.associationList.length === 2) {
      //   if (edge.centerRate.nearlyEqual(new Vector(0.5, 0.5), 0.3)) {
      //     this.renderLineShape(edge, edgeColor, centerLocation);
      //   } else {
      //     this.renderCurveShape(edge, edgeColor, centerLocation);
      //   }
      // } else {
      //   this.renderLineShape(edge, edgeColor, centerLocation);
      // }
      this.renderLineShape(edge, edgeColor, centerLocation);
    } else if (edge.renderType === "convex") {
      this.renderConvexShape(edge, edgeColor);
    } else if (edge.renderType === "circle") {
      this.renderCircle(edge, edgeColor);
    }
  }

  private renderLineShape(edge: MultiTargetUndirectedEdge, edgeColor: Color, centerLocation: Vector): void {
    // 画每一条线
    // node[i] ----> center
    for (let i = 0; i < edge.associationList.length; i++) {
      const node = edge.associationList[i];
      const nodeRectangle = node.collisionBox.getRectangle();
      const targetLocation = nodeRectangle.getInnerLocationByRateVector(edge.rectRates[i]);
      const line = new Line(centerLocation, targetLocation);
      const targetPoint = nodeRectangle.getLineIntersectionPoint(line);
      let toCenterPoint = centerLocation;
      if (edge.text !== "") {
        const textRectangle = edge.textRectangle;
        toCenterPoint = textRectangle.getLineIntersectionPoint(new Line(centerLocation, targetLocation));
      }
      const startView = this.project.renderer.transformWorld2View(targetPoint);
      const endView = this.project.renderer.transformWorld2View(toCenterPoint);
      const lineWidth = 2 * this.project.camera.currentScale;
      const lineType = edge.lineType || "solid";
      if (lineType === "dashed") {
        this.project.curveRenderer.renderDashedLine(
          startView,
          endView,
          edgeColor,
          lineWidth,
          10 * this.project.camera.currentScale,
        );
      } else if (lineType === "double") {
        this.project.curveRenderer.renderDoubleLine(
          startView,
          endView,
          edgeColor,
          lineWidth,
          5 * this.project.camera.currentScale,
        );
      } else {
        this.project.curveRenderer.renderSolidLine(startView, endView, edgeColor, lineWidth);
      }
      // 画箭头（使用 arrowType 控制形状）
      const arrowType = edge.arrowType || "default";
      const edgeWidth = 2;
      const arrowSize = 8 * edgeWidth;
      if (edge.arrow === "inner") {
        // 箭头指向中心
        const direction = toCenterPoint.subtract(targetPoint).normalize();
        this.project.edgeRenderer.renderArrowByType(
          toCenterPoint,
          targetPoint,
          direction,
          arrowSize,
          edgeColor,
          arrowType,
          edgeWidth,
        );
      } else if (edge.arrow === "outer") {
        // 箭头指向节点
        const direction = targetPoint.subtract(toCenterPoint).normalize();
        this.project.edgeRenderer.renderArrowByType(
          targetPoint,
          toCenterPoint,
          direction,
          arrowSize,
          edgeColor,
          arrowType,
          edgeWidth,
        );
      }
    }
  }

  private renderConvexShape(edge: MultiTargetUndirectedEdge, edgeColor: Color): void {
    // 凸包渲染
    let convexPoints: Vector[] = [];
    edge.associationList.map((node) => {
      const nodeRectangle = node.collisionBox.getRectangle().expandFromCenter(edge.padding);
      convexPoints.push(nodeRectangle.leftTop);
      convexPoints.push(nodeRectangle.rightTop);
      convexPoints.push(nodeRectangle.rightBottom);
      convexPoints.push(nodeRectangle.leftBottom);
    });
    if (edge.text !== "") {
      const textRectangle = edge.textRectangle.expandFromCenter(edge.padding);
      convexPoints.push(textRectangle.leftTop);
      convexPoints.push(textRectangle.rightTop);
      convexPoints.push(textRectangle.rightBottom);
      convexPoints.push(textRectangle.leftBottom);
    }
    convexPoints = ConvexHull.computeConvexHull(convexPoints);
    // 保证首尾相接
    convexPoints.push(convexPoints[0]);
    const lineType = edge.lineType || "solid";
    const strokeWidth = this.project.camera.currentScale <= 0.065 ? 8 : 8 * this.project.camera.currentScale;
    const viewPoints = convexPoints.map((point) => this.project.renderer.transformWorld2View(point));
    if (lineType === "dashed") {
      const dashLen = 10 * this.project.camera.currentScale;
      this.project.canvas.ctx.setLineDash([dashLen, dashLen]);
      this.project.curveRenderer.renderSolidLineMultiple(viewPoints, edgeColor.toNewAlpha(0.5), strokeWidth);
      this.project.canvas.ctx.setLineDash([]);
    } else if (lineType === "double") {
      // 双线：绘制两次，略微偏移
      const gap = 5 * this.project.camera.currentScale;
      for (let i = 0; i < viewPoints.length - 1; i++) {
        this.project.curveRenderer.renderDoubleLine(
          viewPoints[i],
          viewPoints[i + 1],
          edgeColor.toNewAlpha(0.5),
          strokeWidth / 4,
          gap,
        );
      }
    } else {
      this.project.curveRenderer.renderSolidLineMultiple(viewPoints, edgeColor.toNewAlpha(0.5), strokeWidth);
    }
  }

  private renderCircle(edge: MultiTargetUndirectedEdge, edgeColor: Color): void {
    // 圆形渲染 - 使用最小的圆形套住所有实体
    if (edge.associationList.length === 0) {
      return;
    }

    // 计算包围所有实体的最小圆
    const allPoints: Vector[] = [];
    edge.associationList.map((node) => {
      const nodeRectangle = node.collisionBox.getRectangle().expandFromCenter(edge.padding);
      allPoints.push(nodeRectangle.leftTop);
      allPoints.push(nodeRectangle.rightTop);
      allPoints.push(nodeRectangle.rightBottom);
      allPoints.push(nodeRectangle.leftBottom);
    });

    if (edge.text !== "") {
      const textRectangle = edge.textRectangle.expandFromCenter(edge.padding);
      allPoints.push(textRectangle.leftTop);
      allPoints.push(textRectangle.rightTop);
      allPoints.push(textRectangle.rightBottom);
      allPoints.push(textRectangle.leftBottom);
    }

    // 计算圆心（使用所有点的中心点）
    const center = Vector.averageMultiple(allPoints);

    // 计算最大距离作为半径
    let maxDistance = 0;
    for (const point of allPoints) {
      const distance = center.distance(point);
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }

    const strokeWidth = this.project.camera.currentScale <= 0.065 ? 8 : 8 * this.project.camera.currentScale;
    const lineType = edge.lineType || "solid";
    const viewCenter = this.project.renderer.transformWorld2View(center);
    const viewRadius = maxDistance * this.project.camera.currentScale;

    if (lineType === "dashed") {
      const dashLen = 10 * this.project.camera.currentScale;
      this.project.canvas.ctx.setLineDash([dashLen, dashLen]);
      this.project.shapeRenderer.renderCircle(
        viewCenter,
        viewRadius,
        Color.Transparent,
        edgeColor.toNewAlpha(0.5),
        strokeWidth,
      );
      this.project.canvas.ctx.setLineDash([]);
    } else if (lineType === "double") {
      const gap = 5 * this.project.camera.currentScale;
      // 内圆
      this.project.shapeRenderer.renderCircle(
        viewCenter,
        viewRadius - gap / 2,
        Color.Transparent,
        edgeColor.toNewAlpha(0.5),
        strokeWidth / 4,
      );
      // 外圆
      this.project.shapeRenderer.renderCircle(
        viewCenter,
        viewRadius + gap / 2,
        Color.Transparent,
        edgeColor.toNewAlpha(0.5),
        strokeWidth / 4,
      );
    } else {
      // 绘制圆形
      this.project.shapeRenderer.renderCircle(
        viewCenter,
        viewRadius,
        Color.Transparent,
        edgeColor.toNewAlpha(0.5),
        strokeWidth,
      );
    }
  }
}
