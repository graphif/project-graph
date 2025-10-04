import { Project, service } from "@/core/Project";
import { Entity } from "@/core/sprites/abstract/Entity";
import { CubicCatmullRomSplineEdge } from "@/core/stage/stageObject/association/CubicCatmullRomSplineEdge";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { ConnectPoint } from "@/core/stage/stageObject/entity/ConnectPoint";
import { Vector } from "@graphif/data-structures";

/**
 * 集成所有连线相关的功能
 */
@service("nodeConnector")
export class NodeConnector {
  constructor(private readonly project: Project) {}

  /**
   * 检测是否可以连接两个节点
   * @param fromNode
   * @param toNode
   */
  private isConnectable(fromNode: Entity, toNode: Entity): boolean {
    if (
      this.project.stageManager.isEntityExists(fromNode.uuid) &&
      this.project.stageManager.isEntityExists(toNode.uuid)
    ) {
      if (fromNode.uuid === toNode.uuid && fromNode instanceof ConnectPoint) {
        return false;
      }
      if (this.project.graphMethods.isConnected(fromNode, toNode)) {
        // 已经连接过了，不需要再次连接
        return false;
      }
      return true;
    } else {
      return false;
    }
  }

  /**
   * 如果两个节点都是同一个 ConnectPoint 对象类型，则不能连接，因为没有必要
   * @param fromNode
   * @param toNode
   * @param text
   * @returns
   */
  connectConnectableEntity(
    fromNode: Entity,
    toNode: Entity,
    text: string = "",
    targetRectRate?: [number, number],
    sourceRectRate?: [number, number],
  ): void {
    if (!this.isConnectable(fromNode, toNode)) {
      return;
    }
    const newEdge = new LineEdge(this.project, {
      associationList: [fromNode, toNode],
      text,
      targetRectangleRate: new Vector(...(targetRectRate || [0.5, 0.5])),
      sourceRectangleRate: new Vector(...(sourceRectRate || [0.5, 0.5])),
    });

    this.project.stageManager.add(newEdge);

    this.project.stageManager.updateReferences();
  }

  addCrEdge(fromNode: Entity, toNode: Entity): void {
    if (!this.isConnectable(fromNode, toNode)) {
      return;
    }
    const newEdge = CubicCatmullRomSplineEdge.fromTwoEntity(this.project, fromNode, toNode);
    this.project.stageManager.add(newEdge);
    this.project.stageManager.updateReferences();
  }

  // 将多个节点之间全连接

  // 反向连线
  reverseEdges(edges: LineEdge[]) {
    edges.forEach((edge) => {
      const oldSource = edge.source;
      edge.source = edge.target;
      edge.target = oldSource;
      const oldSourceRectRage = edge.sourceRectangleRate;
      edge.sourceRectangleRate = edge.targetRectangleRate;
      edge.targetRectangleRate = oldSourceRectRage;
    });
    this.project.stageManager.updateReferences();
  }

  /**
   * 单独改变一个节点的连接点
   * @param edge
   * @param newTarget
   * @returns
   */
  private changeEdgeTarget(edge: LineEdge, newTarget: Entity) {
    if (edge.target.uuid === newTarget.uuid) {
      return;
    }
    edge.target = newTarget;
    this.project.stageManager.updateReferences();
  }

  /**
   * 改变所有选中的连线的目标节点
   * @param newTarget
   */
  changeSelectedEdgeTarget(newTarget: Entity) {
    const selectedEdges = this.project.stageManager.getSelectedStageObjects().filter((obj) => obj instanceof LineEdge);
    for (const edge of selectedEdges) {
      if (edge instanceof LineEdge) {
        this.changeEdgeTarget(edge, newTarget);
      }
    }
    // https://github.com/graphif/project-graph/issues/522
    // this.project.historyManager.recordStep();
  }
}
