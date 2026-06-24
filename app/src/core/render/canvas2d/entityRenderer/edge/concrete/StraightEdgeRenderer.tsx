import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Line } from "@graphif/shapes";
import { Project, service } from "@/core/Project";
import { CircleFlameEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleFlameEffect";
import { EdgeCutEffect } from "@/core/service/feedbackService/effectEngine/concrete/EdgeCutEffect";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { SvgUtils } from "@/core/render/svg/SvgUtils";
import { EdgeRendererClass } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRendererClass";

/**
 * 直线渲染器
 */
@service("straightEdgeRenderer")
export class StraightEdgeRenderer extends EdgeRendererClass {
  constructor(private readonly project: Project) {
    super();
  }

  getCuttingEffects(edge: LineEdge): Effect[] {
    return [
      EdgeCutEffect.default(
        edge.bodyLine.start,
        edge.bodyLine.end,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
        2,
      ),
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

    const isCenterRate = (r: Vector): boolean => r.x === 0.5 && r.y === 0.5;

    const sourceRect = startNode.collisionBox.getRectangle();
    const targetRect = toNode.collisionBox.getRectangle();
    const sourceInner = sourceRect.getInnerLocationByRateVector(sourceRate);
    const targetInner = targetRect.getInnerLocationByRateVector(targetRate);
    const line = new Line(sourceInner, targetInner);

    let start: Vector;
    if (startNode instanceof ConnectPoint) {
      start = startNode.geometryCenter;
    } else if (!isCenterRate(sourceRate)) {
      start = Edge.getExactEdgePositionByRate(sourceRect, sourceRate) ?? sourceInner;
    } else {
      start = sourceRect.getLineIntersectionPoint(line);
    }

    let end: Vector;
    if (toNode instanceof ConnectPoint) {
      end = toNode.geometryCenter;
    } else if (!isCenterRate(targetRate)) {
      end = Edge.getExactEdgePositionByRate(targetRect, targetRate) ?? targetInner;
    } else {
      end = targetRect.getLineIntersectionPoint(line);
    }

    return [
      new CircleFlameEffect(
        new ProgressNumber(0, 15),
        start,
        80,
        this.project.stageStyleManager.currentStyle.effects.successShadow.clone(),
      ),
      new LineCuttingEffect(
        new ProgressNumber(0, 30),
        start,
        end,
        this.project.stageStyleManager.currentStyle.effects.successShadow.clone(),
        this.project.stageStyleManager.currentStyle.effects.successShadow.clone(),
        20,
      ),
    ];
  }

  private renderLine(start: Vector, end: Vector, edge: LineEdge, width: number): void {
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;

    const lineType = edge.lineType || "solid";
    if (lineType === "dashed") {
      this.project.curveRenderer.renderDashedLine(start, end, edgeColor, width, 10 * this.project.camera.currentScale);
    } else if (lineType === "double") {
      this.project.curveRenderer.renderDoubleLine(start, end, edgeColor, width, 5 * this.project.camera.currentScale);
    } else {
      this.project.curveRenderer.renderSolidLine(start, end, edgeColor, width);
    }
  }

  public renderNormalState(edge: LineEdge): void {
    // 直线绘制
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;

    let edgeWidth = 2;
    if (edge.source instanceof TextNode) {
      edgeWidth = edge.source.getBorderWidth();
    }
    const straightBodyLine = edge.bodyLine;
    const scaledWidth = edgeWidth * this.project.camera.currentScale;

    this.renderLine(
      this.project.renderer.transformWorld2View(straightBodyLine.start),
      this.project.renderer.transformWorld2View(straightBodyLine.end),
      edge,
      scaledWidth,
    );

    if (edge.text.trim() !== "") {
      this.project.textRenderer.renderMultiLineTextFromCenterWithStroke(
        edge.text,
        this.project.renderer.transformWorld2View(straightBodyLine.midPoint()),
        edge.textFontSize * this.project.camera.currentScale,
        edgeColor,
        this.project.stageStyleManager.currentStyle.Background,
      );
    }
    if (this.shouldRenderTargetArrow(edge)) {
      // 画箭头
      this.renderArrowHead(
        edge,
        straightBodyLine.end.subtract(straightBodyLine.start).normalize(),
        straightBodyLine.end.clone(),
        8 * edgeWidth,
      );
    }
  }

  public getNormalStageSvg(edge: LineEdge): React.ReactNode {
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;
    const lineBody = SvgUtils.line(edge.bodyLine.start, edge.bodyLine.end, edgeColor, 2);

    let textNode: React.ReactNode = <></>;
    if (edge.text.trim() !== "") {
      textNode = SvgUtils.textFromCenterWithStroke(
        edge.text,
        edge.bodyLine.midPoint(),
        edge.textFontSize,
        edgeColor,
        this.project.stageStyleManager.currentStyle.Background,
      );
    }
    // 加箭头
    const arrowHead = this.shouldRenderTargetArrow(edge)
      ? this.project.edgeRenderer.generateArrowHeadSvg(
          edge.bodyLine.end.clone(),
          edge.target.collisionBox
            .getRectangle()
            .getCenter()
            .subtract(edge.source.collisionBox.getRectangle().getCenter())
            .normalize(),
          15,
          edgeColor,
        )
      : null;
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

  private renderArrowHead(edge: LineEdge, direction: Vector, endPoint = edge.bodyLine.end.clone(), size = 15) {
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;
    this.project.edgeRenderer.renderArrowHead(endPoint, direction, size, edgeColor);
  }

  private shouldRenderTargetArrow(edge: LineEdge): boolean {
    return !(Settings.hideArrowWhenPointingToConnectPoint && edge.target instanceof ConnectPoint);
  }

  public renderShiftingState(edge: LineEdge): void {
    const shiftingMidPoint = edge.shiftingMidPoint;
    // 从source.Center到shiftingMidPoint的线
    const sourceRectangle = edge.source.collisionBox.getRectangle();
    const targetRectangle = edge.target.collisionBox.getRectangle();
    const startLine = new Line(
      sourceRectangle.getInnerLocationByRateVector(edge.sourceRectangleRate),
      shiftingMidPoint,
    );
    const endLine = new Line(shiftingMidPoint, targetRectangle.getInnerLocationByRateVector(edge.targetRectangleRate));
    const startPoint = sourceRectangle.getLineIntersectionPoint(startLine);
    const endPoint = targetRectangle.getLineIntersectionPoint(endLine);
    const scaledWidth = 2 * this.project.camera.currentScale;

    this.renderLine(
      this.project.renderer.transformWorld2View(startPoint),
      this.project.renderer.transformWorld2View(shiftingMidPoint),
      edge,
      scaledWidth,
    );
    this.renderLine(
      this.project.renderer.transformWorld2View(shiftingMidPoint),
      this.project.renderer.transformWorld2View(endPoint),
      edge,
      scaledWidth,
    );

    if (edge.text.trim() !== "") {
      const edgeColor = edge.color.equals(Color.Transparent)
        ? this.project.stageStyleManager.currentStyle.StageObjectBorder
        : edge.color;
      this.project.textRenderer.renderMultiLineTextFromCenterWithStroke(
        edge.text,
        this.project.renderer.transformWorld2View(shiftingMidPoint),
        edge.textFontSize * this.project.camera.currentScale,
        edgeColor,
        this.project.stageStyleManager.currentStyle.Background,
      );
    }
    if (this.shouldRenderTargetArrow(edge)) {
      this.renderArrowHead(
        edge,
        edge.target.collisionBox.getRectangle().getCenter().subtract(shiftingMidPoint).normalize(),
        endPoint,
      );
    }
  }

  public renderCycleState(edge: LineEdge): void {
    // 自环
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;
    this.project.shapeRenderer.renderArc(
      this.project.renderer.transformWorld2View(edge.target.collisionBox.getRectangle().location),
      (edge.target.collisionBox.getRectangle().size.y / 2) * this.project.camera.currentScale,
      Math.PI / 2,
      0,
      edgeColor,
      2 * this.project.camera.currentScale,
    );
    // 画箭头
    if (this.shouldRenderTargetArrow(edge)) {
      this.renderArrowHead(
        edge,
        new Vector(1, 0).rotateDegrees(15),
        edge.target.collisionBox.getRectangle().leftCenter,
      );
    }
    // 画文字
    if (edge.text.trim() === "") {
      // 没有文字的边
      return;
    }
    this.project.textRenderer.renderTextFromCenter(
      edge.text,
      this.project.renderer.transformWorld2View(
        edge.target.collisionBox.getRectangle().location.add(new Vector(0, -50)),
      ),
      edge.textFontSize * this.project.camera.currentScale,
      edgeColor,
    );
  }

  public renderVirtualEdge(startNode: ConnectableEntity, mouseLocation: Vector, sourceRectangleRate?: Vector): void {
    const rate = sourceRectangleRate ?? Vector.same(0.5);
    const startRect = startNode.collisionBox.getRectangle();

    const isCenterRate = (r: Vector): boolean => r.x === 0.5 && r.y === 0.5;

    const startInner = startRect.getInnerLocationByRateVector(rate);
    let start: Vector;
    if (startNode instanceof ConnectPoint) {
      start = startNode.geometryCenter;
    } else if (!isCenterRate(rate)) {
      start = Edge.getExactEdgePositionByRate(startRect, rate) ?? startInner;
    } else {
      start = startRect.getLineIntersectionPoint(new Line(startInner, mouseLocation));
    }

    const end = mouseLocation;
    const color = this.project.stageStyleManager.currentStyle.StageObjectBorder;
    this.project.curveRenderer.renderGradientLine(
      this.project.renderer.transformWorld2View(start),
      this.project.renderer.transformWorld2View(end),
      color.toTransparent(),
      color,
      2,
    );

    const direction = end.subtract(start);
    if (direction.magnitude() > 0) {
      this.project.edgeRenderer.renderArrowHead(end, direction.normalize(), 15, color);
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

    const isCenterRate = (r: Vector): boolean => r.x === 0.5 && r.y === 0.5;

    const startInner = startRect.getInnerLocationByRateVector(sourceRate);
    const endInner = endRect.getInnerLocationByRateVector(targetRate);
    const line = new Line(startInner, endInner);

    let start: Vector;
    if (startNode instanceof ConnectPoint) {
      start = startNode.geometryCenter;
    } else if (!isCenterRate(sourceRate)) {
      start = Edge.getExactEdgePositionByRate(startRect, sourceRate) ?? startInner;
    } else {
      start = startRect.getLineIntersectionPoint(line);
    }

    let end: Vector;
    if (endNode instanceof ConnectPoint) {
      end = endNode.geometryCenter;
    } else if (!isCenterRate(targetRate)) {
      end = Edge.getExactEdgePositionByRate(endRect, targetRate) ?? endInner;
    } else {
      end = endRect.getLineIntersectionPoint(line);
    }

    const colorStart = this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.5);
    const colorEnd = this.project.stageStyleManager.currentStyle.effects.successShadow.toSolid();
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
