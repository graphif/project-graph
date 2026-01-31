import { Project, service } from "@/core/Project";
import { Vector } from "@graphif/data-structures";
import { GraphImporter } from "./GraphImporter";
import { TreeImporter } from "./TreeImporter";
import { MermaidImporter } from "./MermaidImporter";
import { MarkdownImporter } from "./MarkdownImporter";

/**
 * 专注于从各种格式导入并生成节点的引擎
 */
@service("stageImport")
export class StageImport {
  private readonly graphImporter: GraphImporter;
  private readonly treeImporter: TreeImporter;
  private readonly mermaidImporter: MermaidImporter;
  private readonly markdownImporter: MarkdownImporter;

  constructor(readonly project: Project) {
    this.graphImporter = new GraphImporter(project);
    this.treeImporter = new TreeImporter(project);
    this.mermaidImporter = new MermaidImporter(project);
    this.markdownImporter = new MarkdownImporter(project);
  }

  /**
   * 通过纯文本生成网状结构
   * 格式：
   * - A --> B （连线上无文字）
   * - A -label-> B （连线上有文字）
   * - A （单独的节点）
   * @param text 网状结构的格式文本
   * @param diffLocation 偏移位置
   */
  public addNodeGraphByText(text: string, diffLocation: Vector = Vector.getZero()) {
    return this.graphImporter.import(text, diffLocation);
  }

  /**
   * 通过带有缩进格式的文本来增加节点
   * 格式：基于缩进的树形文本
   * @param text 树形结构的格式文本
   * @param indention 缩进大小（空格数或Tab数）
   * @param diffLocation 偏移位置
   */
  public addNodeTreeByText(text: string, indention: number, diffLocation: Vector = Vector.getZero()) {
    return this.treeImporter.import(text, indention, diffLocation);
  }

  /**
   * 根据 mermaid 文本生成框嵌套网状结构
   * 支持 graph TD 格式的 mermaid 文本
   * @param text Mermaid 格式文本
   * @param diffLocation 偏移位置
   * @example
   * graph TD;
   *   A[Section A] --> B[Section B];
   *   A --> C[C];
   *   B --> D[D];
   */
  public addNodeMermaidByText(text: string, diffLocation: Vector = Vector.getZero()) {
    return this.mermaidImporter.import(text, diffLocation);
  }

  /**
   * 根据 Markdown 文本生成节点树结构
   * 支持 Markdown 标题层级（#, ##, ###）
   * @param markdownText Markdown 格式文本
   * @param diffLocation 偏移位置
   * @example
   * # 标题1
   * ## 子标题1.1
   * ## 子标题1.2
   * # 标题2
   */
  public addNodeByMarkdown(markdownText: string, diffLocation: Vector = Vector.getZero()) {
    return this.markdownImporter.import(markdownText, diffLocation);
  }
}
