import { Project } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";

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
}
