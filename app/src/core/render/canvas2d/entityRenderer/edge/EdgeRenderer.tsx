import { Color } from "@graphif/color";

import { CubicCatmullRomSplineEdge } from "@/core/stage/stageObject/association/CubicCatmullRomSplineEdge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Vector } from "@graphif/data-structures";

import { Project, service } from "@/core/Project";
import { StraightEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/StraightEdgeRenderer";
import { SymmetryCurveEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/SymmetryCurveEdgeRenderer";
import { VerticalPolyEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/VerticalPolyEdgeRenderer";
import { EdgeRendererClass } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRendererClass";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";

/**
 * 边的总渲染器单例
 */
@service("edgeRenderer")
export class EdgeRenderer {
  // let currentRenderer = new StraightEdgeRenderer();
  private currentRenderer: EdgeRendererClass;

  /**
   * 初始化边的渲染器
   */
  constructor(private readonly project: Project) {
    this.currentRenderer = this.project.symmetryCurveEdgeRenderer;
    Settings.watch("lineStyle", this.updateRenderer.bind(this));
  }

  checkRendererBySettings(lineStyle: Settings["lineStyle"]) {
    if (lineStyle === "straight") {
      this.currentRenderer = this.project.straightEdgeRenderer;
    } else if (lineStyle === "bezier") {
      this.currentRenderer = this.project.symmetryCurveEdgeRenderer;
    }
  }

  /**
   * 更新渲染器
   */
  async updateRenderer(style: Settings["lineStyle"]) {
    if (style === "straight" && !(this.currentRenderer instanceof StraightEdgeRenderer)) {
      this.currentRenderer = this.project.straightEdgeRenderer;
    } else if (style === "bezier" && !(this.currentRenderer instanceof SymmetryCurveEdgeRenderer)) {
      this.currentRenderer = this.project.symmetryCurveEdgeRenderer;
    } else if (style === "vertical" && !(this.currentRenderer instanceof VerticalPolyEdgeRenderer)) {
      this.currentRenderer = this.project.verticalPolyEdgeRenderer;
    }
  }

  renderLineEdge(edge: LineEdge) {
    if (edge.source.isHiddenBySectionCollapse && edge.target.isHiddenBySectionCollapse) {
      return;
    }

    edge = this.getEdgeView(edge);

    const source = edge.source;
    const target = edge.target;

    if (source.uuid == target.uuid) {
      this.currentRenderer.renderCycleState(edge);
    } else {
      if (edge.isShifting) {
        this.currentRenderer.renderShiftingState(edge);
      } else {
        this.currentRenderer.renderNormalState(edge);
      }
    }

    // 选中的高亮效果
    if (edge.isSelected) {
      this.project.collisionBoxRenderer.render(
        edge.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
      // 还要标注起始点和终止点
      this.project.shapeRenderer.renderCircle(
        this.project.renderer.transformWorld2View(edge.sourceLocation),
        10 * this.project.camera.currentScale,
        Color.Transparent,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
        2 * this.project.camera.currentScale,
      );
      this.project.shapeRenderer.renderCircle(
        this.project.renderer.transformWorld2View(edge.targetLocation),
        10 * this.project.camera.currentScale,
        Color.Transparent,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
        2 * this.project.camera.currentScale,
      );
      // 画一个虚线
      this.project.curveRenderer.renderDashedLine(
        this.project.renderer.transformWorld2View(edge.sourceLocation),
        this.project.renderer.transformWorld2View(edge.targetLocation),
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
        2 * this.project.camera.currentScale,
        10 * this.project.camera.currentScale,
      );
    }
  }

  renderCrEdge(edge: CubicCatmullRomSplineEdge) {
    if (edge.source.isHiddenBySectionCollapse && edge.target.isHiddenBySectionCollapse) {
      return;
    }
    const crShape = edge.getShape();
    const edgeColor = edge.color.a === 0 ? this.project.stageStyleManager.currentStyle.StageObjectBorder : edge.color;
    // 画曲线
    this.project.worldRenderUtils.renderCubicCatmullRomSpline(crShape, edgeColor, 2);
    if (edge.isSelected) {
      this.project.collisionBoxRenderer.render(
        edge.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }
    // 画控制点们
    for (const point of crShape.controlPoints) {
      this.project.shapeRenderer.renderCircle(
        this.project.renderer.transformWorld2View(point),
        5 * this.project.camera.currentScale,
        Color.Transparent,
        edgeColor,
        2 * this.project.camera.currentScale,
      );
    }
    // 画文字
    if (edge.text !== "") {
      const textRect = edge.textRectangle;
      this.project.shapeRenderer.renderRect(
        this.project.renderer.transformWorld2View(textRect),
        this.project.stageStyleManager.currentStyle.Background,
        Color.Transparent,
        0,
      );
      this.project.textRenderer.renderMultiLineTextFromCenter(
        edge.text,
        this.project.renderer.transformWorld2View(textRect.center),
        Renderer.FONT_SIZE * this.project.camera.currentScale,
        Infinity,
        edgeColor,
      );
    }
    // 画箭头
    const { location, direction } = edge.getArrowHead();
    this.renderArrowHead(location, direction.normalize(), 15, edgeColor);
  }

  /**
   * 当一个内部可连接实体被外部连接但它的父级section折叠了
   * 通过这个函数能获取它的最小非折叠父级
   * 可以用于连线的某一端被折叠隐藏了的情况
   * @param innerEntity
   */
  getMinNonCollapseParentSection(innerEntity: ConnectableEntity): Section {
    const father = this.project.sectionMethods.getFatherSections(innerEntity);
    if (father.length === 0) {
      // 直接抛出错误
      throw new Error("Can't find parent section");
    }
    const minSection = father[0];
    if (minSection.isHiddenBySectionCollapse) {
      return this.getMinNonCollapseParentSection(minSection);
    } else {
      return minSection;
    }
  }

  getEdgeView(edge: LineEdge): LineEdge {
    if (edge.source.isHiddenBySectionCollapse && edge.target.isHiddenBySectionCollapse) {
      return edge;
    } else if (!edge.source.isHiddenBySectionCollapse && !edge.target.isHiddenBySectionCollapse) {
      return edge;
    }

    if (edge.source.isHiddenBySectionCollapse) {
      return new LineEdge(this.project, {
        associationList: [this.getMinNonCollapseParentSection(edge.source), edge.target],
        text: edge.text,
        uuid: edge.uuid,
      });
    }
    if (edge.target.isHiddenBySectionCollapse) {
      return new LineEdge(this.project, {
        associationList: [edge.source, this.getMinNonCollapseParentSection(edge.target)],
        text: edge.text,
        uuid: edge.uuid,
      });
    }
    return edge;
  }

  getEdgeSvg(edge: LineEdge): React.ReactNode {
    if (edge.source.isHiddenBySectionCollapse && edge.target.isHiddenBySectionCollapse) {
      return <></>;
    }

    if (edge.source.uuid == edge.target.uuid) {
      return this.currentRenderer.getCycleStageSvg(edge);
    } else {
      if (edge.isShifting) {
        return this.currentRenderer.getShiftingStageSvg(edge);
      } else {
        return this.currentRenderer.getNormalStageSvg(edge);
      }
    }
  }

  renderVirtualEdge(startNode: ConnectableEntity, mouseLocation: Vector) {
    this.currentRenderer.renderVirtualEdge(startNode, mouseLocation);
  }
  renderVirtualConfirmedEdge(startNode: ConnectableEntity, endNode: ConnectableEntity) {
    this.currentRenderer.renderVirtualConfirmedEdge(startNode, endNode);
  }

  getCuttingEffects(edge: Edge) {
    return this.currentRenderer.getCuttingEffects(edge);
  }
  getConnectedEffects(startNode: ConnectableEntity, toNode: ConnectableEntity) {
    return this.currentRenderer.getConnectedEffects(startNode, toNode);
  }

  /**
   * 绘制箭头
   * @param endPoint 世界坐标
   * @param direction
   * @param size
   */
  renderArrowHead(endPoint: Vector, direction: Vector, size: number, color: Color) {
    const reDirection = direction.clone().multiply(-1);
    const location2 = endPoint.add(reDirection.multiply(size).rotateDegrees(15));
    const location3 = endPoint.add(reDirection.multiply(size * 0.5));
    const location4 = endPoint.add(reDirection.multiply(size).rotateDegrees(-15));
    this.project.shapeRenderer.renderPolygonAndFill(
      [
        this.project.renderer.transformWorld2View(endPoint),
        this.project.renderer.transformWorld2View(location2),
        this.project.renderer.transformWorld2View(location3),
        this.project.renderer.transformWorld2View(location4),
      ],
      color,
      color,
      0,
    );
  }

  /**
   * 生成箭头的SVG多边形
   * @param endPoint 世界坐标
   * @param direction
   * @param size
   * @returns SVG多边形字符串
   */
  generateArrowHeadSvg(endPoint: Vector, direction: Vector, size: number, edgeColor: Color): React.ReactNode {
    const reDirection = direction.clone().multiply(-1);
    const location2 = endPoint.add(reDirection.multiply(size).rotateDegrees(15));
    const location3 = endPoint.add(reDirection.multiply(size * 0.5));
    const location4 = endPoint.add(reDirection.multiply(size).rotateDegrees(-15));

    // 将计算得到的点转换为 SVG 坐标
    const pointsString = [endPoint, location2, location3, location4]
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ");

    // 返回SVG多边形字符串
    return <polygon points={pointsString} fill={edgeColor.toString()} stroke={edgeColor.toString()} />;
  }
}
