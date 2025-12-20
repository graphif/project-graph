import { Project } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { Vector } from "@graphif/data-structures";
import { toast } from "sonner";

/**
 * 和连接相关的巧妙操作
 */
export namespace ConnectNodeSmartTools {
  /**
   * 向下连接
   * @param project
   * @returns
   */
  export function connectDown(project: Project) {
    const selectedNodes = project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    if (selectedNodes.length <= 1) return;
    selectedNodes.sort((a, b) => a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y);
    for (let i = 0; i < selectedNodes.length - 1; i++) {
      const fromNode = selectedNodes[i];
      const toNode = selectedNodes[i + 1];
      if (fromNode === toNode) continue;
      project.stageManager.connectEntity(fromNode, toNode, false);
    }
  }

  // 向右连接
  export function connectRight(project: Project) {
    const selectedNodes = project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    if (selectedNodes.length <= 1) return;
    selectedNodes.sort((a, b) => a.collisionBox.getRectangle().location.x - b.collisionBox.getRectangle().location.x);
    for (let i = 0; i < selectedNodes.length - 1; i++) {
      const fromNode = selectedNodes[i];
      const toNode = selectedNodes[i + 1];
      if (fromNode === toNode) continue;
      project.stageManager.connectEntity(fromNode, toNode, false);
    }
  }

  // 全连接
  export function connectAll(project: Project) {
    const selectedNodes = project.stageManager.getSelectedEntities();
    for (let i = 0; i < selectedNodes.length; i++) {
      for (let j = 0; j < selectedNodes.length; j++) {
        const fromNode = selectedNodes[i];
        const toNode = selectedNodes[j];
        if (fromNode === toNode) continue;
        if (fromNode instanceof ConnectableEntity && toNode instanceof ConnectableEntity) {
          project.stageManager.connectEntity(fromNode, toNode, false);
        }
      }
    }
  }

  /**
   * 把节点叠在父节点下游的一堆连线上，使用这个方法，就能把节点给插入这个地方
   * @param project
   */
  export function insertNodeToTree(project: Project) {
    const selectedEntities = project.stageManager
      .getSelectedEntities()
      .filter((node) => node instanceof ConnectableEntity);
    if (selectedEntities.length !== 1) {
      toast.error("树形接入时，选中的节点数量必须为1");
      return;
    }
    const selectedNode = selectedEntities[0];
    // 遍历所有LineEdge，检测碰撞
    const collideEdges: LineEdge[] = [];
    for (const lineEdge of project.stageManager.getLineEdges()) {
      if (lineEdge.collisionBox.isIntersectsWithRectangle(selectedNode.collisionBox.getRectangle())) {
        collideEdges.push(lineEdge);
      }
    }
    // 再检测一下，收集到的所有LineEdge是否是同一个
    const sourceUUIDList = collideEdges.map((edge) => edge.source.uuid);
    if (new Set(sourceUUIDList).size === 1) {
      // const sourceNode = collideEdges[0].source;
      // 检测是否有多个连线从同一个源节点出发
      const sourceNode = collideEdges[0].source;
      const isMultiEdgesFromSameSource = collideEdges.every((edge) => edge.source.uuid === sourceNode.uuid);

      // 保存原连线的属性
      const originalEdges = collideEdges.map((edge) => ({
        targetNode: edge.target,
        sourceRectangleRate: edge.sourceRectangleRate,
        targetRectangleRate: edge.targetRectangleRate,
        text: edge.text,
        color: edge.color,
      }));
      // 删除所有已有的连线
      collideEdges.forEach((edge) => project.stageManager.deleteAssociation(edge));

      if (isMultiEdgesFromSameSource) {
        // 从同一个源节点出发的多条连线，只创建一条源节点到新节点的连线
        project.stageManager.add(
          new LineEdge(project, {
            associationList: [sourceNode, selectedNode],
            text: originalEdges[0].text, // 使用第一条连线的文本
            sourceRectangleRate: originalEdges[0].sourceRectangleRate.clone(), // 继承源节点的端点格式
            targetRectangleRate: originalEdges[0].targetRectangleRate.clone(), // 左端点接收
            color: originalEdges[0].color.clone(),
          }),
        );

        // 创建从新节点到各个目标节点的连线
        originalEdges.forEach((originalEdge) => {
          project.stageManager.add(
            new LineEdge(project, {
              associationList: [selectedNode, originalEdge.targetNode],
              text: originalEdge.text,
              sourceRectangleRate: originalEdge.sourceRectangleRate.clone(),
              targetRectangleRate: originalEdge.targetRectangleRate.clone(), // 继承原连线的target端点格式
              color: originalEdge.color.clone(),
            }),
          );
        });
      } else {
        // 处理不同源节点的情况
        originalEdges.forEach((originalEdge) => {
          // source -> selected：保持原连线的source端点格式，target端使用左端点接收
          project.stageManager.add(
            new LineEdge(project, {
              associationList: [sourceNode, selectedNode],
              text: originalEdge.text,
              sourceRectangleRate: originalEdge.sourceRectangleRate.clone(),
              targetRectangleRate: originalEdge.targetRectangleRate.clone(),
              color: originalEdge.color.clone(),
            }),
          );
          // selected -> target：source端使用右端点发出，保持原连线的target端点格式
          project.stageManager.add(
            new LineEdge(project, {
              associationList: [selectedNode, originalEdge.targetNode],
              text: originalEdge.text,
              sourceRectangleRate: originalEdge.sourceRectangleRate.clone(),
              targetRectangleRate: originalEdge.targetRectangleRate.clone(),
              color: originalEdge.color.clone(),
            }),
          );
        });
      }

      project.historyManager.recordStep();
    } else {
      toast.error("树形接入时，这个选中的节点没有与任何连线相碰，或者所有相碰的连线源头不唯一");
    }
  }

