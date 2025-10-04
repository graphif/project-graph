import { CircleFlameEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleFlameEffect";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Line, SymmetryCurve } from "@graphif/shapes";
// import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { Project, service } from "@/core/Project";
import { EdgeRendererClass } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRendererClass";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { SvgUtils } from "@/core/render/svg/SvgUtils";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";

/**
 * 贝塞尔曲线
 */
@service("symmetryCurveEdgeRenderer")
export class SymmetryCurveEdgeRenderer extends EdgeRendererClass {
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
  getConnectedEffects(startNode: ConnectableEntity, toNode: ConnectableEntity): Effect[] {
    return [
      new CircleFlameEffect(
        new ProgressNumber(0, 15),
        startNode.collisionBox.getRectangle().center,
        80,
        new Color(83, 175, 29, 1),
      ),
      new LineCuttingEffect(
        new ProgressNumber(0, 30),
        startNode.collisionBox.getRectangle().center,
        toNode.collisionBox.getRectangle().center,
        new Color(78, 201, 176, 1),
        new Color(83, 175, 29, 1),
        20,
      ),
    ];
  }

  public renderNormalState(edge: LineEdge): void {
    const start = edge.bodyLine.start;
    const end = edge.bodyLine.end;
    const startDirection =
      edge.source instanceof ConnectPoint
        ? Vector.getZero()
        : edge.source.collisionBox.getRectangle().getNormalVectorAt(start);
    const endDirection =
      edge.target instanceof ConnectPoint
        ? Vector.getZero()
        : edge.target.collisionBox.getRectangle().getNormalVectorAt(end);

    const curve = new SymmetryCurve(
      start,
      startDirection,
      end,
      endDirection,
      Math.min(300, Math.abs(end.subtract(start).magnitude()) / 2),
    );
    // 曲线模式先不屏蔽箭头，有点不美观，空出来一段距离
    this.renderArrowCurve(
      curve,
      edge.color.equals(Color.Transparent) ? this.project.stageStyleManager.currentStyle.StageObjectBorder : edge.color,
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
    );
    this.renderText(curve, edge);
  }

  public renderCycleState(edge: LineEdge): void {
    // 自环
    this.project.shapeRenderer.renderArc(
      this.project.renderer.transformWorld2View(edge.target.collisionBox.getRectangle().location),
      (edge.target.collisionBox.getRectangle().size.y / 2) * this.project.camera.currentScale,
      Math.PI / 2,
      0,
      edge.color.equals(Color.Transparent) ? this.project.stageStyleManager.currentStyle.StageObjectBorder : edge.color,
      2 * this.project.camera.currentScale,
    );
    // 画箭头
    {
      const size = 15;
      const direction = new Vector(1, 0).rotateDegrees(15);
      const endPoint = edge.target.collisionBox.getRectangle().leftCenter;
      this.project.edgeRenderer.renderArrowHead(
        endPoint,
        direction,
        size,
        edge.color.equals(Color.Transparent)
          ? this.project.stageStyleManager.currentStyle.StageObjectBorder
          : edge.color,
      );
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
  public renderVirtualEdge(startNode: ConnectableEntity, mouseLocation: Vector): void {
    const rect = startNode.collisionBox.getRectangle();
    const start = rect.getLineIntersectionPoint(new Line(rect.center, mouseLocation));
    const end = mouseLocation;
    const direction = end.subtract(start);
    const endDirection = new Vector(
      Math.abs(direction.x) >= Math.abs(direction.y) ? direction.x : 0,
      Math.abs(direction.x) >= Math.abs(direction.y) ? 0 : direction.y,
    )
      .normalize()
      .multiply(-1);
    this.renderArrowCurve(
      new SymmetryCurve(
        start,
        rect.getNormalVectorAt(start),
        end,
        endDirection,
        Math.abs(end.subtract(start).magnitude()) / 2,
      ),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
    );
  }

  public renderVirtualConfirmedEdge(startNode: ConnectableEntity, endNode: ConnectableEntity): void {
    const startRect = startNode.collisionBox.getRectangle();
    const endRect = endNode.collisionBox.getRectangle();
    const line = new Line(startRect.center, endRect.center);
    const start = startRect.getLineIntersectionPoint(line);
    const end = endRect.getLineIntersectionPoint(line);
    this.renderArrowCurve(
      new SymmetryCurve(
        start,
        startRect.getNormalVectorAt(start),
        end,
        endRect.getNormalVectorAt(end),
        Math.abs(end.subtract(start).magnitude()) / 2,
      ),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
    );
  }

  /**
   * 渲染curve及箭头,curve.end即箭头头部
   * @param curve
   */
  private renderArrowCurve(curve: SymmetryCurve, color: Color): void {
    // 绘制曲线本体
    curve.endDirection = curve.endDirection.normalize();
    const end = curve.end.clone();
    const size = 15; // 箭头大小
    curve.end = curve.end.subtract(curve.endDirection.multiply(size / -2));
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
    this.project.worldRenderUtils.renderSymmetryCurve(curve, color, 2);
    // 画箭头
    const endPoint = end.add(curve.endDirection.multiply(2));
    this.project.edgeRenderer.renderArrowHead(endPoint, curve.endDirection.multiply(-1), size, color);
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
    // 画文本底色
    this.project.shapeRenderer.renderRect(
      this.project.renderer.transformWorld2View(edge.textRectangle),
      this.project.stageStyleManager.currentStyle.Background.toNewAlpha(Settings.windowBackgroundAlpha),
      Color.Transparent,
      1,
    );

    this.project.textRenderer.renderTextFromCenter(
      edge.text,
      this.project.renderer.transformWorld2View(curve.bezier.getPointByT(0.5)),
      Renderer.FONT_SIZE * this.project.camera.currentScale,
      edge.color.equals(Color.Transparent) ? this.project.stageStyleManager.currentStyle.StageObjectBorder : edge.color,
    );
  }
}
