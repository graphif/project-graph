import { Vector } from "@graphif/data-structures";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";

/**
 * 不同类型的边的渲染器 基类
 *
 * 形态：
 *   正常形态
 *   自环形态
 *   偏移形态（未实现）
 *
 * 交互时状态 阴影：
 *   鼠标悬浮阴影
 *   选中阴影
 *   即将删除警告阴影
 *
 * 虚拟连线：
 *   鼠标拖拽时还未连接到目标
 *   鼠标拖拽时吸附到目标
 *
 * 特效：
 *   连接成功特效
 *   删除斩断特效
 */
export abstract class EdgeRendererClass {
  constructor() {}

  isCycleState(edge: LineEdge): boolean {
    return edge.target.uuid === edge.source.uuid;
  }
  isNormalState(edge: LineEdge): boolean {
    return !this.isCycleState(edge);
  }

  /**
   * 绘制正常看到的状态
   */
  public abstract renderNormalState(edge: LineEdge): void;

  /**
   * 绘制双向线的偏移状态
   */
  public abstract renderShiftingState(edge: LineEdge): void;

  /**
   * 绘制自环状态
   */
  public abstract renderCycleState(edge: LineEdge): void;

  public abstract getNormalStageSvg(edge: LineEdge): React.ReactNode;
  public abstract getShiftingStageSvg(edge: LineEdge): React.ReactNode;
  public abstract getCycleStageSvg(edge: LineEdge): React.ReactNode;

  /**
   * 绘制鼠标连线移动时的虚拟连线效果
   * @param startNode
   * @param mouseLocation 世界坐标系
   */
  public abstract renderVirtualEdge(
    startNode: ConnectableEntity,
    mouseLocation: Vector,
    sourceRectangleRate?: Vector,
  ): void;

  /**
   * 绘制鼠标连线移动到目标节点上吸附住 时候虚拟连线效果
   * @param startNode
   * @param endNode
   */
  public abstract renderVirtualConfirmedEdge(
    startNode: ConnectableEntity,
    endNode: ConnectableEntity,
    sourceRectangleRate?: Vector,
    targetRectangleRate?: Vector,
  ): void;
  /**
   * 获取这个线在切断时的特效
   * 外层将在切断时根据此函数来获取特效并自动加入到渲染器中
   */
  abstract getCuttingEffects(edge: Edge): Effect[];

  /**
   * 获取这个线在连接成功时的特效
   */
  abstract getConnectedEffects(startNode: ConnectableEntity, toNode: ConnectableEntity): Effect[];
}
