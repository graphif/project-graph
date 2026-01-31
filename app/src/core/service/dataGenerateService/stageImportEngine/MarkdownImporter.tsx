import type { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { MonoStack } from "@graphif/data-structures";
import { Vector } from "@graphif/data-structures";
import { parseMarkdownToJSON, type MarkdownNode } from "@/utils/markdownParse";
import { BaseImporter } from "./BaseImporter";
import { Rectangle } from "@graphif/shapes";

/**
 * Markdown 导入器
 * 将 Markdown 格式文本转换为节点树结构
 * 支持标题层级（#, ##, ###）
 */
export class MarkdownImporter extends BaseImporter {
  constructor(project: Project) {
    super(project);
  }

  /**
   * 导入 Markdown 文本并生成节点树
   * @param markdownText Markdown 格式文本
   * @param diffLocation 偏移位置
   */
  public import(markdownText: string, diffLocation: Vector = Vector.getZero()): void {
    const markdownJson = parseMarkdownToJSON(markdownText);

    const monoStack = new MonoStack<TextNode>();
    const rootNode = new TextNode(this.project, {
      text: "root",
      collisionBox: new CollisionBox([new Rectangle(diffLocation, Vector.same(100))]),
    });
    monoStack.push(rootNode, -1);
    this.project.stageManager.add(rootNode);

    let yIndex = 0;

    const visitFunction = (markdownNode: MarkdownNode, deepLevel: number) => {
      const node = new TextNode(this.project, {
        text: markdownNode.title,
        details: DetailsManager.markdownToDetails(markdownNode.content),
        collisionBox: new CollisionBox([
          new Rectangle(diffLocation.add(new Vector(deepLevel * 50, yIndex * 100)), Vector.same(100)),
        ]),
      });
      this.project.stageManager.add(node);
      yIndex++;

      // 检查栈，保持一个严格单调栈
      if (monoStack.peek()) {
        monoStack.push(node, deepLevel);
        const fatherNode = monoStack.unsafeGet(monoStack.length - 2);
        // 创建从父节点右侧到子节点左侧的连线
        const newEdge = new LineEdge(this.project, {
          associationList: [fatherNode, node],
          targetRectangleRate: new Vector(0.01, 0.5), // 目标节点左侧边缘
          sourceRectangleRate: new Vector(0.99, 0.5), // 源节点右侧边缘
        });
        this.project.stageManager.add(newEdge);
      }
    };

    // 递归遍历 Markdown 节点树
    const dfsMarkdownNode = (markdownNode: MarkdownNode, deepLevel: number) => {
      // 访问当前节点
      visitFunction(markdownNode, deepLevel);
      // 递归访问子节点
      for (const child of markdownNode.children) {
        dfsMarkdownNode(child, deepLevel + 1);
      }
    };

    // 遍历所有根节点
    for (const markdownNode of markdownJson) {
      dfsMarkdownNode(markdownNode, 0);
    }

    // 记录历史
    this.project.historyManager.recordStep();
  }
}
