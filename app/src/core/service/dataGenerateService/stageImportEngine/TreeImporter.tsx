import type { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { MonoStack, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { BaseImporter } from "./BaseImporter";

/**
 * 树形结构导入器
 * 支持通过带有缩进格式的文本来增加节点
 * 格式：基于缩进的树形文本
 * 使用栈处理父子关系
 * 自动连接父子节点
 */
export class TreeImporter extends BaseImporter {
  constructor(project: Project) {
    super(project);
  }

  /**
   * 导入树形结构文本并生成节点
   * @param text 树形结构的格式文本
   * @param indention 缩进大小（空格数或Tab数）
   * @param diffLocation 偏移位置
   */
  public import(text: string, indention: number, diffLocation: Vector = Vector.getZero()): void {
    // 将本文转换成字符串数组，按换行符分割
    const lines = text.split("\n");

    // 准备好栈和根节点
    const rootNode = new TextNode(this.project, {
      text: "root",
      collisionBox: new CollisionBox([new Rectangle(diffLocation, Vector.same(100))]),
    });
    const nodeStack = new MonoStack<TextNode>();
    nodeStack.push(rootNode, -1);
    this.project.stageManager.add(rootNode);
    // 遍历每一行
    for (let yIndex = 0; yIndex < lines.length; yIndex++) {
      const line = lines[yIndex];
      // 跳过空行
      if (line.trim() === "") {
        continue;
      }
      // 解析缩进格式
      const indent = this.getIndentLevel(line, indention);
      // 解析文本内容
      const textContent = line.trim();

      const node = new TextNode(this.project, {
        text: textContent.replaceAll("\\t", "\t").replaceAll("\\n", "\n"),
        collisionBox: new CollisionBox([
          new Rectangle(diffLocation.add(new Vector(indent * 50, yIndex * 100)), Vector.same(100)),
        ]),
      });
      this.project.stageManager.add(node);

      // 检查栈
      // 保持一个严格单调栈
      if (nodeStack.peek()) {
        nodeStack.push(node, indent);
        const fatherNode = nodeStack.unsafeGet(nodeStack.length - 2);
        // 创建从父节点右侧到子节点左侧的连线
        const newEdge = new LineEdge(this.project, {
          associationList: [fatherNode, node],
          targetRectangleRate: new Vector(0.01, 0.5), // 目标节点左侧边缘
          sourceRectangleRate: new Vector(0.99, 0.5), // 源节点右侧边缘
        });
        this.project.stageManager.add(newEdge);
      }
    }
  }

  /**
   * 计算缩进层级
   * @param line 文本行
   * @param indention 缩进大小
   * @returns 缩进层级
   * @example
   * 'a' -> 0
   * '    a' -> 1
   * '\t\ta' -> 2
   */
  private getIndentLevel(line: string, indention: number): number {
    let indent = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === " ") {
        indent++;
      } else if (line[i] === "\t") {
        indent += indention;
      } else {
        break;
      }
    }
    return Math.floor(indent / indention);
  }
}
