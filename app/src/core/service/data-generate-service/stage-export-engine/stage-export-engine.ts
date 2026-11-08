import { Project, service } from "@/core/project";
import { Entity } from "@/core/stage/stage-object/abstract/stage-entity";
import { TextNode } from "@/core/stage/stage-object/entity/text-node";
import { PlainTextExporter } from "./plain-text-exporter";
import { MarkdownExporter } from "./markdown-exporter";
import { TabExporter } from "./tab-exporter";
import { MermaidExporter } from "./mermaid-exporter";
import { Settings } from "@/core/service/settings";

/**
 * 专注于导出各种格式内容的引擎
 * （除了svg）
 */
@service("stageExport")
export class StageExport {
  private readonly plainTextExporter: PlainTextExporter;
  private readonly markdownExporter: MarkdownExporter;
  private readonly tabExporter: TabExporter;
  private readonly mermaidExporter: MermaidExporter;

  constructor(project: Project) {
    this.plainTextExporter = new PlainTextExporter(project);
    this.markdownExporter = new MarkdownExporter(project);
    this.tabExporter = new TabExporter(project);
    this.mermaidExporter = new MermaidExporter(project);
  }

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
    return this.plainTextExporter.export(nodes);
  }

  public getMarkdownStringByTextNode(textNode: TextNode) {
    return this.markdownExporter.export(textNode);
  }

  public getTabStringByTextNode(textNode: TextNode) {
    return this.tabExporter.export(textNode);
  }

  /**
   * 格式：
   * ```mermaid
   * graph TD
   * A --> B
   * A --> C
   * B -- 连线文字 --> C
   * ```
   *
   * （TD）表示自上而下，LR表示自左而右
   * 使用 subgraph ... end 来定义子图。
   */
  public getMermaidTextByEntities(entities: Entity[]): string {
    return this.mermaidExporter.export(entities, Settings.exportMermaidIncludeNodeDetails);
  }
}
