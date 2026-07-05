import { Color, Vector } from "@graphif/data-structures";

import { ArcEdge } from "@/core/stage/stageObject/association/ArcEdge";
import { CubicCatmullRomSplineEdge } from "@/core/stage/stageObject/association/CubicCatmullRomSplineEdge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";

import { Project, service } from "@/core/Project";
import { StraightEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/StraightEdgeRenderer";
import { SymmetryCurveEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/SymmetryCurveEdgeRenderer";
import { VerticalPolyEdgeRenderer } from "@/core/render/canvas2d/entityRenderer/edge/concrete/VerticalPolyEdgeRenderer";
import { EdgeRendererClass } from "@/core/render/canvas2d/entityRenderer/edge/EdgeRendererClass";
import { renderArcEdge } from "@/core/render/canvas2d/entityRenderer/edge/renderArcEdge";
import { renderCrEdge } from "@/core/render/canvas2d/entityRenderer/edge/renderCrEdge";
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

    if (source.uuid === target.uuid) {
      this.currentRenderer.renderCycleState(edge);
    } else {
      if (edge.shiftingIndex !== 0) {
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
    renderCrEdge(this.project, edge, this.renderArrowHead.bind(this));
  }

  renderArcEdge(edge: ArcEdge) {
    renderArcEdge(this.project, edge, (endPoint, direction, size, color) => {
      const edgeWidth = size / 8;
      const sourceDirection = edge.getSourceDirection().normalize();
      this.renderArrowByType(
        endPoint,
        edge.clippedStart,
        direction,
        size,
        color,
        edge.arrowType || "default",
        edgeWidth,
        sourceDirection,
      );
    });
  }

  /**
   * 当一个内部可连接实体被外部连接但它的父级section折叠了
   * 通过这个函数能获取它的最小非折叠父级
   * 可以用于连线的某一端被折叠隐藏了的情况
   * @param innerEntity
   */
  getMinNonCollapseParentSection(innerEntity: ConnectableEntity): Section {
    let current = innerEntity.parentSection;
    if (!current) {
      throw new Error("Can't find parent section");
    }
    while (current.isHiddenBySectionCollapse) {
      if (!current.parentSection) {
        return current;
      }
      current = current.parentSection;
    }
    return current;
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

    if (edge.source.uuid === edge.target.uuid) {
      return this.currentRenderer.getCycleStageSvg(edge);
    } else {
      if (edge.shiftingIndex !== 0) {
        return this.currentRenderer.getShiftingStageSvg(edge);
      } else {
        return this.currentRenderer.getNormalStageSvg(edge);
      }
    }
  }

  renderVirtualEdge(startNode: ConnectableEntity, mouseLocation: Vector, sourceRectangleRate?: Vector) {
    this.currentRenderer.renderVirtualEdge(startNode, mouseLocation, sourceRectangleRate);
  }
  renderVirtualConfirmedEdge(
    startNode: ConnectableEntity,
    endNode: ConnectableEntity,
    sourceRectangleRate?: Vector,
    targetRectangleRate?: Vector,
  ) {
    this.currentRenderer.renderVirtualConfirmedEdge(startNode, endNode, sourceRectangleRate, targetRectangleRate);
  }

  getCuttingEffects(edge: Edge) {
    return this.currentRenderer.getCuttingEffects(edge);
  }
  getConnectedEffects(
    startNode: ConnectableEntity,
    toNode: ConnectableEntity,
    sourceRectangleRate?: Vector,
    targetRectangleRate?: Vector,
  ) {
    return this.currentRenderer.getConnectedEffects(startNode, toNode, sourceRectangleRate, targetRectangleRate);
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
   * 根据 arrowType 绘制 target 端箭头/装饰
   * @param endPoint 世界坐标（target 端）
   * @param startPoint 世界坐标（source 端节点边缘，用于菱形绘制起点）
   * @param direction 箭头方向（归一化，target 端朝向）
   * @param size 箭头尺寸（= 8 * edgeWidth）
   * @param color 颜色
   * @param arrowType 箭头类型
   * @param edgeWidth 线宽（世界坐标，用于描边粗细同步）
   * @param sourceDirection source 端离开节点的方向（归一化），供菱形使用；缺省时从 startPoint→endPoint 推算
   */
  renderArrowByType(
    endPoint: Vector,
    startPoint: Vector,
    direction: Vector,
    size: number,
    color: Color,
    arrowType: string,
    edgeWidth: number = 2,
    sourceDirection?: Vector,
  ) {
    // 菱形方向：优先用调用方传入的 sourceDirection，否则从 startPoint→endPoint 推算
    const diamondDirection = sourceDirection
      ? sourceDirection.clone().normalize()
      : endPoint.subtract(startPoint).normalize();

    switch (arrowType) {
      case "hollow-triangle":
        this.renderHollowTriangleArrow(endPoint, direction, size, color, edgeWidth);
        break;
      case "filled-triangle":
        this.renderFilledTriangleArrow(endPoint, direction, size, color);
        break;
      case "hollow-diamond":
        this.renderDiamondAtSource(startPoint, diamondDirection, size, color, false, edgeWidth);
        break;
      case "filled-diamond":
        this.renderDiamondAtSource(startPoint, diamondDirection, size, color, true, edgeWidth);
        break;
      default:
        // "default"：原有燕尾箭头
        this.renderArrowHead(endPoint, direction, size, color);
        break;
    }
  }

  /**
   * 空心三角形箭头（UML 继承/实现）
   * 尖部 30°（两侧各 15°），比燕尾更尖锐更长
   * 填充舞台背景色，遮住穿过三角形内部的线体
   */
  private renderHollowTriangleArrow(
    endPoint: Vector,
    direction: Vector,
    size: number,
    color: Color,
    edgeWidth: number,
  ) {
    const triSize = size * 1.8;
    const reDirection = direction.clone().multiply(-1);
    const left = endPoint.add(reDirection.multiply(triSize).rotateDegrees(15));
    const right = endPoint.add(reDirection.multiply(triSize).rotateDegrees(-15));
    const strokeWidth = edgeWidth * this.project.camera.currentScale;
    const bgColor = this.project.stageStyleManager.currentStyle.Background;
    this.project.shapeRenderer.renderPolygonAndFill(
      [
        this.project.renderer.transformWorld2View(endPoint),
        this.project.renderer.transformWorld2View(left),
        this.project.renderer.transformWorld2View(right),
      ],
      bgColor,
      color,
      strokeWidth,
    );
  }

  /**
   * 实心三角形箭头
   * 尖部 30°（两侧各 15°），比燕尾更尖锐更长
   */
  private renderFilledTriangleArrow(endPoint: Vector, direction: Vector, size: number, color: Color) {
    const triSize = size * 1.8;
    const reDirection = direction.clone().multiply(-1);
    const left = endPoint.add(reDirection.multiply(triSize).rotateDegrees(15));
    const right = endPoint.add(reDirection.multiply(triSize).rotateDegrees(-15));
    this.project.shapeRenderer.renderPolygonAndFill(
      [
        this.project.renderer.transformWorld2View(endPoint),
        this.project.renderer.transformWorld2View(left),
        this.project.renderer.transformWorld2View(right),
      ],
      color,
      color,
      0,
    );
  }

  /**
   * 在 source 端绘制菱形（聚合/组合）
   * 菱形完全在节点外部，内侧尖端（inner）贴住节点边缘
   * @param sourceEdgePoint source 端节点边缘世界坐标
   * @param direction 从 source 指向 target 的方向（归一化，即离开节点的方向）
   * @param size 菱形半轴长度
   * @param color 颜色
   * @param filled 是否实心
   * @param edgeWidth 线宽（世界坐标，用于描边粗细同步）
   */
  private renderDiamondAtSource(
    sourceEdgePoint: Vector,
    direction: Vector,
    size: number,
    color: Color,
    filled: boolean,
    edgeWidth: number,
  ) {
    // 菱形放大系数：让菱形比默认 size 更大
    const ds = size * 1.2;
    // 菱形完全在节点外部：
    // inner（内侧尖端）= 节点边缘，贴住节点
    // center（菱形中心）= 节点边缘 + direction * ds
    // tip（外侧尖端）= 节点边缘 + direction * ds * 2
    // left/right（两侧顶点）= center ± perp * ds * 0.5
    const inner = sourceEdgePoint;
    const center = sourceEdgePoint.add(direction.clone().multiply(ds));
    const tip = sourceEdgePoint.add(direction.clone().multiply(ds * 2));
    const perp = direction.clone().rotateDegrees(90);
    const left = center.add(perp.multiply(ds * 0.5));
    const right = center.add(perp.multiply(-ds * 0.5));
    const strokeWidth = edgeWidth * this.project.camera.currentScale;
    const bgColor = this.project.stageStyleManager.currentStyle.Background;
    this.project.shapeRenderer.renderPolygonAndFill(
      [
        this.project.renderer.transformWorld2View(inner),
        this.project.renderer.transformWorld2View(left),
        this.project.renderer.transformWorld2View(tip),
        this.project.renderer.transformWorld2View(right),
      ],
      filled ? color : bgColor,
      color,
      strokeWidth,
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
