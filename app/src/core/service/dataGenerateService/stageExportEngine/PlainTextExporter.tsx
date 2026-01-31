import type { Project } from "@/core/Project";
import type { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";

/**
 * 纯文本格式导出器
 *
 * 格式：
 * A
 * B
 * C
 *
 * A --> B
 * A --> C
 * B -xx-> C
 */
export class PlainTextExporter {
  constructor(private readonly project: Project) {}

  /**
   * 将实体导出为纯文本格式
   * @param nodes 要导出的选中实体
   * @returns 纯文本表示
   */
  public export(nodes: Entity[]): string {
    let nodesContent = "";
    let linksContent = "";
    for (const node of nodes) {
      if (!(node instanceof TextNode)) {
        continue;
      }
      nodesContent += node.text + "\n";
      if (!node.detailsManager.isEmpty()) {
        nodesContent += "\t" + DetailsManager.detailsToMarkdown(node.details) + "\n";
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
    }
    return nodesContent + "\n" + linksContent;
  }
}
