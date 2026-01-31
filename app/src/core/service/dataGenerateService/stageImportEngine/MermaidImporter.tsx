import type { Project } from "@/core/Project";
import type { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { BaseImporter } from "./BaseImporter";

/**
 * Mermaid 节点标记类型
 */
type MermaidNodeToken = {
  id: string;
  label?: string;
  shape: "rectangle" | "round" | "circle" | "rhombus" | "stadium" | "other";
};

/**
 * Mermaid 图导入器
 * 支持根据 mermaid 文本生成框嵌套网状结构
 * 支持 graph TD 格式的 mermaid 文本
 * 支持 subgraph 嵌套
 * 解析节点形状和标签
 * 处理各种连线类型
 */
export class MermaidImporter extends BaseImporter {
  constructor(project: Project) {
    super(project);
  }

  /**
   * 导入 Mermaid 文本并生成节点
   * @param text Mermaid 格式文本
   * @param diffLocation 偏移位置
   * @example
   * graph TD;
   *   A[Section A] --> B[Section B];
   *   A --> C[C];
   *   B --> D[D];
   */
  public import(text: string, diffLocation: Vector = Vector.getZero()): void {
    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith("```") &&
          !line.startsWith("%%") &&
          !line.toLowerCase().startsWith("style ") &&
          !line.toLowerCase().startsWith("linkstyle ") &&
          !line.toLowerCase().startsWith("classdef "),
      );

    if (lines.length === 0) {
      return;
    }

    const entityMap = new Map<string, ConnectableEntity>();
    const entityParentMap = new Map<ConnectableEntity, Section>();
    const sectionChildrenMap = new Map<Section, ConnectableEntity[]>();
    const sectionStack: Section[] = [];
    const createdEntities = new Set<ConnectableEntity>();
    const pendingEdges: Array<{ source: ConnectableEntity; target: ConnectableEntity; label?: string }> = [];

    const ensureSectionChild = (section: Section, child: ConnectableEntity) => {
      if (section === child) {
        return;
      }
      if (!sectionChildrenMap.has(section)) {
        sectionChildrenMap.set(section, []);
      }
      const childList = sectionChildrenMap.get(section)!;
      if (!childList.includes(child)) {
        childList.push(child);
      }
      if (!section.children.includes(child)) {
        section.children.push(child);
      }
      entityParentMap.set(child, section);
    };

    const shouldTreatAsSection = (label: string | undefined, forceSection: boolean): boolean => {
      if (forceSection) {
        return true;
      }
      if (!label) {
        return false;
      }
      return /(section|章节|组|容器)/i.test(label);
    };

    const createDefaultRectangle = (size: Vector) =>
      new Rectangle(diffLocation.add(new Vector(Math.random() * 40, Math.random() * 40)), size);

    const ensureEntity = (
      token: string,
      options: { forceSection?: boolean; displayText?: string } = {},
    ): ConnectableEntity => {
      const parsed = this.parseNodeToken(token);
      const baseId = parsed.id;
      if (!baseId) {
        throw new Error(`无法解析节点标识: "${token}"`);
      }

      const existing = entityMap.get(baseId);
      const finalLabel = options.displayText ?? parsed.label;
      const forceSection = options.forceSection ?? false;
      const treatAsSection = shouldTreatAsSection(finalLabel, forceSection);

      if (existing) {
        if (finalLabel) {
          if (existing instanceof Section) {
            if (existing.text !== finalLabel) {
              existing.rename(finalLabel);
            }
          } else if (existing instanceof TextNode) {
            if (existing.text !== finalLabel) {
              existing.rename(finalLabel);
            }
          }
        }
        if (sectionStack.length > 0) {
          const currentSection = sectionStack[sectionStack.length - 1];
          ensureSectionChild(currentSection, existing);
        }
        return existing;
      }

      let entity: ConnectableEntity;
      if (treatAsSection) {
        const section = new Section(this.project, {
          text: finalLabel ?? baseId,
          collisionBox: new CollisionBox([createDefaultRectangle(new Vector(240, 180))]),
          children: [],
        });
        entity = section;
        sectionChildrenMap.set(section, sectionChildrenMap.get(section) ?? []);
      } else {
        entity = new TextNode(this.project, {
          text: finalLabel ?? baseId,
          collisionBox: new CollisionBox([createDefaultRectangle(Vector.same(120))]),
        });
      }

      this.project.stageManager.add(entity);
      entityMap.set(baseId, entity);
      createdEntities.add(entity);

      if (sectionStack.length > 0) {
        const currentSection = sectionStack[sectionStack.length - 1];
        ensureSectionChild(currentSection, entity);
      }

      return entity;
    };

    for (const rawLine of lines) {
      const line = this.normalizeLine(rawLine);
      if (line.length === 0) {
        continue;
      }

      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith("graph ")) {
        continue;
      }

      if (lowerLine.startsWith("subgraph ")) {
        const token = line.slice("subgraph ".length).trim();
        const sectionEntity = ensureEntity(token, { forceSection: true });
        if (sectionEntity instanceof Section) {
          sectionStack.push(sectionEntity);
        }
        continue;
      }

      if (lowerLine === "end" || lowerLine.startsWith("end ")) {
        sectionStack.pop();
        continue;
      }

      const arrowIndex = line.indexOf("-->");
      if (arrowIndex !== -1) {
        const leftPart = line.slice(0, arrowIndex).trim();
        const rightPart = line.slice(arrowIndex + 3).trim();

        if (!rightPart) {
          continue;
        }

        let sourceToken = leftPart;
        let edgeLabel: string | undefined;

        const labelIndex = leftPart.indexOf("--");
        if (labelIndex !== -1) {
          sourceToken = leftPart.slice(0, labelIndex).trim();
          const rawLabel = leftPart.slice(labelIndex + 2).trim();
          edgeLabel = this.sanitizeLabel(rawLabel);
        }

        const sourceEntity = ensureEntity(sourceToken);
        const targetEntity = ensureEntity(rightPart);

        pendingEdges.push({ source: sourceEntity, target: targetEntity, label: edgeLabel });
        continue;
      }

      ensureEntity(line);
    }

    const layoutGroup = (entities: ConnectableEntity[], origin: Vector, spacing: Vector) => {
      if (entities.length === 0) {
        return;
      }
      const columns = Math.max(1, Math.ceil(Math.sqrt(entities.length)));
      for (let index = 0; index < entities.length; index++) {
        const entity = entities[index];
        const row = Math.floor(index / columns);
        const col = index % columns;
        const target = origin.add(new Vector(col * spacing.x, row * spacing.y));

        if (entity instanceof Section) {
          layoutSection(entity, target);
        } else {
          entity.moveTo(target);
          if (entity instanceof TextNode) {
            entity.forceAdjustSizeByText();
          }
        }
      }
    };

    const layoutSection = (section: Section, origin: Vector) => {
      const children = sectionChildrenMap.get(section) ?? [];
      if (children.length === 0) {
        section.moveTo(origin);
        section.adjustLocationAndSize();
        section.moveTo(origin);
        return;
      }

      section.moveTo(origin);
      layoutGroup(children, origin.add(new Vector(40, 120)), new Vector(200, 160));
      section.adjustLocationAndSize();
      section.moveTo(origin);
    };

    const rootEntities: ConnectableEntity[] = [];
    for (const entity of entityMap.values()) {
      if (!entityParentMap.has(entity)) {
        rootEntities.push(entity);
      }
    }

    layoutGroup(rootEntities, diffLocation, new Vector(260, 200));

    for (const { source, target, label } of pendingEdges) {
      if (label) {
        this.project.nodeConnector.connectEntityFast(source, target, label);
      } else {
        this.project.nodeConnector.connectEntityFast(source, target);
      }
    }

    for (const section of sectionChildrenMap.keys()) {
      section.adjustLocationAndSize();
    }

    if (createdEntities.size > 0 || pendingEdges.length > 0) {
      this.project.historyManager.recordStep();
    }
  }

  /**
   * 规范化行，去除尾部分号
   */
  private normalizeLine(line: string): string {
    return line.trim().replace(/;$/, "");
  }

  /**
   * 解码 Mermaid 文本中的特殊字符
   */
  private decodeMermaidText(value: string): string {
    return value.replace(/&quot;/g, '"').replace(/<br\s*\/?>/gi, "\n");
  }

  /**
   * 清理标签文本
   */
  private sanitizeLabel(raw: string | undefined): string | undefined {
    if (!raw) {
      return undefined;
    }
    let result = raw.trim();
    if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
      result = result.slice(1, -1);
    }
    result = this.decodeMermaidText(result);
    result = result.trim();
    return result.length > 0 ? result : undefined;
  }

  /**
   * 解析节点标记，提取节点ID、标签和形状
   */
  private parseNodeToken(token: string): MermaidNodeToken {
    const content = this.normalizeLine(token);

    const bracketMatch = content.match(/^([^[]+)\[(.*)\]$/);
    if (bracketMatch) {
      return {
        id: this.decodeMermaidText(bracketMatch[1].trim()),
        label: this.sanitizeLabel(bracketMatch[2]),
        shape: "rectangle",
      };
    }

    const quotedBracketMatch = content.match(/^([^[]+)\["(.*)"\]$/);
    if (quotedBracketMatch) {
      return {
        id: this.decodeMermaidText(quotedBracketMatch[1].trim()),
        label: this.sanitizeLabel(`"${quotedBracketMatch[2]}"`),
        shape: "rectangle",
      };
    }

    const doubleRoundMatch = content.match(/^([^(]+)\(\((.*)\)\)$/);
    if (doubleRoundMatch) {
      return {
        id: this.decodeMermaidText(doubleRoundMatch[1].trim()),
        label: this.sanitizeLabel(doubleRoundMatch[2]),
        shape: "circle",
      };
    }

    const roundMatch = content.match(/^([^(]+)\((.*)\)$/);
    if (roundMatch) {
      return {
        id: this.decodeMermaidText(roundMatch[1].trim()),
        label: this.sanitizeLabel(roundMatch[2]),
        shape: "round",
      };
    }

    const rhombusMatch = content.match(/^([^{}]+)\{(.*)\}$/);
    if (rhombusMatch) {
      return {
        id: this.decodeMermaidText(rhombusMatch[1].trim()),
        label: this.sanitizeLabel(rhombusMatch[2]),
        shape: "rhombus",
      };
    }

    const stadiumMatch = content.match(/^([^[]+)\[\((.*)\)\]$/);
    if (stadiumMatch) {
      return {
        id: this.decodeMermaidText(stadiumMatch[1].trim()),
        label: this.sanitizeLabel(stadiumMatch[2]),
        shape: "stadium",
      };
    }

    const cleanId = this.sanitizeLabel(content) ?? this.decodeMermaidText(content);
    return {
      id: cleanId,
      shape: "other",
    };
  }
}
