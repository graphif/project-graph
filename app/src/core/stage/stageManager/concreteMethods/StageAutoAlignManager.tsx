import { ArrayFunctions } from "@/core/algorithm/arrayFunctions";
import { Project, service } from "@/core/Project";
import { EntityAlignEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityAlignEffect";
import { RectangleRenderEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleRenderEffect";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";

/**
 * 自动对齐和布局管理器
 */
@service("autoAlign")
export class AutoAlign {
  constructor(private readonly project: Project) {}

  /**
   * 对齐到网格
   */
  alignAllSelectedToGrid() {
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    for (const selectedEntity of selectedEntities) {
      if (selectedEntity.isAlignExcluded) {
        // 涂鸦对象不参与对齐
        continue;
      }
      this.onEntityMoveAlignToGrid(selectedEntity);
    }
  }

  /**
   * 吸附函数
   * 用于鼠标松开的时候自动移动位置一小段距离
   */
  alignAllSelected() {
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    const viewRectangle = this.project.renderer.getCoverWorldRectangle();
    const otherEntities = this.project.stageManager
      .getEntities()
      .filter((entity) => !entity.isSelected)
      .filter((entity) => entity.collisionBox.getRectangle().isAbsoluteIn(viewRectangle));
    for (const selectedEntity of selectedEntities) {
      if (selectedEntity.isAlignExcluded) {
        // 涂鸦对象不参与对齐
        continue;
      }
      this.onEntityMoveAlignToOtherEntity(selectedEntity, otherEntities);
    }
  }

  /**
   * 预先对齐显示反馈
   * 用于鼠标移动的时候显示对齐的效果
   */
  preAlignAllSelected() {
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    const viewRectangle = this.project.renderer.getCoverWorldRectangle();
    const otherEntities = this.project.stageManager
      .getEntities()
      .filter((entity) => !entity.isSelected)
      .filter((entity) => entity.collisionBox.getRectangle().isAbsoluteIn(viewRectangle));
    for (const selectedEntity of selectedEntities) {
      if (selectedEntity.isAlignExcluded) {
        // 涂鸦对象不参与对齐
        continue;
      }
      this.onEntityMoveAlignToOtherEntity(selectedEntity, otherEntities, true);
    }
  }
  /**
   * 将一个节点对齐到网格
   * @param selectedEntity
   */
  private onEntityMoveAlignToGrid(selectedEntity: Entity) {
    this.onEntityMoveAlignToGridX(selectedEntity);
    this.onEntityMoveAlignToGridY(selectedEntity);
  }

  private onEntityMoveAlignToGridX(selectedEntity: Entity) {
    const rect = selectedEntity.collisionBox.getRectangle();
    const leftMod = rect.left % 50;
    const rightMode = rect.right % 50;
    const leftMoveDistance = Math.min(leftMod, 50 - leftMod);
    const rightMoveDistance = Math.min(rightMode, 50 - rightMode);
    if (leftMoveDistance < rightMoveDistance) {
      // 根据实体左边缘对齐
      if (leftMod < 50 - leftMod) {
        // 向左
        selectedEntity.move(new Vector(-leftMod, 0));
      } else {
        // 向右
        selectedEntity.move(new Vector(50 - leftMod, 0));
      }
    } else {
      // 根据右边缘对齐
      if (rightMode < 50 - rightMode) {
        // 向左
        selectedEntity.move(new Vector(-rightMode, 0));
      } else {
        // 向右
        selectedEntity.move(new Vector(50 - rightMode, 0));
      }
    }
  }
  private onEntityMoveAlignToGridY(selectedEntity: Entity) {
    const rect = selectedEntity.collisionBox.getRectangle();
    const topMod = rect.top % 50;
    const bottomMode = rect.bottom % 50;
    const topMoveDistance = Math.min(topMod, 50 - topMod);
    const bottomMoveDistance = Math.min(bottomMode, 50 - bottomMode);
    if (topMoveDistance < bottomMoveDistance) {
      // 根据实体左边缘对齐
      if (topMod < 50 - topMod) {
        // 向左
        selectedEntity.move(new Vector(0, -topMod));
      } else {
        // 向右
        selectedEntity.move(new Vector(0, 50 - topMod));
      }
    } else {
      // 根据右边缘对齐
      if (bottomMode < 50 - bottomMode) {
        // 向左
        selectedEntity.move(new Vector(0, -bottomMode));
      } else {
        // 向右
        selectedEntity.move(new Vector(0, 50 - bottomMode));
      }
    }
  }
  /**
   * 将一个节点对齐到其他节点
   * @param selectedEntity
   * @param otherEntities 其他未选中的节点，在上游做好筛选
   */
  private onEntityMoveAlignToOtherEntity(selectedEntity: Entity, otherEntities: Entity[], isPreAlign = false) {
    // // 只能和一个节点对齐
    // let isHaveAlignTarget = false;
    // 按照与 selectedEntity 的距离排序
    const sortedOtherEntities = otherEntities
      .sort((a, b) => {
        const distanceA = this.calculateDistance(selectedEntity, a);
        const distanceB = this.calculateDistance(selectedEntity, b);
        return distanceA - distanceB; // 升序排序
      })
      .filter((entity) => {
        // 排除entity是selectedEntity的父亲Section框
        // 可以偷个懒，如果检测两个entity具有位置重叠了，那么直接排除过滤掉
        return !entity.collisionBox.getRectangle().isCollideWithRectangle(selectedEntity.collisionBox.getRectangle());
      });
    let isAlign = false;
    // 目前先只做节点吸附
    let xMoveDiff = 0;
    let yMoveDiff = 0;
    const xTargetRectangles: Rectangle[] = [];
    const yTargetRectangles: Rectangle[] = [];
    // X轴对齐 ||||
    for (const otherEntity of sortedOtherEntities) {
      xMoveDiff = this.onEntityMoveAlignToTargetEntityX(selectedEntity, otherEntity, isPreAlign);
      if (xMoveDiff !== 0) {
        isAlign = true;
        xTargetRectangles.push(otherEntity.collisionBox.getRectangle());
        break;
      }
    }
    // Y轴对齐 =
    for (const otherEntity of sortedOtherEntities) {
      yMoveDiff = this.onEntityMoveAlignToTargetEntityY(selectedEntity, otherEntity, isPreAlign);
      if (yMoveDiff !== 0) {
        isAlign = true;
        yTargetRectangles.push(otherEntity.collisionBox.getRectangle());
        break;
      }
    }
    if (isAlign && isPreAlign) {
      // 预先对齐显示反馈
      const rectangle = selectedEntity.collisionBox.getRectangle();
      const moveTargetRectangle = rectangle.clone();
      moveTargetRectangle.location.x += xMoveDiff;
      moveTargetRectangle.location.y += yMoveDiff;

      this.project.effects.addEffect(RectangleRenderEffect.fromPreAlign(moveTargetRectangle));
      for (const targetRectangle of xTargetRectangles.concat(yTargetRectangles)) {
        this.project.effects.addEffect(EntityAlignEffect.fromEntity(moveTargetRectangle, targetRectangle));
      }
    }
    if (isAlign && !isPreAlign) {
      SoundService.play.alignAndAttach();
    }
  }

  /**
   * 添加对齐特效
   * @param selectedEntity
   * @param otherEntity
   */
  private _addAlignEffect(selectedEntity: Entity, otherEntity: Entity) {
    this.project.effects.addEffect(
      EntityAlignEffect.fromEntity(selectedEntity.collisionBox.getRectangle(), otherEntity.collisionBox.getRectangle()),
    );
  }

  /**
   * 将一个节点对齐到另一个节点
   * @param selectedEntity
   * @param otherEntity
   * @returns 返回吸附距离
   */
  private onEntityMoveAlignToTargetEntityX(selectedEntity: Entity, otherEntity: Entity, isPreAlign = false): number {
    const selectedRect = selectedEntity.collisionBox.getRectangle();
    const otherRect = otherEntity.collisionBox.getRectangle();
    const distanceList = [
      otherRect.left - selectedRect.left,
      otherRect.center.x - selectedRect.center.x,
      otherRect.right - selectedRect.right,
    ];
    const minDistance = ArrayFunctions.getMinAbsValue(distanceList);
    if (Math.abs(minDistance) < 25) {
      if (!isPreAlign) {
        selectedEntity.move(new Vector(minDistance, 0));
      }
      // 添加特效
      this._addAlignEffect(selectedEntity, otherEntity);
      return minDistance;
    } else {
      return 0;
    }
  }

  private onEntityMoveAlignToTargetEntityY(selectedEntity: Entity, otherEntity: Entity, isPreAlign = false): number {
    const selectedRect = selectedEntity.collisionBox.getRectangle();
    const otherRect = otherEntity.collisionBox.getRectangle();
    const distanceList = [
      otherRect.top - selectedRect.top,
      otherRect.center.y - selectedRect.center.y,
      otherRect.bottom - selectedRect.bottom,
    ];
    const minDistance = ArrayFunctions.getMinAbsValue(distanceList);
    if (Math.abs(minDistance) < 25) {
      if (!isPreAlign) {
        selectedEntity.move(new Vector(0, minDistance));
      }
      // 添加特效
      this._addAlignEffect(selectedEntity, otherEntity);
      return minDistance;
    } else {
      return 0;
    }
  }

  // 假设你有一个方法可以计算两个节点之间的距离
  private calculateDistance(entityA: Entity, entityB: Entity) {
    const rectA = entityA.collisionBox.getRectangle();
    const rectB = entityB.collisionBox.getRectangle();

    // 计算距离，可以根据需要选择合适的距离计算方式
    const dx = rectA.center.x - rectB.center.x;
    const dy = rectA.center.y - rectB.center.y;

    return Math.sqrt(dx * dx + dy * dy); // 返回欧几里得距离
  }

  /**
   * 自动布局树形结构
   * @param selectedRootEntity
   */
  autoLayoutSelectedFastTreeMode(selectedRootEntity: ConnectableEntity) {
    // 检测树形结构
    if (!this.project.graphMethods.isTree(selectedRootEntity)) {
      // 不是树形结构，不做任何处理
      toast.error("选择的节点必须是树形结构，不能有菱形、环、等复杂结构");
      return;
    }
    this.project.autoLayoutFastTree.autoLayoutFastTreeMode(selectedRootEntity);
  }
}
