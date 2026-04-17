import { Vector } from "@graphif/data-structures";
import { Project, service } from "@/core/Project";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";

@service("mouseInteraction")
export class MouseInteraction {
  constructor(private readonly project: Project) {}

  /**
   * 鼠标悬浮的边
   */
  private _hoverEdges: Edge[] = [];

  /** 鼠标悬浮的框 */
  // 2.0.22 开始，取消section悬浮状态，因为感觉没什么必要
  // 不不不，有必要，在界面缩小的时候点击式连线，能很方便的看到section的碰撞箱
  private _hoverSections: Section[] = [];

  // 2.0.22 开始，增加质点的悬浮状态
  private _hoverConnectPoints: ConnectPoint[] = [];
  /**
   * 鼠标悬浮的多边形边
   */
  private _hoverMultiTargetEdges: MultiTargetUndirectedEdge[] = [];

  get hoverEdges(): Edge[] {
    return this._hoverEdges;
  }

  get firstHoverEdge(): Edge | undefined {
    return this._hoverEdges.length > 0 ? this._hoverEdges[0] : undefined;
  }

  get hoverSections(): Section[] {
    return this._hoverSections;
  }

  get hoverConnectPoints(): ConnectPoint[] {
    return this._hoverConnectPoints;
  }

  get firstHoverSection(): Section | undefined {
    return this._hoverSections.length > 0 ? this._hoverSections[0] : undefined;
  }
  get hoverMultiTargetEdges(): MultiTargetUndirectedEdge[] {
    return this._hoverMultiTargetEdges;
  }

  get firstHoverMultiTargetEdge(): MultiTargetUndirectedEdge | undefined {
    return this._hoverMultiTargetEdges.length > 0 ? this._hoverMultiTargetEdges[0] : undefined;
  }

  /**
   * mousemove 事件触发此函数
   * 要确保此函数只会被外界的一个地方调用，因为mousemove事件会频繁触发
   * @param mouseWorldLocation
   */
  public updateByMouseMove(mouseWorldLocation: Vector): void {
    // 更新 Edge状态
    this._hoverEdges = [];
    for (const edge of this.project.stageManager.getEdges()) {
      if (edge.isHiddenBySectionCollapse) {
        continue;
      }
      if (edge.collisionBox.isContainsPoint(mouseWorldLocation)) {
        this._hoverEdges.push(edge);
      }
    }
    // 更新 MultiTargetUndirectedEdge状态
    this._hoverMultiTargetEdges = [];
    for (const edge of this.project.stageManager
      .getAssociations()
      .filter((association) => association instanceof MultiTargetUndirectedEdge)) {
      if (edge.collisionBox.isContainsPoint(mouseWorldLocation)) {
        this._hoverMultiTargetEdges.push(edge);
      }
    }

    // 更新 Section状态
    this._hoverSections = [];
    const sections = this.project.stageManager.getSections();

    for (const section of sections) {
      if (section.isHiddenBySectionCollapse) {
        continue;
      }
      if (section.collisionBox.isContainsPoint(mouseWorldLocation)) {
        this._hoverSections.push(section);
      }
    }

    // 更新质点的状态
    this._hoverConnectPoints = [];
    for (const connectPoint of this.project.stageManager.getConnectPoints()) {
      if (connectPoint.collisionBox.isContainsPoint(mouseWorldLocation)) {
        this._hoverConnectPoints.push(connectPoint);
      }
    }
  }
}
