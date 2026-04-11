import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { RectangleFadeEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleFadeEffect";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { isMac } from "@/utils/platform";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 框选引擎
 * 因为不止鼠标会用到框选，mac下的空格+双指移动可能也用到框选功能
 * 所以框选功能单独抽离成一个引擎，提供API被其他地方调用
 */
@service("rectangleSelect")
export class RectangleSelect {
  constructor(private readonly project: Project) {}
  // 开始点
  private selectStartLocation = Vector.getZero();
  // 结束点
  private selectEndLocation = Vector.getZero();
  public getSelectStartLocation(): Vector {
    return this.selectStartLocation.clone();
  }
  public getSelectEndLocation(): Vector {
    return this.selectEndLocation.clone();
  }
  private selectingRectangle: Rectangle | null = null;
  // 将框选框限制在某个section内
  private limitSection: Section | null = null;

  private isSelectDirectionRight = true;

  getRectangle(): Rectangle | null {
    return this.selectingRectangle;
  }
  public shutDown() {
    this.selectingRectangle = null;
  }

  startSelecting(worldLocation: Vector) {
    const isHaveEdgeSelected = this.project.stageManager
      .getAssociations()
      .some((association) => association.isSelected);
    const isHaveEntitySelected = this.project.stageManager.getEntities().some((entity) => entity.isSelected);

    const sections = this.project.sectionMethods.getSectionsByInnerLocation(worldLocation);
    if (sections.length === 0) {
      // 没有在任何section里按下
      this.limitSection = null;
    } else {
      this.limitSection = sections[0];
    }

    if (isHaveEntitySelected || isHaveEdgeSelected) {
      // A
      if (
        this.project.controller.pressingKeySet.has("shift") ||
        (isMac
          ? this.project.controller.pressingKeySet.has("meta")
          : this.project.controller.pressingKeySet.has("control"))
      ) {
        // 不取消选择
      } else {
        // 取消选择所
        this.project.stageManager.getStageObjects().forEach((stageObject) => {
          stageObject.isSelected = false;
        });
      }
    }
    // 更新矩形状态
    this.selectingRectangle = new Rectangle(worldLocation.clone(), Vector.getZero());
    this.selectStartLocation = worldLocation.clone();
    this.selectEndLocation = worldLocation.clone();
  }

  moveSelecting(newEndLocation: Vector) {
    if (!this.selectingRectangle) {
      return;
    }
    this.selectEndLocation = newEndLocation.clone();

    // 更新框选框
    this.selectingRectangle = Rectangle.fromTwoPoints(this.selectStartLocation, this.selectEndLocation);
    // 更新框选方向
    this.isSelectDirectionRight = this.selectStartLocation.x < this.selectEndLocation.x;

    // 框选框在 section框中的限制情况
    if (this.limitSection !== null) {
      this.selectingRectangle = Rectangle.getIntersectionRectangle(
        this.selectingRectangle,
        this.limitSection.rectangle.expandFromCenter(-10),
      );
    }

    this.updateStageObjectByMove();
    this.project.controller.isMovingEdge = false;
  }

  /**
   * 相当于鼠标松开释放
   */
  endSelecting() {
    // 保存当前框选矩形和模式，用于创建淡化特效
    const currentRectangle = this.selectingRectangle;
    const currentMode = this.getSelectMode();

    // 将所有选择到的增加到上次选择的节点中
    this.project.controller.lastSelectedEntityUUID.clear();
    for (const node of this.project.stageManager.getEntities()) {
      if (node.isSelected) {
        this.project.controller.lastSelectedEntityUUID.add(node.uuid);
      }
    }

    this.project.controller.lastSelectedEdgeUUID.clear();
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (edge.isSelected) {
        this.project.controller.lastSelectedEdgeUUID.add(edge.uuid);
      }
    }

    // 添加框选矩形淡化消失特效
    if (currentRectangle) {
      const style = this.project.stageStyleManager.currentStyle;
      // 根据框选模式决定特效样式：
      // - 碰撞框选(intersect)：只显示填充色，无边框
      // - 完全覆盖框选(contain)：只显示边框色，无填充
      const isIntersectMode = currentMode === "intersect";
      const fillColor = isIntersectMode ? style.SelectRectangleFill.clone() : Color.Transparent;
      const strokeColor = isIntersectMode ? Color.Transparent : style.SelectRectangleBorder.toNewAlpha(1);
      const strokeWidth = isIntersectMode ? 0 : 1;

      const effect = new RectangleFadeEffect(
        new ProgressNumber(0, 20),
        currentRectangle,
        fillColor,
        strokeColor,
        strokeWidth,
      );
      this.project.effects.addEffect(effect);
    }

    this.selectingRectangle = null;
  }

  private updateStageObjectByMove() {
    if (
      this.project.controller.pressingKeySet.has("shift") ||
      (isMac
        ? this.project.controller.pressingKeySet.has("meta")
        : this.project.controller.pressingKeySet.has("control"))
    ) {
      // 移动过程中不先暴力清除
    } else {
      // 先清空所有已经选择了的
      this.project.stageManager.getStageObjects().forEach((stageObject) => {
        stageObject.isSelected = false;
      });
    }

    if (
      isMac ? this.project.controller.pressingKeySet.has("meta") : this.project.controller.pressingKeySet.has("control")
    ) {
      // 交叉选择，没的变有，有的变没
      for (const entity of this.project.stageManager.getEntities()) {
        if (entity.isHiddenBySectionCollapse) {
          continue;
        }
        // 检查实体是否是背景图片
        if (entity instanceof ImageNode && (entity as ImageNode).isBackground) {
          continue;
        }
        if (this.isSelectWithEntity(entity)) {
          if (this.project.controller.lastSelectedEntityUUID.has(entity.uuid)) {
            entity.isSelected = false;
          } else {
            entity.isSelected = true;
          }
        }
      }
      for (const association of this.project.stageManager.getAssociations()) {
        if (this.isSelectWithEntity(association)) {
          if (this.project.controller.lastSelectedEdgeUUID.has(association.uuid)) {
            association.isSelected = false;
          } else {
            association.isSelected = true;
          }
        }
      }
    } else {
      let isHaveEntity = false;
      // 框选逻辑优先级：
      // Entity > Edge

      // Entity
      if (!isHaveEntity) {
        for (const otherEntities of this.project.stageManager.getEntities()) {
          // if (otherEntities instanceof Section) {
          //   continue;
          // }
          if (otherEntities.isHiddenBySectionCollapse) {
            continue;
          }

          // 检查实体是否是背景图片
          if (otherEntities instanceof ImageNode && (otherEntities as ImageNode).isBackground) {
            continue;
          }

          if (this.isSelectWithEntity(otherEntities)) {
            otherEntities.isSelected = true;
            isHaveEntity = true;
          }
        }
      }

      // Edge
      if (!isHaveEntity) {
        // 如果已经有节点被选择了，则不能再选择边了
        for (const edge of this.project.stageManager.getAssociations()) {
          if (edge instanceof Edge && edge.isHiddenBySectionCollapse) {
            continue;
          }
          if (this.isSelectWithEntity(edge)) {
            edge.isSelected = true;
          }
        }
      }
    }
    this.project.controllerUtils.selectedEntityNormalizing();
  }

  /**
   * 判断当前的框选框是否选中了某个实体
   * @param entity
   */
  private isSelectWithEntity(entity: StageObject) {
    if (entity.collisionBox && this.selectingRectangle) {
      const mode = this.getSelectMode();
      if (mode === "intersect") {
        return entity.collisionBox.isIntersectsWithRectangle(this.selectingRectangle);
      } else {
        return entity.collisionBox.isContainedByRectangle(this.selectingRectangle);
      }
    }
    return false;
  }

  // 获取此时此刻应该的框选逻辑
  public getSelectMode(): "contain" | "intersect" {
    if (this.isSelectDirectionRight) {
      return Settings.rectangleSelectWhenRight;
    } else {
      return Settings.rectangleSelectWhenLeft;
    }
  }

  // 获取框选的移动距离
  public getSelectMoveDistance(): number {
    return this.selectStartLocation.distance(this.selectEndLocation);
  }
}
