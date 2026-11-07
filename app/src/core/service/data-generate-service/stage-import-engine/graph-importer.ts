import type { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { BaseImporter } from "./BaseImporter";

/**
 * 图结构导入器
 * 支持通过纯文本生成网状结构
 * 格式：
 * - A --> B （连线上无文字）
 * - A -label-> B （连线上有文字）
 * - A （单独的节点）
 */
export class GraphImporter extends BaseImporter {
  constructor(project: Project) {
    super(project);
  }

  /**
   * 导入图结构文本并生成节点
   * 这个函数不稳定，可能会随时throw错误
   * @param text 网状结构的格式文本
   * @param diffLocation 偏移位置
   */
  public import(text: string, diffLocation: Vector = Vector.getZero()): void {
    const lines = text.split("\n");

    if (lines.length === 0) {
      return;
    }

    const randomRadius = 40 * lines.length;
    const nodeDict = new Map<string, TextNode>();

    const createNodeByName = (name: string) => {
      const node = new TextNode(this.project, {
        text: name,
        collisionBox: new CollisionBox([
          new Rectangle(
            diffLocation.add(new Vector(randomRadius * Math.random(), randomRadius * Math.random())),
            Vector.same(100),
          ),
        ]),
      });
      this.project.stageManager.add(node);
      nodeDict.set(name, node);
      return node;
    };

    for (const line of lines) {
      if (line.trim() === "") {
        continue;
      }
      if (line.includes("-->") || (line.includes("-") && line.includes("->"))) {
        // 这一行是一个关系行
        if (line.includes("-->")) {
          // 连线上无文字
          // 解析
          const names = line.split("-->");
          if (names.length !== 2) {
            throw new Error(`解析时出现错误: "${line}"，应该只有两个名称`);
          }
          const startName = names[0].trim();
          const endName = names[1].trim();
          if (startName === "" || endName === "") {
            throw new Error(`解析时出现错误: "${line}"，名称不能为空`);
          }
          let startNode = nodeDict.get(startName);
          let endNode = nodeDict.get(endName);
          if (!startNode) {
            startNode = createNodeByName(startName);
          }
          if (!endNode) {
            endNode = createNodeByName(endName);
          }
          this.project.nodeConnector.connectEntityFast(startNode, endNode);
        } else {
          // 连线上有文字
          // 解析
          // A -xx-> B
          const names = line.split("->");
          if (names.length !== 2) {
            throw new Error(`解析时出现错误: "${line}"，应该只有两个名称`);
          }
          const leftContent = names[0].trim();
          const endName = names[1].trim();
          if (leftContent === "" || endName === "") {
            throw new Error(`解析时出现错误: "${line}"，名称不能为空`);
          }
          let endNode = nodeDict.get(endName);
          if (!endNode) {
            // 没有endNode，临时创建一下
            endNode = createNodeByName(endName);
          }
          const leftContentList = leftContent.split("-");
          if (leftContentList.length !== 2) {
            if (leftContentList.length === 1) {
              throw new Error(
                `解析时出现错误: "${line}"，此行被识别为连线上有文字的行，中间的连接线应该是 "-->"，而不是 "->"`,
              );
            } else {
              throw new Error(
                `解析时出现错误: "${line}"，此行被识别为连线上有文字的行，短横线 "-" 左侧内容应该确保只有两个名称`,
              );
            }
          }
          const startName = leftContentList[0].trim();
          const edgeText = leftContentList[1].trim();
          if (startName === "" || edgeText === "") {
            throw new Error(`解析时出现错误: "${line}"，名称不能为空`);
          }
          let startNode = nodeDict.get(startName);
          if (!startNode) {
            // 临时创建一下
            startNode = createNodeByName(startName);
          }
          this.project.nodeConnector.connectEntityFast(startNode, endNode, edgeText);
        }
      } else {
        // 这一行是一个节点行
        // 获取节点名称，创建节点
        const nodeName = line.trim();
        createNodeByName(nodeName);
      }
    }
  }
}
