import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { EntityJumpMoveEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityJumpMoveEffect";
import { EntityShakeEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShakeEffect";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { Settings } from "@/core/service/Settings";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";

/**
 * 创建节点层级移动控制器
 */

export class ControllerLayerMovingClass extends ControllerClass {
  public get isEnabled(): boolean {
    if (Settings.mouseLeftMode === "draw") {
      return false;
    }
    return true;
  }

  public mousemove: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (!this.project.controller.pressingKeySet.has("alt")) {
      return;
    }
    if (this.isEnabled === false) {
      return;
    }
    if (this.project.stageManager.getSelectedEntities().length === 0) {
      return;
    }
    this.project.controller.mouseLocation = this.project.renderer.transformView2World(
      new Vector(event.clientX, event.clientY),
    );
  };

  public mouseup: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (!this.project.controller.pressingKeySet.has("alt")) {
      return;
    }
    if (this.isEnabled === false) {
      return;
    }
    if (this.project.stageManager.getSelectedEntities().length === 0) {
      return;
    }
    const mouseLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));

    // 提前检查点击的位置是否有一个TextNode，如果有，则转换成Section
    const entity = this.project.stageManager.findEntityByLocation(mouseLocation);
    if (entity && entity instanceof TextNode) {
      // 防止无限循环嵌套：当跳入的实体是选中的所有内容当中任意一个Section的内部时，禁止触发该操作
      const selectedEntities = this.project.stageManager.getSelectedEntities();
      for (const selectedEntity of selectedEntities) {
        if (
          selectedEntity instanceof Section &&
          this.project.sectionMethods.isEntityInSection(entity, selectedEntity)
        ) {
          this.project.effects.addEffect(EntityShakeEffect.fromEntity(entity));
          this.project.effects.addEffect(EntityShakeEffect.fromEntity(selectedEntity));
          toast.error("禁止将框套入自身内部");
          return;
        }
      }

      const newSection = this.project.sectionPackManager.targetTextNodeToSection(entity);
      if (newSection && selectedEntities.length > 0) {
        // 获取所有选中实体的外接矩形的中心点，以便计算移动距离
        const centerLocation = Rectangle.getBoundingRectangle(
          selectedEntities.map((entity) => entity.collisionBox.getRectangle()),
        ).center;
        // 最后让所有选中的实体移动
        for (const selectedEntity of selectedEntities) {
          const delta = mouseLocation.subtract(centerLocation);
          selectedEntity.move(delta);
        }
        this.project.sectionInOutManager.goInSections(this.project.stageManager.getSelectedEntities(), [newSection]);
      }

      return; // 这个return必须写
    }

    const targetSection = this.project.sectionMethods.getInnermostSectionByLocation(mouseLocation);
    const selectedEntities = this.project.stageManager.getSelectedEntities();

    // 检查目标位置是否在锁定的 section 内（包括祖先section的锁定状态）
    if (
      targetSection &&
      (targetSection.locked || this.project.sectionMethods.isObjectBeLockedBySection(targetSection))
    ) {
      toast.error("不能跳入已锁定的 Section");
      return;
    }

    // 检查选中的实体是否在锁定的 section 内（包括祖先section的锁定状态）
    for (const selectedEntity of selectedEntities) {
      if (selectedEntity instanceof Section) {
        // 对于section实体：如果本身被锁定，允许移动；如果未被锁定但有锁定的祖先section，阻止移动
        if (!selectedEntity.locked) {
          const ancestorSections = this.project.sectionMethods.getFatherSectionsList(selectedEntity);
          if (ancestorSections.some((section) => section.locked)) {
            toast.error("不能移动已锁定的 Section 中的物体");
            return;
          }
        }
      } else {
        // 对于其他实体：如果有锁定的祖先section，阻止移动
        if (this.project.sectionMethods.isObjectBeLockedBySection(selectedEntity)) {
          toast.error("不能移动已锁定的 Section 中的物体");
          return;
        }
      }
    }

    // 防止无限循环嵌套：当跳入的实体是选中的所有内容当中任意一个Section的内部时，禁止触发该操作
    for (const selectedEntity of selectedEntities) {
      if (selectedEntity instanceof Section) {
        if (targetSection && this.project.sectionMethods.isEntityInSection(targetSection, selectedEntity)) {
          this.project.effects.addEffect(EntityShakeEffect.fromEntity(targetSection));
          toast.error("禁止将框套入自身内部");
          return;
        }
      }
    }

    // 移动位置

    // 1 计算所有节点应该移动的 delta
    // 1.0 计算当前框选的所有实体的中心位置

    const delta = mouseLocation.subtract(
      Rectangle.getBoundingRectangle(
        selectedEntities.map((entity) => {
          return entity.collisionBox.getRectangle();
        }),
      ).leftTop,
    );
    // 4 特效(要先加特效，否则位置已经被改了)
    for (const entity of selectedEntities) {
      this.project.effects.addEffect(new EntityJumpMoveEffect(15, entity.collisionBox.getRectangle(), delta));
    }

    // 改变层级
    if (targetSection === null) {
      // 代表想要走到最外层空白位置
      for (const entity of selectedEntities) {
        const currentFatherSection = entity.parentSection;
        if (!currentFatherSection) {
          continue;
        }
        this.project.stageManager.goOutSection([entity], currentFatherSection);

        // 特效
        setTimeout(() => {
          this.project.effects.addEffect(
            RectanglePushInEffect.sectionGoInGoOut(
              entity.collisionBox.getRectangle(),
              currentFatherSection.collisionBox.getRectangle(),
              true,
            ),
          );
        });
      }
    } else {
      // 跑到了别的层级之中

      this.project.sectionInOutManager.goInSection(selectedEntities, targetSection);

      setTimeout(() => {
        for (const entity of selectedEntities) {
          this.project.effects.addEffect(
            RectanglePushInEffect.sectionGoInGoOut(
              entity.collisionBox.getRectangle(),
              targetSection.collisionBox.getRectangle(),
            ),
          );
        }
      });
    }

    // 3 移动所有选中的实体 的位置
    this.project.entityMoveManager.moveSelectedEntities(delta);
    // 播放跳跃音效
    SoundService.play.entityJumpSoundFile();
  };
}