  /**
   * 将选中的节点从树中移除，并重新连接其前后节点
   * @param project
   */
  export function removeNodeFromTree(project: Project) {
    const selectedEntities = project.stageManager
      .getSelectedEntities()
      .filter((node) => node instanceof ConnectableEntity);
    if (selectedEntities.length !== 1) {
      toast.error("树形摘除时，选中的节点数量必须为1");
      return;
    }
    const selectedNode = selectedEntities[0];

    // 找到选中节点的所有入边和出边
    const inEdges: LineEdge[] = project.stageManager.getLineEdges().filter((edge) => edge.target === selectedNode);
    const outEdges: LineEdge[] = project.stageManager.getLineEdges().filter((edge) => edge.source === selectedNode);

    if (inEdges.length === 0) {
      toast.error("树形摘除时，选中的节点没有入边");
      return;
    }

    // 保存入边的源节点和出边的目标节点及属性
    const sourceNodes = inEdges.map((edge) => ({
      node: edge.source,
      sourceRectangleRate: edge.sourceRectangleRate,
      text: edge.text,
      color: edge.color,
    }));
    const targetNodes = outEdges.map((edge) => ({
      node: edge.target,
      targetRectangleRate: edge.targetRectangleRate,
      text: edge.text,
      color: edge.color,
    }));

    // 删除所有入边和出边
    [...inEdges, ...outEdges].forEach((edge) => project.stageManager.deleteAssociation(edge));

    // 将入边的源节点直接连接到出边的目标节点
    sourceNodes.forEach((source) => {
      targetNodes.forEach((target) => {
        project.stageManager.add(
          new LineEdge(project, {
            associationList: [source.node, target.node],
            text: source.text || target.text,
            sourceRectangleRate: source.sourceRectangleRate,
            targetRectangleRate: target.targetRectangleRate,
            color: source.color || target.color,
          }),
        );
      });
    });

    // 将选中的节点从连线中跳出来，向上移动，移动距离等于节点高度
    const rectangle = selectedNode.collisionBox.getRectangle();
    const originalLocation = rectangle.location.clone();
    // 计算新位置：原位置向上移动节点高度，使新位置的底部边缘对齐原位置的顶部边缘
    const newLocation = new Vector(originalLocation.x, originalLocation.y - rectangle.size.y);
    selectedNode.moveTo(newLocation);
    project.historyManager.recordStep();
  }
}
