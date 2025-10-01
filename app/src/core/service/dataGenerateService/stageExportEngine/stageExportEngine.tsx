import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { TextNode } from "@/core/sprites/TextNode";
import { EntityDetailsTool } from "../../dataManageService/entityDetailsService/entityDetailsTool";

/**
 * 专注于导出各种格式内容的引擎
 * （除了svg）
 */
@service("stageExport")
export class StageExport {
  constructor(private readonly project: Project) {}

  /**
   * 格式：
   * A
   * B
   * C
   *
   * A --> B
   * A --> C
   * B -xx-> C
   *
   * @param nodes 传入的是选中了的节点
   * @returns
   */
  public getPlainTextByEntities(nodes: Entity[]) {
    let nodesContent = "";
    let linksContent = "";
    for (const node of nodes) {
      if (!(node instanceof TextNode)) {
        continue;
      }
      nodesContent += node.text + "\n";
      if (EntityDetailsTool.from(node).isNotEmpty()) {
        nodesContent += "\t" + EntityDetailsTool.from(node).toMarkdown() + "\n";
      }
      const childTextNodes = this.project.graphMethods
        .nodeChildrenArray(node)
        .filter((node) => node instanceof TextNode)
        .filter((node) => nodes.includes(node));
      for (const child of childTextNodes) {
        const link = this.project.graphMethods.getEdgeFromTwoEntity(node, child);
        if (link) {
          linksContent += `${node.text} -${link.text}-> ${child.text}\n`;
        } else {
          linksContent += `${node.text} --> ${child.text}\n`;
        }
      }
      // childTextNodes.forEach((child) => {
      //   linksContent += `${node.text} --> ${child.text}\n`;
      // });
    }
    return nodesContent + "\n" + linksContent;
  }

  public getMarkdownStringByTextNode(textNode: TextNode) {
    return this.getTreeTypeString(textNode, this.getNodeMarkdown);
  }

  public getTabStringByTextNode(textNode: TextNode) {
    return this.getTreeTypeString(textNode, this.getTabText);
  }

  /**
   * 树形遍历节点
   * @param textNode
   * @param nodeToStringFunc
   * @returns
   */
  getTreeTypeString(textNode: TextNode, nodeToStringFunc: (node: TextNode, level: number) => string) {
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
  private getNodeChildrenArray(node: TextNode): ConnectableEntity[] {
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

  private getNodeMarkdown(node: TextNode, level: number): string {
    let stringResult = "";
    if (level < 6) {
      stringResult += `${"#".repeat(level)} ${node.text}\n\n`;
    } else {
      stringResult += `**${node.text}**\n\n`;
    }
    if (EntityDetailsTool.from(node).isNotEmpty()) {
      stringResult += `${EntityDetailsTool.from(node).toMarkdown()}\n\n`;
    }
    return stringResult;
  }

  private getTabText(node: TextNode, level: number): string {
    let stringResult = "";
    stringResult += `${"\t".repeat(Math.max(level - 1, 0))}${node.text}\n`;
    if (EntityDetailsTool.from(node).isNotEmpty()) {
      stringResult += `${"\t".repeat(level)}${EntityDetailsTool.from(node).toMarkdown()}\n`;
    }
    return stringResult;
  }
}
