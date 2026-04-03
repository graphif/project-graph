import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Line } from "@graphif/shapes";
import { Project, service } from "@/core/Project";
import { CircleFlameEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleFlameEffect";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { SvgUtils } from "@/core/render/svg/SvgUtils";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { EdgeRendererClass } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRendererClass";

/**
 * 折线渲染器
 */
@service("verticalPolyEdgeRenderer")
export class VerticalPolyEdgeRenderer extends EdgeRendererClass {
  constructor(private readonly project: Project) {
    super();
  }

  getCuttingEffects(edge: LineEdge): Effect[] {
    const midLocation = edge.bodyLine.midPoint();
    return [
      new LineCuttingEffect(
        new ProgressNumber(0, 15),
        midLocation,
        edge.bodyLine.start,
        new Color(255, 0, 0, 1),
        new Color(255, 0, 0, 1),
        20,
      ),
      new LineCuttingEffect(
        new ProgressNumber(0, 15),
        midLocation,
        edge.bodyLine.end,
        new Color(255, 0, 0, 1),
        new Color(255, 0, 0, 1),
        20,
      ),
      new CircleFlameEffect(new ProgressNumber(0, 15), edge.bodyLine.midPoint(), 50, new Color(255, 0, 0, 1)),
    ];
  }

  getConnectedEffects(
    startNode: ConnectableEntity,
    toNode: ConnectableEntity,
    sourceRectangleRate?: Vector,
    targetRectangleRate?: Vector,
  ): Effect[] {
    const sourceRate = sourceRectangleRate ?? Vector.same(0.5);
    const targetRate = targetRectangleRate ?? Vector.same(0.5);

    const isOldDefaultRate = (r: Vector): boolean => {
      return (
        (r.x === 0.5 && r.y === 0.5) ||
        (r.x === 0.01 && r.y === 0.5) ||
        (r.x === 0.99 && r.y === 0.5) ||
        (r.x === 0.5 && r.y === 0.01) ||
        (r.x === 0.5 && r.y === 0.99)
      );
    };

    const sourceRect = startNode.collisionBox.getRectangle();
    const targetRect = toNode.collisionBox.getRectangle();
    const sourceInner = sourceRect.getInnerLocationByRateVector(sourceRate);
    const targetInner = targetRect.getInnerLocationByRateVector(targetRate);
    const line = new Line(sourceInner, targetInner);

    let start: Vector;
    if (startNode instanceof ConnectPoint) {
      start = startNode.geometryCenter;
    } else if (
      (startNode instanceof ImageNode || startNode.constructor.name === "ReferenceBlockNode") &&
      !isOldDefaultRate(sourceRate)
    ) {
      start = sourceInner;
    } else {
      start = sourceRect.getLineIntersectionPoint(line);
    }

    let end: Vector;
    if (toNode instanceof ConnectPoint) {
      end = toNode.geometryCenter;
    } else if (
      (toNode instanceof ImageNode || toNode.constructor.name === "ReferenceBlockNode") &&
      !isOldDefaultRate(targetRate)
    ) {
      end = targetInner;
    } else {
      end = targetRect.getLineIntersectionPoint(line);
    }

    return [
      new CircleFlameEffect(new ProgressNumber(0, 15), start, 80, new Color(83, 175, 29, 1)),
      new LineCuttingEffect(
        new ProgressNumber(0, 30),
        start,
        end,
        new Color(78, 201, 176, 1),
        new Color(83, 175, 29, 1),
        20,
      ),
    ];
  }

  /**
   * 起始点在目标点的哪个区域，返回起始点朝向终点的垂直向量
   *    上
   * 左 end 右
   *    下
   * 如果起点在左侧，返回 "->" 即 new Vector(1, 0)
   * @param edge
   * @returns
   */
  getVerticalDirection(edge: LineEdge): Vector {
    const startLocation = edge.source.collisionBox.getRectangle().center;
    const endLocation = edge.target.collisionBox.getRectangle().center;
    const startToEnd = endLocation.subtract(startLocation);
    if (startLocation.x < endLocation.x) {
      // |左侧
      if (startLocation.y < endLocation.y) {
        // |左上
        if (Math.abs(startToEnd.y) > Math.abs(startToEnd.x)) {
          // ↓
          return new Vector(0, 1);
        } else {
          // →
          return new Vector(1, 0);
        }
      } else {
        // |左下
        if (Math.abs(startToEnd.y) > Math.abs(startToEnd.x)) {
          // ↑
          return new Vector(0, -1);
        } else {
          // →
          return new Vector(1, 0);
        }
      }
    } else {
      // |右侧
      if (startLocation.y < endLocation.y) {
        // |右上
        if (Math.abs(startToEnd.y) > Math.abs(startToEnd.x)) {
          // ↓
          return new Vector(0, 1);
        } else {
          // ←
          return new Vector(-1, 0);
        }
      } else {
        // |右下
        if (Math.abs(startToEnd.y) > Math.abs(startToEnd.x)) {
          // ↑
          return new Vector(0, -1);
        } else {
          // ←
          return new Vector(-1, 0);
        }
      }
    }
  }

  /**
   * 固定长度
   */
  fixedLength: number = 100;

  // debug 测试
  renderTest(edge: LineEdge) {
    for (let i = 0; i < 4; i++) {
      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(edge.target.collisionBox.getRectangle().center),
        this.project.renderer.transformWorld2View(
          edge.target.collisionBox.getRectangle().center.add(new Vector(100, 0).rotateDegrees(45 + 90 * i)),
        ),
        Color.Green,
        1,
      );
    }
  }
  gaussianFunction(x: number) {
    // e ^(-x^2)
    return Math.exp(-(x * x) / 10000);
  }

  public renderNormalState(edge: LineEdge): void {
    // this.renderTest(edge);
    // 直线绘制
    if (edge.text.trim() === "") {
      const verticalDirection = this.getVerticalDirection(edge);
      if (verticalDirection.x === 0) {
        // 左右偏离程度

        const rate =
          1 -
          this.gaussianFunction(
            edge.target.collisionBox.getRectangle().center.x - edge.source.collisionBox.getRectangle().center.x,
          );
        // 左右偏离距离 恒正
        const distance = (rate * edge.target.collisionBox.getRectangle().size.x) / 2;
        // 根据偏移距离计算附加高度  恒正
        const h = (edge.target.collisionBox.getRectangle().size.x / 2) * (1 - rate);
        // 终点
        const p1 = new Vector(
          edge.target.collisionBox.getRectangle().center.x +
            distance *
              (edge.source.collisionBox.getRectangle().center.x > edge.target.collisionBox.getRectangle().center.x
                ? 1
                : -1),
          verticalDirection.y > 0
            ? edge.target.collisionBox.getRectangle().top
            : edge.target.collisionBox.getRectangle().bottom,
        );
        const length = (this.fixedLength + h) * (verticalDirection.y > 0 ? -1 : 1);
        const p2 = p1.add(new Vector(0, length));

        const p4 = new Vector(
          edge.source.collisionBox.getRectangle().center.x,
          verticalDirection.y > 0
            ? edge.source.collisionBox.getRectangle().bottom
            : edge.source.collisionBox.getRectangle().top,
        );

        const p3 = new Vector(p4.x, p2.y);
        this.project.curveRenderer.renderSolidLineMultiple(
          [
            this.project.renderer.transformWorld2View(p1),
            this.project.renderer.transformWorld2View(p2),
            this.project.renderer.transformWorld2View(p3),
            this.project.renderer.transformWorld2View(p4),
          ],
          new Color(204, 204, 204),
          2 * this.project.camera.currentScale,
        );

        if (!(edge.target instanceof ConnectPoint)) {
          this.project.edgeRenderer.renderArrowHead(p1, verticalDirection, 15, edge.color);
        }
      } else if (verticalDirection.y === 0) {
        // 左右
        const rate =
          1 -
          this.gaussianFunction(
            edge.target.collisionBox.getRectangle().center.y - edge.source.collisionBox.getRectangle().center.y,
          );
        // 偏离距离 恒正
        const distance = (rate * edge.target.collisionBox.getRectangle().size.y) / 2;
        // 根据偏移距离计算附加高度
        const h = (edge.target.collisionBox.getRectangle().size.y / 2) * (1 - rate);
        // 终点
        const p1 = new Vector(
          verticalDirection.x > 0
            ? edge.target.collisionBox.getRectangle().left
            : edge.target.collisionBox.getRectangle().right,
          edge.target.collisionBox.getRectangle().center.y +
            distance *
              (edge.source.collisionBox.getRectangle().center.y > edge.target.collisionBox.getRectangle().center.y
                ? 1
                : -1),
        );
        // length 是固定长度+h
        const length = (this.fixedLength + h) * (verticalDirection.x > 0 ? -1 : 1);
        const p2 = p1.add(new Vector(length, 0));

        const p4 = new Vector(
          verticalDirection.x > 0
            ? edge.source.collisionBox.getRectangle().right
            : edge.source.collisionBox.getRectangle().left,
          edge.source.collisionBox.getRectangle().center.y,
        );

        const p3 = new Vector(p2.x, p4.y);

        this.project.curveRenderer.renderSolidLineMultiple(
          [
            this.project.renderer.transformWorld2View(p1),
            this.project.renderer.transformWorld2View(p2),
            this.project.renderer.transformWorld2View(p3),
            this.project.renderer.transformWorld2View(p4),
          ],
          new Color(204, 204, 204),
          2 * this.project.camera.currentScale,
        );

        if (!(edge.target instanceof ConnectPoint)) {
          this.project.edgeRenderer.renderArrowHead(p1, verticalDirection, 15, edge.color);
        }
      } else {
        // 不会出现的情况
      }

      // 没有文字的边
      // this.project.curveRenderer.renderSolidLine(
      //  this.project.renderer.transformWorld2View(edge.bodyLine.start),
      //  this.project.renderer.transformWorld2View(edge.bodyLine.end),
      //   new Color(204, 204, 204),
      //   2 * this.project.camera.currentScale,
      // );
    } else {
      // 有文字的边
      const midPoint = edge.bodyLine.midPoint();
      const startHalf = new Line(edge.bodyLine.start, midPoint);
      const endHalf = new Line(midPoint, edge.bodyLine.end);
      this.project.textRenderer.renderTextFromCenter(
        edge.text,
        this.project.renderer.transformWorld2View(midPoint),
        Renderer.FONT_SIZE * this.project.camera.currentScale,
      );
      const edgeTextRectangle = edge.textRectangle;

      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(edge.bodyLine.start),
        this.project.renderer.transformWorld2View(edgeTextRectangle.getLineIntersectionPoint(startHalf)),
        new Color(204, 204, 204),
        2 * this.project.camera.currentScale,
      );
      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(edge.bodyLine.end),
        this.project.renderer.transformWorld2View(edgeTextRectangle.getLineIntersectionPoint(endHalf)),
        new Color(204, 204, 204),
        2 * this.project.camera.currentScale,
      );
      // 画箭头
      if (!(edge.target instanceof ConnectPoint)) {
        const size = 15;
        const direction = edge.target.collisionBox
          .getRectangle()
          .getCenter()
          .subtract(edge.source.collisionBox.getRectangle().getCenter())
          .normalize();
        const endPoint = edge.bodyLine.end.clone();
        this.project.edgeRenderer.renderArrowHead(endPoint, direction, size, edge.color);
      }
    }
  }
  public renderShiftingState(edge: LineEdge): void {
    const shiftingMidPoint = edge.shiftingMidPoint;
    // 从source.Center到shiftingMidPoint的线
    const startLine = new Line(edge.source.collisionBox.getRectangle().center, shiftingMidPoint);
    const endLine = new Line(shiftingMidPoint, edge.target.collisionBox.getRectangle().center);
    const startPoint = edge.source.collisionBox.getRectangle().getLineIntersectionPoint(startLine);
    const endPoint = edge.target.collisionBox.getRectangle().getLineIntersectionPoint(endLine);

    if (edge.text.trim() === "") {
      // 没有文字的边
      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(startPoint),
        this.project.renderer.transformWorld2View(shiftingMidPoint),
        new Color(204, 204, 204),
        2 * this.project.camera.currentScale,
      );
      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(shiftingMidPoint),
        this.project.renderer.transformWorld2View(endPoint),
        new Color(204, 204, 204),
        2 * this.project.camera.currentScale,
      );
    } else {
      // 有文字的边
      this.project.textRenderer.renderTextFromCenter(
        edge.text,
        this.project.renderer.transformWorld2View(shiftingMidPoint),
        Renderer.FONT_SIZE * this.project.camera.currentScale,
      );
      const edgeTextRectangle = edge.textRectangle;
      const start2MidPoint = edgeTextRectangle.getLineIntersectionPoint(startLine);
      const mid2EndPoint = edgeTextRectangle.getLineIntersectionPoint(endLine);
      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(startPoint),
        this.project.renderer.transformWorld2View(start2MidPoint),
        new Color(204, 204, 204),
        2 * this.project.camera.currentScale,
      );
      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(mid2EndPoint),
        this.project.renderer.transformWorld2View(endPoint),
        new Color(204, 204, 204),
        2 * this.project.camera.currentScale,
      );
    }
    this.renderArrowHead(
      edge,
      edge.target.collisionBox.getRectangle().getCenter().subtract(shiftingMidPoint).normalize(),
      endPoint,
    );
  }
  private renderArrowHead(edge: LineEdge, direction: Vector, endPoint = edge.bodyLine.end.clone()) {
    const size = 15;
    this.project.edgeRenderer.renderArrowHead(endPoint, direction, size, edge.color);
  }

  public renderCycleState(edge: LineEdge): void {
    // 自环
    this.project.shapeRenderer.renderArc(
      this.project.renderer.transformWorld2View(edge.target.collisionBox.getRectangle().location),
      (edge.target.collisionBox.getRectangle().size.y / 2) * this.project.camera.currentScale,
      Math.PI / 2,
      0,
      new Color(204, 204, 204),
      2 * this.project.camera.currentScale,
    );
    // 画箭头
    {
      const size = 15;
      const direction = new Vector(1, 0).rotateDegrees(15);
      const endPoint = edge.target.collisionBox.getRectangle().leftCenter;
      this.project.edgeRenderer.renderArrowHead(endPoint, direction, size, edge.color);
    }
  }
  public getNormalStageSvg(edge: LineEdge): React.ReactNode {
    let lineBody: React.ReactNode = <></>;
    let textNode: React.ReactNode = <></>;
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;
    if (edge.text.trim() === "") {
      // 没有文字的边
      lineBody = SvgUtils.line(edge.bodyLine.start, edge.bodyLine.end, edgeColor, 2);
    } else {
      // 有文字的边
      const midPoint = edge.bodyLine.midPoint();
      const startHalf = new Line(edge.bodyLine.start, midPoint);
      const endHalf = new Line(midPoint, edge.bodyLine.end);
      const edgeTextRectangle = edge.textRectangle;

      textNode = SvgUtils.textFromCenter(edge.text, midPoint, Renderer.FONT_SIZE, edgeColor);
      lineBody = (
        <>
          {SvgUtils.line(edge.bodyLine.start, edgeTextRectangle.getLineIntersectionPoint(startHalf), edgeColor, 2)}
          {SvgUtils.line(edge.bodyLine.end, edgeTextRectangle.getLineIntersectionPoint(endHalf), edgeColor, 2)}
        </>
      );
    }
    // 加箭头
    const arrowHead = this.project.edgeRenderer.generateArrowHeadSvg(
      edge.bodyLine.end.clone(),
      edge.target.collisionBox
        .getRectangle()
        .getCenter()
        .subtract(edge.source.collisionBox.getRectangle().getCenter())
        .normalize(),
      15,
      edgeColor,
    );
    return (
      <>
        {lineBody}
        {textNode}
        {arrowHead}
      </>
    );
  }
  public getCycleStageSvg(): React.ReactNode {
    return <></>;
  }
  public getShiftingStageSvg(): React.ReactNode {
    return <></>;
  }

  public renderVirtualEdge(startNode: ConnectableEntity, mouseLocation: Vector, sourceRectangleRate?: Vector): void {
    const rate = sourceRectangleRate ?? Vector.same(0.5);
    const startRect = startNode.collisionBox.getRectangle();

    const isOldDefaultRate = (r: Vector): boolean => {
      return (
        (r.x === 0.5 && r.y === 0.5) ||
        (r.x === 0.01 && r.y === 0.5) ||
        (r.x === 0.99 && r.y === 0.5) ||
        (r.x === 0.5 && r.y === 0.01) ||
        (r.x === 0.5 && r.y === 0.99)
      );
    };

    const startInner = startRect.getInnerLocationByRateVector(rate);
    let start: Vector;
    if (startNode instanceof ConnectPoint) {
      start = startNode.geometryCenter;
    } else if (
      (startNode instanceof ImageNode || startNode.constructor.name === "ReferenceBlockNode") &&
      !isOldDefaultRate(rate)
    ) {
      start = startInner;
    } else {
      start = startRect.getLineIntersectionPoint(new Line(startInner, mouseLocation));
    }

    const end = mouseLocation;
    const colorStart = new Color(255, 255, 255, 0);
    const colorEnd = new Color(255, 255, 255, 0.5);
    this.project.curveRenderer.renderGradientLine(
      this.project.renderer.transformWorld2View(start),
      this.project.renderer.transformWorld2View(end),
      colorStart,
      colorEnd,
      2,
    );

    const direction = end.subtract(start);
    if (direction.magnitude() > 0) {
      this.project.edgeRenderer.renderArrowHead(end, direction.normalize(), 15, colorEnd);
    }
  }

  public renderVirtualConfirmedEdge(
    startNode: ConnectableEntity,
    endNode: ConnectableEntity,
    sourceRectangleRate?: Vector,
    targetRectangleRate?: Vector,
  ): void {
    const sourceRate = sourceRectangleRate ?? Vector.same(0.5);
    const targetRate = targetRectangleRate ?? Vector.same(0.5);
    const startRect = startNode.collisionBox.getRectangle();
    const endRect = endNode.collisionBox.getRectangle();

    const isOldDefaultRate = (r: Vector): boolean => {
      return (
        (r.x === 0.5 && r.y === 0.5) ||
        (r.x === 0.01 && r.y === 0.5) ||
        (r.x === 0.99 && r.y === 0.5) ||
        (r.x === 0.5 && r.y === 0.01) ||
        (r.x === 0.5 && r.y === 0.99)
      );
    };

    const startInner = startRect.getInnerLocationByRateVector(sourceRate);
    const endInner = endRect.getInnerLocationByRateVector(targetRate);
    const line = new Line(startInner, endInner);

    let start: Vector;
    if (startNode instanceof ConnectPoint) {
      start = startNode.geometryCenter;
    } else if (
      (startNode instanceof ImageNode || startNode.constructor.name === "ReferenceBlockNode") &&
      !isOldDefaultRate(sourceRate)
    ) {
      start = startInner;
    } else {
      start = startRect.getLineIntersectionPoint(line);
    }

    let end: Vector;
    if (endNode instanceof ConnectPoint) {
      end = endNode.geometryCenter;
    } else if (
      (endNode instanceof ImageNode || endNode.constructor.name === "ReferenceBlockNode") &&
      !isOldDefaultRate(targetRate)
    ) {
      end = endInner;
    } else {
      end = endRect.getLineIntersectionPoint(line);
    }

    const colorStart = new Color(0, 255, 0, 0);
    const colorEnd = new Color(0, 255, 0, 0.5);
    this.project.curveRenderer.renderGradientLine(
      this.project.renderer.transformWorld2View(start),
      this.project.renderer.transformWorld2View(end),
      colorStart,
      colorEnd,
      2,
    );

    const direction = end.subtract(start);
    if (direction.magnitude() > 0) {
      this.project.edgeRenderer.renderArrowHead(end, direction.normalize(), 15, colorEnd);
    }
  }
}
