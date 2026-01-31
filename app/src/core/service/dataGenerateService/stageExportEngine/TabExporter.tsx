import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { BaseExporter } from "./BaseExporter";

/**
 * Tab 缩进格式导出器
 * 将节点导出为层次化的 Tab 缩进格式
 */
export class TabExporter extends BaseExporter {
  /**
   * 将文本节点及其子节点导出为 Tab 缩进格式
   * @param textNode 要导出的根文本节点
   * @returns Tab 缩进格式字符串
   */
  public export(textNode: TextNode): string {
    return this.getTreeTypeString(textNode, this.getTabText.bind(this));
  }

  /**
   * 将单个节点转换为 Tab 缩进格式
   * @param node 文本节点
   * @param level 缩进层级
   * @returns 该节点的 Tab 缩进字符串
   */
  private getTabText(node: TextNode, level: number): string {
    let stringResult = "";
    stringResult += `${"\t".repeat(Math.max(level - 1, 0))}${node.text}\n`;
    if (!node.detailsManager.isEmpty()) {
      stringResult += `${"\t".repeat(level)}${DetailsManager.detailsToMarkdown(node.details)}\n`;
    }
    return stringResult;
  }
}
