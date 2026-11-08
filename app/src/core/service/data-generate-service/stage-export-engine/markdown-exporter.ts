import type { TextNode } from "@/core/stage/stage-object/entity/text-node";
import { DetailsManager } from "@/core/stage/stage-object/tools/entity-details-manager";
import { BaseExporter } from "./base-exporter";

/**
 * Markdown 格式导出器
 * 将节点导出为带标题层级的层次化 Markdown 格式
 */
export class MarkdownExporter extends BaseExporter {
  /**
   * 将文本节点及其子节点导出为 Markdown 格式
   * @param textNode 要导出的根文本节点
   * @returns Markdown 格式字符串
   */
  public export(textNode: TextNode): string {
    return this.getTreeTypeString(textNode, this.getNodeMarkdown.bind(this));
  }

  /**
   * 将单个节点转换为 Markdown 格式
   * @param node 文本节点
   * @param level 标题层级 (1-6)
   * @returns 该节点的 Markdown 字符串
   */
  private getNodeMarkdown(node: TextNode, level: number): string {
    let stringResult = "";
    if (level <= 6) {
      stringResult += `${"#".repeat(level)} ${node.text}\n\n`;
    } else {
      stringResult += `**${node.text}**\n\n`;
    }
    if (!node.detailsManager.isEmpty()) {
      stringResult += `${DetailsManager.detailsToMarkdown(node.details)}\n\n`;
    }
    return stringResult;
  }
}
