import { Project, service } from "@/core/Project";
import { EntityJumpMoveEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityJumpMoveEffect";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Vector } from "@graphif/data-structures";

/**
 * 管理节点的位置移动
 * 不仅仅有鼠标拖动的移动，还有对齐造成的移动
 * 还要处理节点移动后，对Section大小造成的影响
 * 以后还可能有自动布局的功能
 */
@service("entityMoveManager")
export class EntityMoveManager {
  constructor(private readonly project: Project) {}

  /**
   * 检查实体是否可以移动（考虑锁定状态）
   * @param entity 要检查的实体
   * @returns 如果实体可以移动返回 true，否则返回 false
   */
  private canMoveEntity(entity: Entity): boolean {
    // 检查实体是否有锁定的祖先section（递归检查）
    const ancestorSections = this.project.sectionMethods.getFatherSectionsList(entity);
    if (ancestorSections.some((section) => section.locked)) {
      return false;
    }
    return true;
  }

  /**
   * 让某一个实体移动一小段距离
   * @param entity
   * @param delta
   * @param isAutoAdjustSection 移动的时候是否触发section框的弹性调整
   */
  moveEntityUtils(entity: Entity, delta: Vector, isAutoAdjustSection: boolean = true) {
    // 检查实体是否可以被移动（锁定状态检查）
    if (!this.canMoveEntity(entity)) {
      return;
    }
    // 让自己移动
    entity.move(delta);

    const nodeUUID = entity.uuid;

    // if (this.project.stageManager.isSectionByUUID(nodeUUID)) {
    //   // 如果是Section，则需要带动孩子一起移动
    //   const section = this.project.stageManager.getSectionByUUID(nodeUUID);
    //   if (section) {
    //     for (const child of section.children) {
    //       moveEntityUtils(child, delta);
    //     }
    //   }
    // }
    if (isAutoAdjustSection) {
      for (const section of this.project.stageManager.getSections()) {
        if (section.children.find((it) => it.uuid === nodeUUID)) {
          section.adjustLocationAndSize();
        }
      }
    }
  }

  /**
   * 跳跃式移动传入的实体
   * 会破坏嵌套关系
   * @param entity
   * @param delta
   */
  jumpMoveEntityUtils(entity: Entity, delta: Vector) {
    // 检查实体是否可以被移动（锁定状态检查）
    if (!this.canMoveEntity(entity)) {
      return;
    }

    const beforeMoveRect = entity.collisionBox.getRectangle().clone();
    console.log("JUMP MOVE");
    // 将自己移动前加特效
    this.project.effects.addEffect(new EntityJumpMoveEffect(15, beforeMoveRect, delta));

    // 即将跳入的sections区域
    const targetSections = this.project.sectionMethods.getSectionsByInnerLocation(beforeMoveRect.center.add(delta));

    // 检查目标位置是否在锁定的 section 内（包括祖先section的锁定状态）
    if (targetSections.some((section) => this.project.sectionMethods.isObjectBeLockedBySection(section))) {
      return;
    }
    // 改变层级
    if (targetSections.length === 0) {
      // 代表想要走出当前section
      const currentFatherSections = this.project.sectionMethods.getFatherSections(entity);
      if (currentFatherSections.length !== 0) {
        this.project.stageManager.goOutSection([entity], currentFatherSections[0]);
      }
    } else {
      this.project.sectionInOutManager.goInSections([entity], targetSections);
      for (const section of targetSections) {
        // 特效
        this.project.effects.addEffect(
          new RectanglePushInEffect(entity.collisionBox.getRectangle(), section.collisionBox.getRectangle()),
        );
        SoundService.play.entityJumpSoundFile();
      }
    }

    // 让自己移动
    // entity.move(delta);
    this.moveEntityUtils(entity, delta, false);
  }

  /**
   * 将某个实体移动到目标位置
   * @param entity
   * @param location
   */
  moveEntityToUtils(entity: Entity, location: Vector) {
    // 检查实体是否可以被移动（锁定状态检查）
    if (!this.canMoveEntity(entity)) {
      return;
    }
    entity.moveTo(location);
    const nodeUUID = entity.uuid;
    for (const section of this.project.stageManager.getSections()) {
      if (section.children.find((it) => it.uuid === nodeUUID)) {
        section.adjustLocationAndSize();
      }
    }
  }

  /**
   * 移动所有选中的实体一小段距离
   * @param delta
   * @param isAutoAdjustSection
   */
  moveSelectedEntities(delta: Vector, isAutoAdjustSection: boolean = true) {
    for (const node of this.project.stageManager.getEntities()) {
      if (node.isSelected) {
        this.moveEntityUtils(node, delta, isAutoAdjustSection);
      }
    }
  }

  /**
   * 跳跃式移动所有选中的可连接实体
   * 会破坏框的嵌套关系
   * @param delta
   */
  jumpMoveSelectedConnectableEntities(delta: Vector) {
    for (const node of this.project.stageManager.getConnectableEntity()) {
      if (node.isSelected) {
        this.jumpMoveEntityUtils(node, delta);
      }
    }
  }

  /**
   * 树型移动 所有选中的实体
   * @param delta
   */
  moveEntitiesWithChildren(delta: Vector) {
    for (const node of this.project.stageManager.getEntities()) {
      if (node.isSelected) {
        if (node instanceof ConnectableEntity) {
          this.moveWithChildren(node, delta);
        } else {
          this.moveEntityUtils(node, delta);
        }
      }
    }
  }
  /**
   * 树形移动传入的可连接实体
   * @param node
   * @param delta
   * @param skipDashed 是否跳过虚线边（树形格式化时传 true，避免带动虚线连接的节点）
   */
  moveWithChildren(node: ConnectableEntity, delta: Vector, skipDashed = false) {
    const successorSet = this.project.graphMethods.getSuccessorSet(node, true, skipDashed);
    for (const successor of successorSet) {
      this.moveEntityUtils(successor, delta);
    }
  }

  // 按住shift键移动
}
