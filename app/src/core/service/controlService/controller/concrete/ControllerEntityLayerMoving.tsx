import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { EntityJumpMoveEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityJumpMoveEffect";
import { EntityShakeEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShakeEffect";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { Settings } from "@/core/service/Settings";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/sprites/TextNode";
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

    // 即将跳入的sections区域
    const targetSections = this.project.sectionMethods.getSectionsByInnerLocation(mouseLocation);
    const selectedEntities = this.project.stageManager.getSelectedEntities();

    // 防止无限循环嵌套：当跳入的实体是选中的所有内容当中任意一个Section的内部时，禁止触发该操作
    for (const selectedEntity of selectedEntities) {
      if (selectedEntity instanceof Section) {
        for (const targetSection of targetSections) {
          if (this.project.sectionMethods.isEntityInSection(targetSection, selectedEntity)) {
            this.project.effects.addEffect(EntityShakeEffect.fromEntity(targetSection));
            toast.error("禁止将框套入自身内部");
            return;
          }
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
    if (targetSections.length === 0) {
      // 代表想要走到最外层空白位置
      for (const entity of selectedEntities) {
        const currentFatherSections = this.project.sectionMethods.getFatherSections(entity);
        for (const currentFatherSection of currentFatherSections) {
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
      }
    } else {
      // 跑到了别的层级之中

      this.project.sectionInOutManager.goInSections(selectedEntities, targetSections);

      for (const section of targetSections) {
        // this.project.stageManager.goInSection(selectedEntities, section);

        // 特效
        setTimeout(() => {
          for (const entity of selectedEntities) {
            this.project.effects.addEffect(
              RectanglePushInEffect.sectionGoInGoOut(
                entity.collisionBox.getRectangle(),
                section.collisionBox.getRectangle(),
              ),
            );
          }
        });
      }
    }

    // 3 移动所有选中的实体 的位置
    this.project.entityMoveManager.moveSelectedEntities(delta);
  };
}
