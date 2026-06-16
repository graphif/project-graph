import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { CollisionBox } from "../../stageObject/collisionBox/collisionBox";

/**
 * 管理所有东西进出StageSection的逻辑
 */
@service("sectionInOutManager")
export class SectionInOutManager {
  constructor(private readonly project: Project) {}

  goInSection(entities: Entity[], section: Section) {
    let changed = false;
    for (const entity of entities) {
      changed = this.attachEntityToSection(entity, section) || changed;
    }
    if (changed) {
      this.project.stageManager.updateReferences();
    }
  }

  /**
   * 一些实体跳入多个Section（交叉嵌套）
   * 会先解除所有实体与Section的关联，再重新关联
   * @param entities
   * @param sections
   */
  goInSections(entities: Entity[], sections: Section[]) {
    const targetSection = this.pickPreferredSection(sections);
    let changed = false;
    for (const entity of entities) {
      if (targetSection) {
        changed = this.attachEntityToSection(entity, targetSection) || changed;
      } else {
        changed = this.entityDropParent(entity) || changed;
      }
    }
    if (changed) {
      this.project.stageManager.updateReferences();
    }
  }

  goOutSection(entities: Entity[], section: Section) {
    let changed = false;
    for (const entity of entities) {
      changed = this.sectionDropChild(section, entity) || changed;
    }
    if (changed) {
      this.project.stageManager.updateReferences();
    }
  }

  /**
   * 将实体挂入某个 Section，但暂不刷新运行时索引。
   * 如果实体已经有父 Section，会先从旧父级中摘除，保证单父结构。
   */
  public attachEntityToSection(entity: Entity, section: Section): boolean {
    if (entity === section) {
      return false;
    }
    let changed = false;
    changed = this.entityDropParent(entity, false, section) || changed;
    if (!section.children.includes(entity)) {
      section.children.push(entity);
      entity.parentSection = section;
      changed = true;
    }
    return changed;
  }

  /**
   * 将实体从当前父 Section 中摘除，但暂不刷新运行时索引。
   */
  public entityDropParent(
    entity: Entity,
    convertEmptySectionToTextNode: boolean = false,
    excludeSection: Section | null = null,
  ): boolean {
    const currentParent = entity.parentSection;
    if (currentParent && currentParent !== excludeSection) {
      return this.sectionDropChild(currentParent, entity, convertEmptySectionToTextNode);
    }

    let changed = false;
    for (const section of this.project.stageManager.getSections()) {
      if (section === excludeSection) {
        continue;
      }
      if (section.children.includes(entity)) {
        changed = this.sectionDropChild(section, entity, convertEmptySectionToTextNode) || changed;
      }
    }
    return changed;
  }

  /**
   * Section 丢弃某个孩子
   * @param section
   * @param entity
   */
  private sectionDropChild(section: Section, entity: Entity, convertEmptySectionToTextNode: boolean = true): boolean {
    const newChildren: Entity[] = [];
    for (const child of section.children) {
      if (entity.uuid !== child.uuid) {
        newChildren.push(child);
      }
    }
    const changed = newChildren.length !== section.children.length;
    if (!changed) {
      return false;
    }

    section.children = newChildren;
    if (entity.parentSection === section) {
      entity.parentSection = null;
    }
    if (convertEmptySectionToTextNode && section.children.length === 0) {
      this.convertSectionToTextNode(section);
    }
    return true;
  }

  private pickPreferredSection(sections: Section[]): Section | null {
    if (sections.length === 0) {
      return null;
    }
    const sortedSections = [...sections].sort((a, b) => {
      const areaDiff = this.getSectionArea(a) - this.getSectionArea(b);
      if (areaDiff !== 0) {
        return areaDiff;
      }
      const rectA = a.collisionBox.getRectangle();
      const rectB = b.collisionBox.getRectangle();
      if (rectA.top !== rectB.top) {
        return rectA.top - rectB.top;
      }
      if (rectA.left !== rectB.left) {
        return rectA.left - rectB.left;
      }
      return a.uuid.localeCompare(b.uuid);
    });
    return sortedSections[0];
  }

  private getSectionArea(section: Section): number {
    const rect = section.collisionBox.getRectangle();
    return rect.size.x * rect.size.y;
  }
  /**
   * 将section转换为TextNode，保持UUID、详细信息和连线关系不变
   * @param section 要转换的section
   */
  private convertSectionToTextNode(section: Section) {
    // 获取section的父级section
    const fatherSections = this.project.sectionMethods.getFatherSections(section);

    // 先从父 section 的 children 中移除旧的 section 引用，避免空 Section 的连锁转换。
    for (const fatherSection of fatherSections) {
      this.sectionDropChild(fatherSection, section, false);
    }

    // 创建新的TextNode，保持UUID不变
    const textNode = new TextNode(this.project, {
      uuid: section.uuid, // 保持UUID不变
      text: section.text,
      details: section.details,
      collisionBox: new CollisionBox([section.collisionBox.getRectangle()]),
      color: section.color.clone(),
    });

    // 将新的TextNode添加到舞台
    this.project.stageManager.add(textNode);

    // 将新的TextNode添加到父section中
    for (const fatherSection of fatherSections) {
      this.attachEntityToSection(textNode, fatherSection);
    }

    // 处理所有连向section的边
    for (const edge of this.project.stageManager.getAssociations()) {
      if (edge instanceof Edge) {
        // 处理有向边
        if (edge.target.uuid === section.uuid) {
          edge.target = textNode;
        }
        if (edge.source.uuid === section.uuid) {
          edge.source = textNode;
        }
      } else if (edge instanceof MultiTargetUndirectedEdge) {
        // 处理无向边
        for (let i = 0; i < edge.associationList.length; i++) {
          if (edge.associationList[i].uuid === section.uuid) {
            edge.associationList[i] = textNode;
          }
        }
      }
    }

    // 从舞台中删除原section
    this.project.stageManager.deleteEntities([section]);
  }
}
