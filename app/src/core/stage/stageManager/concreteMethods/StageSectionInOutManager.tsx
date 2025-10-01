import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/sprites/TextNode";
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
    for (const entity of entities) {
      if (section.children.includes(entity)) {
        // 已经在section里面了，不用再次进入
        continue;
      }
      if (entity === section) {
        // 自己不能包自己
        continue;
      }
      section.children.push(entity);
    }
    this.project.stageManager.updateReferences();
  }

  /**
   * 一些实体跳入多个Section（交叉嵌套）
   * 会先解除所有实体与Section的关联，再重新关联
   * @param entities
   * @param sections
   */
  goInSections(entities: Entity[], sections: Section[]) {
    // 先解除所有实体与Section的关联
    for (const entity of entities) {
      this.entityDropParent(entity);
    }
    // 再重新关联
    for (const section of sections) {
      this.goInSection(entities, section);
    }
  }

  goOutSection(entities: Entity[], section: Section) {
    for (const entity of entities) {
      this.sectionDropChild(section, entity);
    }
    this.project.stageManager.updateReferences();
  }

  private entityDropParent(entity: Entity) {
    for (const section of this.project.stageManager.getSections()) {
      if (section.children.includes(entity)) {
        this.sectionDropChild(section, entity);
      }
    }
  }

  /**
   * Section 丢弃某个孩子
   * @param section
   * @param entity
   */
  private sectionDropChild(section: Section, entity: Entity) {
    const newChildrenUUID: string[] = [];
    const newChildren: Entity[] = [];
    for (const child of section.children) {
      if (entity.uuid !== child.uuid) {
        newChildrenUUID.push(child.uuid);
        newChildren.push(child);
      }
    }
    section.children = newChildren;

    // 当section的最后一个子元素被移除时，将section转换为TextNode
    if (section.children.length === 0) {
      this.convertSectionToTextNode(section);
    }
  }

  /**
   * 将section转换为TextNode，保持UUID、详细信息和连线关系不变
   * @param section 要转换的section
   */
  private convertSectionToTextNode(section: Section) {
    // 获取section的父级section
    const fatherSections = this.project.sectionMethods.getFatherSections(section);

    // 创建新的TextNode，保持UUID不变
    const textNode = new TextNode(this.project, {
      uuid: section.uuid, // 保持UUID不变
      text: section.text,
      // details: section.details,
      collisionBox: new CollisionBox([section.collisionBox.getRectangle()]),
      color: section.color.clone(),
    });

    // 将新的TextNode添加到舞台
    this.project.stageManager.add(textNode);

    // 将新的TextNode添加到父section中
    for (const fatherSection of fatherSections) {
      this.project.sectionInOutManager.goInSection([textNode], fatherSection);
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

    // 更新引用
    this.project.stageManager.updateReferences();
  }
}
