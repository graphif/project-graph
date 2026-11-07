import { ArrayFunctions } from "@/core/algorithm/arrayFunctions";
import { Project, service } from "@/core/Project";
import { EntityAlignEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityAlignEffect";
import { RectangleRenderEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleRenderEffect";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { showTreeValidationErrors } from "@/utils/treeValidation";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 自动对齐和布局管理器
 */
@service("autoAlign")
export class AutoAlign {
  constructor(private readonly project: Project) {}

  private getSelectionOuterRectangle(entities: Entity[]): Rectangle | null {
    if (entities.length === 0) return null;
    let minLeft = Number.POSITIVE_INFINITY;
    let minTop = Number.POSITIVE_INFINITY;
    let maxRight = Number.NEGATIVE_INFINITY;
    let maxBottom = Number.NEGATIVE_INFINITY;
    for (const entity of entities) {
      const rect = entity.collisionBox.getRectangle();
      minLeft = Math.min(minLeft, rect.left);
      minTop = Math.min(minTop, rect.top);
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
    }
    return new Rectangle(new Vector(minLeft, minTop), new Vector(maxRight - minLeft, maxBottom - minTop));
  }

  private calculateDistanceByRectangle(rectA: Rectangle, rectB: Rectangle) {
    const dx = rectA.center.x - rectB.center.x;
    const dy = rectA.center.y - rectB.center.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private alignRectangleToTargetX(selectedRect: Rectangle, otherRect: Rectangle): number {
    const distanceList = [
      otherRect.left - selectedRect.left,
      otherRect.center.x - selectedRect.center.x,
      otherRect.right - selectedRect.right,
    ];
    const minDistance = ArrayFunctions.getMinAbsValue(distanceList);
    return Math.abs(minDistance) < 25 ? minDistance : 0;
  }

  private alignRectangleToTargetY(selectedRect: Rectangle, otherRect: Rectangle): number {
    const distanceList = [
      otherRect.top - selectedRect.top,
      otherRect.center.y - selectedRect.center.y,
      otherRect.bottom - selectedRect.bottom,
    ];
    const minDistance = ArrayFunctions.getMinAbsValue(distanceList);
    return Math.abs(minDistance) < 25 ? minDistance : 0;
  }

  private _addAlignEffectByRect(selectedRect: Rectangle, otherRect: Rectangle) {
    this.project.effects.addEffect(EntityAlignEffect.fromEntity(selectedRect, otherRect));
  }

  private getGridSnapDeltaX(rect: Rectangle) {
    const leftMod = rect.left % 50;
    const rightMode = rect.right % 50;
    const leftMoveDistance = Math.min(leftMod, 50 - leftMod);
    const rightMoveDistance = Math.min(rightMode, 50 - rightMode);
    if (leftMoveDistance < rightMoveDistance) {
      return leftMod < 50 - leftMod ? -leftMod : 50 - leftMod;
    } else {
      return rightMode < 50 - rightMode ? -rightMode : 50 - rightMode;
    }
  }

  private getGridSnapDeltaY(rect: Rectangle) {
    const topMod = rect.top % 50;
    const bottomMode = rect.bottom % 50;
    const topMoveDistance = Math.min(topMod, 50 - topMod);
    const bottomMoveDistance = Math.min(bottomMode, 50 - bottomMode);
    if (topMoveDistance < bottomMoveDistance) {
      return topMod < 50 - topMod ? -topMod : 50 - topMod;
    } else {
      return bottomMode < 50 - bottomMode ? -bottomMode : 50 - bottomMode;
    }
  }

  /**
   * 对齐到网格
   */
  alignAllSelectedToGrid() {
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    const alignEntities = selectedEntities.filter((e) => !e.isAlignExcluded);
    if (alignEntities.length === 0) return;
    if (selectedEntities.length <= 1) {
      for (const selectedEntity of alignEntities) {
        this.onEntityMoveAlignToGrid(selectedEntity);
      }
      return;
    }

    const selectionRect = this.getSelectionOuterRectangle(alignEntities);
    if (!selectionRect) return;
    const dx = this.getGridSnapDeltaX(selectionRect);
    const dy = this.getGridSnapDeltaY(selectionRect);
    if (dx === 0 && dy === 0) return;
    for (const entity of selectedEntities) {
      entity.move(new Vector(dx, dy));
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
    const alignEntities = selectedEntities.filter((e) => !e.isAlignExcluded);
    if (alignEntities.length === 0) return;
    if (selectedEntities.length <= 1) {
      this.onEntityMoveAlignToOtherEntity(alignEntities[0], otherEntities);
      return;
    }

    const selectionRect = this.getSelectionOuterRectangle(alignEntities);
    if (!selectionRect) return;
    const sortedOtherEntities = otherEntities
      .sort((a, b) => {
        const distanceA = this.calculateDistanceByRectangle(selectionRect, a.collisionBox.getRectangle());
        const distanceB = this.calculateDistanceByRectangle(selectionRect, b.collisionBox.getRectangle());
        return distanceA - distanceB;
      })
      .filter((entity) => !entity.collisionBox.getRectangle().isCollideWithRectangle(selectionRect));

    let xMoveDiff = 0;
    let yMoveDiff = 0;
    const xTargetRectangles: Rectangle[] = [];
    const yTargetRectangles: Rectangle[] = [];
    for (const otherEntity of sortedOtherEntities) {
      const otherRect = otherEntity.collisionBox.getRectangle();
      xMoveDiff = this.alignRectangleToTargetX(selectionRect, otherRect);
      if (xMoveDiff !== 0) {
        xTargetRectangles.push(otherRect);
        break;
      }
    }
    for (const otherEntity of sortedOtherEntities) {
      const otherRect = otherEntity.collisionBox.getRectangle();
      yMoveDiff = this.alignRectangleToTargetY(selectionRect, otherRect);
      if (yMoveDiff !== 0) {
        yTargetRectangles.push(otherRect);
        break;
      }
    }

    const isAlign = xMoveDiff !== 0 || yMoveDiff !== 0;
    if (!isAlign) return;
    const moveTargetRectangle = selectionRect.clone();
    moveTargetRectangle.location.x += xMoveDiff;
    moveTargetRectangle.location.y += yMoveDiff;
    for (const entity of selectedEntities) {
      entity.move(new Vector(xMoveDiff, yMoveDiff));
    }
    for (const targetRectangle of xTargetRectangles.concat(yTargetRectangles)) {
      this._addAlignEffectByRect(moveTargetRectangle, targetRectangle);
    }
    SoundService.play.alignAndAttach();
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
    const alignEntities = selectedEntities.filter((e) => !e.isAlignExcluded);
    if (alignEntities.length === 0) return;
    if (selectedEntities.length <= 1) {
      this.onEntityMoveAlignToOtherEntity(alignEntities[0], otherEntities, true);
      return;
    }

    const selectionRect = this.getSelectionOuterRectangle(alignEntities);
    if (!selectionRect) return;
    const sortedOtherEntities = otherEntities
      .sort((a, b) => {
        const distanceA = this.calculateDistanceByRectangle(selectionRect, a.collisionBox.getRectangle());
        const distanceB = this.calculateDistanceByRectangle(selectionRect, b.collisionBox.getRectangle());
        return distanceA - distanceB;
      })
      .filter((entity) => !entity.collisionBox.getRectangle().isCollideWithRectangle(selectionRect));

    let xMoveDiff = 0;
    let yMoveDiff = 0;
    const xTargetRectangles: Rectangle[] = [];
    const yTargetRectangles: Rectangle[] = [];
    for (const otherEntity of sortedOtherEntities) {
      const otherRect = otherEntity.collisionBox.getRectangle();
      xMoveDiff = this.alignRectangleToTargetX(selectionRect, otherRect);
      if (xMoveDiff !== 0) {
        xTargetRectangles.push(otherRect);
        break;
      }
    }
    for (const otherEntity of sortedOtherEntities) {
      const otherRect = otherEntity.collisionBox.getRectangle();
      yMoveDiff = this.alignRectangleToTargetY(selectionRect, otherRect);
      if (yMoveDiff !== 0) {
        yTargetRectangles.push(otherRect);
        break;
      }
    }

    const isAlign = xMoveDiff !== 0 || yMoveDiff !== 0;
    if (!isAlign) return;
    const moveTargetRectangle = selectionRect.clone();
    moveTargetRectangle.location.x += xMoveDiff;
    moveTargetRectangle.location.y += yMoveDiff;
    this.project.effects.addEffect(RectangleRenderEffect.fromPreAlign(this.project, moveTargetRectangle));
    for (const targetRectangle of xTargetRectangles.concat(yTargetRectangles)) {
      this.project.effects.addEffect(EntityAlignEffect.fromEntity(moveTargetRectangle, targetRectangle));
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
        // 排除entity是selectedEntity的父亲分组框
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

      this.project.effects.addEffect(RectangleRenderEffect.fromPreAlign(this.project, moveTargetRectangle));
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
    // 检测树形结构（跳过虚线边，虚线边不参与树形结构判断）
    const validationResult = this.project.graphMethods.validateTreeStructure(selectedRootEntity, true);
    if (!validationResult.isValid) {
      // 不是树形结构，显示详细的问题提示
      showTreeValidationErrors(validationResult, "error");
      return;
    }
    this.project.autoLayoutFastTree.autoLayoutFastTreeMode(selectedRootEntity);
  }
}
