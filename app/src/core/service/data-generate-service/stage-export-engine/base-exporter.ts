import type { Project } from "@/core/Project";
import type { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";

/**
 * 导出器基类，包含共享的工具方法
 */
export abstract class BaseExporter {
  constructor(protected readonly project: Project) {}

  /**
   * 树形遍历节点
   * @param textNode
   * @param nodeToStringFunc
   * @returns
   */
  protected getTreeTypeString(textNode: TextNode, nodeToStringFunc: (node: TextNode, level: number) => string) {
    let content = "";
    const visitedUUID = new Set<string>();

    const dfs = (node: TextNode, level: number) => {
      if (visitedUUID.has(node.uuid)) {
        return;
      }
      visitedUUID.add(node.uuid);
      content += nodeToStringFunc(node, level);
      const children = this.getNodeChildrenArray(node).filter((v) => v instanceof TextNode);
      for (const child of children) {
        dfs(child, level + 1);
      }
    };

    dfs(textNode, 1);
    return content;
  }

  /**
   * issue: #276 【细节优化】导出功能的排序逻辑，从连接顺序变为角度判断
   * @param node
   */
  protected getNodeChildrenArray(node: TextNode): ConnectableEntity[] {
    const result = this.project.graphMethods.nodeChildrenArray(node);
    // 如果全都在右侧或者左侧
    if (
      result.every((v) => v.geometryCenter.x > node.geometryCenter.x) ||
      result.every((v) => v.geometryCenter.x < node.geometryCenter.x)
    ) {
      // 则按从上到下的顺序排序
      return result.sort((a, b) => a.geometryCenter.y - b.geometryCenter.y);
    }
    // 如果全都在上侧或者下侧
    if (
      result.every((v) => v.geometryCenter.y > node.geometryCenter.y) ||
      result.every((v) => v.geometryCenter.y < node.geometryCenter.y)
    ) {
      // 则按从左到右的顺序排序
      return result.sort((a, b) => a.geometryCenter.x - b.geometryCenter.x);
    }
    // 按角度排序
    return result.sort((a, b) => {
      const angleA = Math.atan2(a.geometryCenter.y - node.geometryCenter.y, a.geometryCenter.x - node.geometryCenter.x);
      const angleB = Math.atan2(b.geometryCenter.y - node.geometryCenter.y, b.geometryCenter.x - node.geometryCenter.x);
      return angleA - angleB;
    });
  }
}
