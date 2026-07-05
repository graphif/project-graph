import { CircleFlameEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleFlameEffect";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { CubicBezierCurve, Line, SymmetryCurve } from "@graphif/shapes";
// import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { Project, service } from "@/core/Project";
import { EdgeRendererClass } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRendererClass";
import { SvgUtils } from "@/core/render/svg/SvgUtils";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";

/**
 * 贝塞尔曲线
 */
@service("symmetryCurveEdgeRenderer")
export class SymmetryCurveEdgeRenderer extends EdgeRendererClass {
  constructor(private readonly project: Project) {
    super();
  }

  private shouldRenderTargetArrow(edge: LineEdge): boolean {
    return !(Settings.hideArrowWhenPointingToConnectPoint && edge.target instanceof ConnectPoint);
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

  public renderNormalState(edge: LineEdge): void {
    const start = edge.bodyLine.start;
    const end = edge.bodyLine.end;

    // 计算连线方向
    const lineDirection = end.subtract(start).normalize();

    let startDirection: Vector;
    let endDirection: Vector;

    if (edge.source instanceof ConnectPoint) {
      const byRate = Edge.getNormalVectorByRate(edge.sourceRectangleRate);
      if (byRate !== null) {
        startDirection = byRate;
      } else {
        const center = edge.source.geometryCenter;
        const radial = start.subtract(center);
        startDirection = radial.magnitude() === 0 ? lineDirection : radial.normalize();
      }
    } else {
      const fromRate = Edge.getNormalVectorByRate(edge.sourceRectangleRate);
      if (fromRate !== null) {
        startDirection = fromRate;
      } else {
        // Center rate or image node interior: use intersection point's rect-edge normal,
        // falling back to line direction for interior image positions.
        const sourceRect = edge.source.collisionBox.getRectangle();
        const isSourceExactPosition =
          (edge.source instanceof ImageNode || edge.source.constructor.name === "ReferenceBlockNode") &&
          start.x !== sourceRect.left &&
          start.x !== sourceRect.right &&
          start.y !== sourceRect.top &&
          start.y !== sourceRect.bottom;
        startDirection = isSourceExactPosition ? lineDirection : sourceRect.getNormalVectorAt(start);
      }
    }

    if (edge.target instanceof ConnectPoint) {
      const byRate = Edge.getNormalVectorByRate(edge.targetRectangleRate);
      if (byRate !== null) {
        endDirection = byRate;
      } else {
        const center = edge.target.geometryCenter;
        const radial = end.subtract(center);
        endDirection = radial.magnitude() === 0 ? lineDirection.multiply(-1) : radial.normalize();
      }
    } else {
      const toRate = Edge.getNormalVectorByRate(edge.targetRectangleRate);
      if (toRate !== null) {
        endDirection = toRate;
      } else {
        const targetRect = edge.target.collisionBox.getRectangle();
        const isTargetExactPosition =
          (edge.target instanceof ImageNode || edge.target.constructor.name === "ReferenceBlockNode") &&
          end.x !== targetRect.left &&
          end.x !== targetRect.right &&
          end.y !== targetRect.top &&
          end.y !== targetRect.bottom;
        endDirection = isTargetExactPosition ? lineDirection.multiply(-1) : targetRect.getNormalVectorAt(end);
      }
    }

    let edgeWidth = 2;
    if (Settings.enableAutoEdgeWidth && edge.target instanceof Section && edge.source instanceof Section) {
      const rect1 = edge.source.collisionBox.getRectangle();
      const rect2 = edge.target.collisionBox.getRectangle();
      edgeWidth = Math.min(
        Math.min(Math.max(rect1.width, rect1.height), Math.max(rect2.width, rect2.height)) / 100,
        100,
      );
    } else if (edge.source instanceof TextNode) {
      edgeWidth = edge.source.getBorderWidth();
    }

    const curve = new SymmetryCurve(
      start,
      startDirection,
      end,
      endDirection,
      Math.max(edgeWidth * 25, Math.abs(Math.min(Math.abs(start.x - end.x), Math.abs(start.y - end.y))) / 2),
    );

    // 曲线模式先不屏蔽箭头，有点不美观，空出来一段距离
    this.renderArrowCurve(
      curve,
      edge.color.equals(Color.Transparent) ? this.project.stageStyleManager.currentStyle.StageObjectBorder : edge.color,
      edgeWidth,
      edge,
    );
    this.renderText(curve, edge);
  }

  public renderShiftingState(edge: LineEdge): void {
    const shiftingMidPoint = edge.shiftingMidPoint;
    const sourceRectangle = edge.source.collisionBox.getRectangle();
    const targetRectangle = edge.target.collisionBox.getRectangle();

    // 从source.Center到shiftingMidPoint的线
    const startLine = new Line(sourceRectangle.center, shiftingMidPoint);
    const endLine = new Line(shiftingMidPoint, edge.target.collisionBox.getRectangle().center);
    let startPoint = sourceRectangle.getLineIntersectionPoint(startLine);
    if (startPoint.equals(sourceRectangle.center)) {
      startPoint = sourceRectangle.getLineIntersectionPoint(endLine);
    }
    let endPoint = targetRectangle.getLineIntersectionPoint(endLine);
    if (endPoint.equals(targetRectangle.center)) {
      endPoint = targetRectangle.getLineIntersectionPoint(startLine);
    }
    const curve = new SymmetryCurve(
      startPoint,
      startLine.direction(),
      endPoint,
      endLine.direction().multiply(-1),
      Math.abs(endPoint.subtract(startPoint).magnitude()) / 2,
    );
    this.renderArrowCurve(
      curve,
      edge.color.equals(Color.Transparent) ? this.project.stageStyleManager.currentStyle.StageObjectBorder : edge.color,
      2,
      edge,
    );
    this.renderText(curve, edge);
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
    {
      const size = 15;
      const direction = new Vector(1, 0).rotateDegrees(15);
      const endPoint = edge.target.collisionBox.getRectangle().leftCenter;
      const edgeWidth = edge.source instanceof TextNode ? edge.source.getBorderWidth() : 2;
      this.project.edgeRenderer.renderArrowByType(
        endPoint,
        endPoint,
        direction,
        size,
        edgeColor,
        edge.arrowType || "default",
        edgeWidth,
      );
    }
    // 画文字
    if (edge.text.trim() === "") {
      return;
    }
    // 画文本底色
    this.project.shapeRenderer.renderRect(
      this.project.renderer.transformWorld2View(edge.textRectangle),
      this.project.stageStyleManager.currentStyle.Background.toNewAlpha(Settings.windowBackgroundAlpha),
      Color.Transparent,
      1,
    );
    this.project.textRenderer.renderMultiLineTextFromCenter(
      edge.text,
      this.project.renderer.transformWorld2View(
        edge.target.collisionBox.getRectangle().location.add(new Vector(0, -50)),
      ),
      edge.textFontSize * this.project.camera.currentScale,
      Infinity,
      edgeColor,
    );
  }
  public getNormalStageSvg(edge: LineEdge): React.ReactNode {
    let textNode: React.ReactNode = <></>;
    const edgeColor = edge.color.equals(Color.Transparent)
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : edge.color;

    const start = edge.bodyLine.start;
    const end = edge.bodyLine.end;

    // 计算连线方向
    const lineDirection = end.subtract(start).normalize();

    let startDirection: Vector;
    let endDirection: Vector;

    if (edge.source instanceof ConnectPoint) {
      startDirection = Vector.getZero();
    } else {
      const fromRate = Edge.getNormalVectorByRate(edge.sourceRectangleRate);
      if (fromRate !== null) {
        startDirection = fromRate;
      } else {
        const sourceRect = edge.source.collisionBox.getRectangle();
        const isSourceExactPosition =
          (edge.source instanceof ImageNode || edge.source.constructor.name === "ReferenceBlockNode") &&
          start.x !== sourceRect.left &&
          start.x !== sourceRect.right &&
          start.y !== sourceRect.top &&
          start.y !== sourceRect.bottom;
        startDirection = isSourceExactPosition ? lineDirection : sourceRect.getNormalVectorAt(start);
      }
    }

    if (edge.target instanceof ConnectPoint) {
      endDirection = Vector.getZero();
    } else {
      const toRate = Edge.getNormalVectorByRate(edge.targetRectangleRate);
      if (toRate !== null) {
        endDirection = toRate;
      } else {
        const targetRect = edge.target.collisionBox.getRectangle();
        const isTargetExactPosition =
          (edge.target instanceof ImageNode || edge.target.constructor.name === "ReferenceBlockNode") &&
          end.x !== targetRect.left &&
          end.x !== targetRect.right &&
          end.y !== targetRect.top &&
          end.y !== targetRect.bottom;
        endDirection = isTargetExactPosition ? lineDirection.multiply(-1) : targetRect.getNormalVectorAt(end);
      }
    }

    let svgEdgeWidth = 2;
    if (Settings.enableAutoEdgeWidth && edge.target instanceof Section && edge.source instanceof Section) {
      const rect1 = edge.source.collisionBox.getRectangle();
      const rect2 = edge.target.collisionBox.getRectangle();
      svgEdgeWidth = Math.min(
        Math.min(Math.max(rect1.width, rect1.height), Math.max(rect2.width, rect2.height)) / 100,
        100,
      );
    } else if (edge.source instanceof TextNode) {
      svgEdgeWidth = edge.source.getBorderWidth();
    }

    const curve = new SymmetryCurve(
      start,
      startDirection,
      end,
      endDirection,
      Math.max(svgEdgeWidth * 25, Math.abs(Math.min(Math.abs(start.x - end.x), Math.abs(start.y - end.y))) / 2),
    );

    const bezier = curve.bezier;

    // 箭头大小与线宽对应（和 renderArrowCurve 保持一致）
    const arrowSize = 8 * svgEdgeWidth;
    // curve.endDirection 是从节点指向曲线的方向（外侧方向）
    const curveEndDirection = curve.endDirection.normalize();
    // 箭头尖端精确落在节点边缘
    const arrowTip = end.clone();
    // 曲线终点应该在箭头尾部
    // 箭头尾部距离箭头尖端是 arrowSize/2，方向是外侧方向
    const adjustedEnd = arrowTip.add(curveEndDirection.multiply(arrowSize / 2));

    const adjustedBezier = new CubicBezierCurve(bezier.start, bezier.ctrlPt1, bezier.ctrlPt2, adjustedEnd);
    const lineBody = SvgUtils.bezierCurve(adjustedBezier, edgeColor, 2);

    if (edge.text.trim() !== "") {
      const midPoint = bezier.getPointByT(0.5);
      textNode = SvgUtils.textFromCenterWithStroke(
        edge.text,
        midPoint,
        edge.textFontSize,
        edgeColor,
        this.project.stageStyleManager.currentStyle.Background,
      );
    }

    // 加箭头（箭头尖端在 arrowTip，方向指向节点）
    const arrowHead = this.shouldRenderTargetArrow(edge)
      ? this.project.edgeRenderer.generateArrowHeadSvg(arrowTip, curveEndDirection.multiply(-1), arrowSize, edgeColor)
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
  public renderVirtualEdge(startNode: ConnectableEntity, mouseLocation: Vector, sourceRectangleRate?: Vector): void {
    const rect = startNode.collisionBox.getRectangle();
    const rate = sourceRectangleRate ?? Vector.same(0.5);

    const isCenterRate = (r: Vector): boolean => r.x === 0.5 && r.y === 0.5;

    const startInner = rect.getInnerLocationByRateVector(rate);
    const isStartExactPosition = !isCenterRate(rate);

    const start = isStartExactPosition
      ? (Edge.getExactEdgePositionByRate(rect, rate) ?? startInner)
      : rect.getLineIntersectionPoint(new Line(startInner, mouseLocation));
    const end = mouseLocation;
    const direction = end.subtract(start);
    const endDirection = new Vector(
      Math.abs(direction.x) >= Math.abs(direction.y) ? direction.x : 0,
      Math.abs(direction.x) >= Math.abs(direction.y) ? 0 : direction.y,
    )
      .normalize()
      .multiply(-1);
    const startDirection =
      Edge.getNormalVectorByRate(rate) ??
      (isStartExactPosition ? direction.normalize() : rect.getNormalVectorAt(start));
    this.renderArrowCurve(
      new SymmetryCurve(start, startDirection, end, endDirection, Math.abs(end.subtract(start).magnitude()) / 2),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
    );
  }

  public renderVirtualConfirmedEdge(
    startNode: ConnectableEntity,
    endNode: ConnectableEntity,
    sourceRectangleRate?: Vector,
    targetRectangleRate?: Vector,
  ): void {
    const startRect = startNode.collisionBox.getRectangle();
    const endRect = endNode.collisionBox.getRectangle();
    const sourceRate = sourceRectangleRate ?? Vector.same(0.5);
    const targetRate = targetRectangleRate ?? Vector.same(0.5);

    const isCenterRate = (r: Vector): boolean => r.x === 0.5 && r.y === 0.5;

    const startInner = startRect.getInnerLocationByRateVector(sourceRate);
    const endInner = endRect.getInnerLocationByRateVector(targetRate);
    const line = new Line(startInner, endInner);

    const isStartExactPosition = !isCenterRate(sourceRate);
    const isEndExactPosition = !isCenterRate(targetRate);

    const start = isStartExactPosition
      ? (Edge.getExactEdgePositionByRate(startRect, sourceRate) ?? startInner)
      : startRect.getLineIntersectionPoint(line);
    const end = isEndExactPosition
      ? (Edge.getExactEdgePositionByRate(endRect, targetRate) ?? endInner)
      : endRect.getLineIntersectionPoint(line);

    const lineDirection = end.subtract(start).normalize();
    const startDirection =
      Edge.getNormalVectorByRate(sourceRate) ??
      (isStartExactPosition ? lineDirection : startRect.getNormalVectorAt(start));
    const endDirection =
      Edge.getNormalVectorByRate(targetRate) ??
      (isEndExactPosition ? lineDirection.multiply(-1) : endRect.getNormalVectorAt(end));

    this.renderArrowCurve(
      new SymmetryCurve(start, startDirection, end, endDirection, Math.abs(end.subtract(start).magnitude()) / 2),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
    );
  }

  /**
   * 渲染curve及箭头,curve.end即箭头头部
   * @param curve
   */
  private renderArrowCurve(curve: SymmetryCurve, color: Color, width = 2, edge?: LineEdge): void {
    // 绘制曲线本体
    curve.endDirection = curve.endDirection.normalize();
    curve.startDirection = curve.startDirection.normalize();
    const end = curve.end.clone();
    const start = curve.start.clone();
    const startDirection = curve.startDirection.clone(); // source 端离开节点的方向
    const size = 8 * width; // 箭头大小

    // ── target 端偏移 ──
    // curve.endDirection 是从节点指向曲线外侧（离开节点）的方向。
    // subtract(endDirection * offset)：offset < 0 → 往外走，offset > 0 → 往内走
    const arrowType = edge?.arrowType || "default";
    let curveEndOffset: number;
    if (arrowType === "hollow-triangle" || arrowType === "filled-triangle") {
      const triSize = size * 1.8;
      curveEndOffset = -triSize; // 往外走，让曲线终点停在三角形底边处
    } else if (arrowType === "hollow-diamond" || arrowType === "filled-diamond") {
      curveEndOffset = 0; // 菱形在 source 端，target 端无装饰，直接连到节点边缘
    } else {
      curveEndOffset = size / -2; // default（燕尾）：往外推 size/2
    }
    curve.end = curve.end.subtract(curve.endDirection.multiply(curveEndOffset));

    // ── source 端偏移（仅菱形需要）──
    // 菱形的 tip（外侧尖端）在节点边缘外面 ds*2 处（ds = size*1.5）
    // 曲线起点需要延伸到 tip 处，与 renderDiamondAtSource 中的 ds 保持一致
    const ds = size * 1.2; // 与 renderDiamondAtSource 中的 ds 一致
    if (arrowType === "hollow-diamond" || arrowType === "filled-diamond") {
      // 曲线起点从节点边缘往外推到菱形 tip 处（ds*2）
      curve.start = curve.start.add(curve.startDirection.multiply(ds * 2));
    }
    // 绘制碰撞箱
    // const segment = 40;
    // let lastPoint = curve.start;
    // for (let i = 1; i <= segment; i++) {
    //   const line = new Line(lastPoint, curve.bezier.getPointByT(i / segment));
    //   CurveRenderer.renderSolidLine(
    //     Renderer.transformWorld2View(line.start),
    //     Renderer.transformWorld2View(line.end),
    //     new Color(0, 104, 0),
    //     10 * Camera.currentScale
    //   )
    //   lastPoint = line.end;
    // }
    // 根据 lineType 选择渲染方式
    const lineType = edge?.lineType || "solid";
    if (lineType === "dashed") {
      this.project.worldRenderUtils.renderDashedSymmetryCurve(
        curve,
        color,
        width,
        10 * this.project.camera.currentScale,
      );
    } else if (lineType === "double") {
      this.project.worldRenderUtils.renderDoubleSymmetryCurve(
        curve,
        color,
        width,
        5 * this.project.camera.currentScale,
      );
    } else {
      this.project.worldRenderUtils.renderSymmetryCurve(curve, color, width * this.project.camera.currentScale);
    }
    // 画箭头
    if (!edge || this.shouldRenderTargetArrow(edge)) {
      this.project.edgeRenderer.renderArrowByType(
        end,
        start, // source 节点边缘坐标，菱形从此处往外绘制
        curve.endDirection.multiply(-1),
        size,
        color,
        edge?.arrowType || "default",
        width,
        startDirection, // source 端离开节点的方向，供菱形使用
      );
    }

    if (Settings.showDebug) {
      const controlPoint1 = curve.bezier.ctrlPt1;
      const controlPoint2 = curve.bezier.ctrlPt2;
      this.project.shapeRenderer.renderCircle(
        this.project.renderer.transformWorld2View(controlPoint1),
        2 * this.project.camera.currentScale,
        Color.Transparent,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
        1 * this.project.camera.currentScale,
      );
      this.project.shapeRenderer.renderCircle(
        this.project.renderer.transformWorld2View(controlPoint2),
        2 * this.project.camera.currentScale,
        Color.Transparent,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
        1 * this.project.camera.currentScale,
      );
      this.project.curveRenderer.renderDashedLine(
        this.project.renderer.transformWorld2View(curve.start),
        this.project.renderer.transformWorld2View(controlPoint1),
        this.project.stageStyleManager.currentStyle.StageObjectBorder.toNewAlpha(0.2),
        1 * this.project.camera.currentScale,
        10 * this.project.camera.currentScale,
      );
      this.project.curveRenderer.renderDashedLine(
        this.project.renderer.transformWorld2View(curve.end),
        this.project.renderer.transformWorld2View(controlPoint2),
        this.project.stageStyleManager.currentStyle.StageObjectBorder.toNewAlpha(0.2),
        1 * this.project.camera.currentScale,
        10 * this.project.camera.currentScale,
      );
    }
  }
  // /**
  //  * 仅仅绘制曲线
  //  * @param curve
  //  */
  // private renderCurveOnly(curve: SymmetryCurve): void {
  //   // 绘制曲线本体
  //   curve.endDirection = curve.endDirection.normalize();
  //   const end = curve.end.clone();
  //   const size = 15; // 箭头大小
  //   curve.end = curve.end.subtract(curve.endDirection.multiply(size / -2));
  //   WorldRenderUtils.renderSymmetryCurve(curve, new Color(204, 204, 204), 2);
  // }

  private renderText(curve: SymmetryCurve, edge: LineEdge): void {
    if (edge.text.trim() === "") {
      return;
    }
    this.project.textRenderer.renderMultiLineTextFromCenterWithStroke(
      edge.text,
      this.project.renderer.transformWorld2View(curve.bezier.getPointByT(0.5)),
      edge.textFontSize * this.project.camera.currentScale,
      edge.color.equals(Color.Transparent) ? this.project.stageStyleManager.currentStyle.StageObjectBorder : edge.color,
      this.project.stageStyleManager.currentStyle.Background,
    );
  }
}
