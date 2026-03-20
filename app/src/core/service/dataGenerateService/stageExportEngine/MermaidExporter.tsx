import type { Project } from "@/core/Project";
import type { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { LineEdge } from "@/core/stage/stageObject/association/LineEdge";
import { CopyEngineUtils } from "../../dataManageService/copyEngine/copyEngineUtils";

/**
 * Mermaid 图表导出器
 *
 * 格式：
 * ```mermaid
 * graph TD
 * A --> B
 * A --> C
 * B -- 连线文字 --> C
 * ```
 *
 * (TD) 表示自上而下，LR表示自左而右
 * 使用 subgraph ... end 来定义子图。
 */
export class MermaidExporter {
  constructor(private readonly project: Project) {}

  /**
   * 将实体导出为 Mermaid 图表格式
   * @param entities 要导出的实体
   * @returns Mermaid 图表字符串
   */
  public export(entities: Entity[]): string {
    const stageObjects = CopyEngineUtils.getAllStageObjectFromEntities(this.project, entities);
    const allNodes = stageObjects.filter((v) => v instanceof TextNode || v instanceof Section) as (
      | TextNode
      | Section
    )[];
    const allLinks = stageObjects.filter((v) => v instanceof LineEdge) as LineEdge[];

    // 创建节点集合，用于快速查找
    const nodeSet = new Set(allNodes.map((n) => n.uuid));

    // 过滤出有效的连线（source 和 target 都在节点集合中）
    const validLinks = allLinks.filter((link) => nodeSet.has(link.source.uuid) && nodeSet.has(link.target.uuid));

    // 生成节点 ID 映射（uuid -> mermaid ID）
    // 使用顺序编号 id0/id1/... 作为节点 ID，避免文本中特殊字符（~、-、()等）引起的 Mermaid 词法错误
    const nodeIdMap = new Map<string, string>();

    const getNodeId = (node: TextNode | Section): string => {
      if (nodeIdMap.has(node.uuid)) {
        return nodeIdMap.get(node.uuid)!;
      }
      const id = `id${nodeIdMap.size}`;
      nodeIdMap.set(node.uuid, id);
      return id;
    };

    // 转义 Mermaid 文本中的特殊字符
    const escapeMermaidText = (text: string): string => {
      // Mermaid 中的特殊字符需要转义或使用引号
      return text.replace(/"/g, "&quot;").replace(/\n/g, "<br>");
    };

    // 找出所有 Section
    const sections = allNodes.filter((n) => n instanceof Section) as Section[];

    // 找出每个节点所在的 Section（只考虑最内层的 Section，即直接包含它的 Section）
    const nodeToSectionMap = new Map<string, Section>();

    // 找出每个 TextNode 所在的最内层 Section（直接包含它的 Section）
    for (const node of allNodes) {
      if (node instanceof Section) continue;

      // 找出所有包含该节点的 Section
      const containingSections: Section[] = [];
      for (const section of sections) {
        if (this.project.sectionMethods.isEntityInSection(node, section)) {
          containingSections.push(section);
        }
      }

      // 找出最内层的 Section（不被其他包含该节点的 Section 包含的 Section）
      if (containingSections.length > 0) {
        let innermostSection = containingSections[0];
        for (const section of containingSections) {
          // 如果 innermostSection 包含 section，则 section 是更内层的
          if (this.project.sectionMethods.isEntityInSection(section, innermostSection)) {
            innermostSection = section;
          }
        }
        nodeToSectionMap.set(node.uuid, innermostSection);
      }
    }

    // 找出每个 Section 所在的父 Section（最内层的父 Section，即直接包含它的 Section）
    const sectionToParentMap = new Map<Section, Section>();
    for (const section of sections) {
      // 找出所有包含该 Section 的父 Section
      const parentSections: Section[] = [];
      for (const s of sections) {
        if (s !== section && this.project.sectionMethods.isEntityInSection(section, s)) {
          parentSections.push(s);
        }
      }

      if (parentSections.length > 0) {
        // 找出最内层的父 Section（不被其他父 Section 包含的父 Section）
        let innermostParent = parentSections[0];
        for (const s of parentSections) {
          // 如果 innermostParent 包含 s，则 s 是更内层的
          if (this.project.sectionMethods.isEntityInSection(s, innermostParent)) {
            innermostParent = s;
          }
        }
        sectionToParentMap.set(section, innermostParent);
      }
    }

    // 按 Section 分组节点
    const sectionToNodesMap = new Map<Section, (TextNode | Section)[]>();
    const nodesWithoutSection: (TextNode | Section)[] = [];

    for (const node of allNodes) {
      if (node instanceof Section) {
        // Section 本身：如果它在其他 Section 内，则放在父 Section 中
        const parentSection = sectionToParentMap.get(node);
        if (parentSection) {
          if (!sectionToNodesMap.has(parentSection)) {
            sectionToNodesMap.set(parentSection, []);
          }
          sectionToNodesMap.get(parentSection)!.push(node);
        } else {
          // 最外层的 Section，直接添加到根节点列表
          nodesWithoutSection.push(node);
        }
      } else {
        // TextNode：如果它在 Section 内，则放在对应的 Section 中
        const section = nodeToSectionMap.get(node.uuid);
        if (section) {
          if (!sectionToNodesMap.has(section)) {
            sectionToNodesMap.set(section, []);
          }
          sectionToNodesMap.get(section)!.push(node);
        } else {
          // 不在任何 Section 中的节点
          nodesWithoutSection.push(node);
        }
      }
    }

    // 生成 Mermaid 字符串
    let result = "graph TD\n";

    // 递归生成节点和子图
    const generateNodes = (nodes: (TextNode | Section)[], indent: string = ""): void => {
      for (const node of nodes) {
        if (node instanceof Section) {
          // 生成子图（始终使用 id["label"] 格式，避免特殊字符问题）
          const sectionId = getNodeId(node);
          const sectionTitle = escapeMermaidText(node.text || "Section");
          result += `${indent}subgraph ${sectionId}["${sectionTitle}"]\n`;

          // 生成子图内的节点
          const innerNodes = sectionToNodesMap.get(node) || [];
          generateNodes(innerNodes, indent + "  ");

          result += `${indent}end\n`;
        } else {
          // 生成普通节点（有文本时使用 id["label"] 格式，空文本时只输出 id）
          const nodeId = getNodeId(node);
          const nodeText = escapeMermaidText(node.text || "");
          if (nodeText) {
            result += `${indent}${nodeId}["${nodeText}"]\n`;
          } else {
            result += `${indent}${nodeId}\n`;
          }
        }
      }
    };

    // 生成所有节点（包括不在 Section 中的节点和 Section 本身）
    generateNodes(nodesWithoutSection);

    // 根据 lineType 返回对应的 Mermaid 箭头语法
    const getArrow = (lineType: string): string => {
      if (lineType === "dashed") return "-.->";
      if (lineType === "double") return "==>";
      return "-->";
    };

    // 根据 lineType 返回带文本的 Mermaid 箭头语法
    const getArrowWithText = (lineType: string, text: string): string => {
      if (lineType === "dashed") return `-. "${text}" .->`;
      if (lineType === "double") return `== "${text}" ==>`;
      return `-- "${text}" -->`;
    };

    // 生成连线
    for (const link of validLinks) {
      const sourceId = getNodeId(link.source as TextNode | Section);
      const targetId = getNodeId(link.target as TextNode | Section);
      const lineType = link.lineType || "solid";

      if (link.text && link.text.trim()) {
        const linkText = escapeMermaidText(link.text.trim());
        result += `${sourceId} ${getArrowWithText(lineType, linkText)} ${targetId}\n`;
      } else {
        result += `${sourceId} ${getArrow(lineType)} ${targetId}\n`;
      }
    }

    // 生成连线颜色样式（仅对设置了非透明颜色的连线输出 linkStyle 语句）
    validLinks.forEach((link, index) => {
      if (link.color.a > 0) {
        result += `linkStyle ${index} stroke:${link.color.toHexStringWithoutAlpha()},stroke-opacity:${link.color.a}\n`;
      }
    });

    // 生成节点颜色样式（仅对设置了非透明颜色的节点输出 style 语句）
    for (const node of allNodes) {
      if (node.color.a > 0) {
        const nodeId = getNodeId(node);
        result += `style ${nodeId} fill:${node.color.toHexStringWithoutAlpha()},fill-opacity:${node.color.a}\n`;
      }
    }

    return result.trim();
  }
}
