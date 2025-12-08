import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { RectangleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { RectangleRenderEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleRenderEffect";
import { Settings } from "@/core/service/Settings";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 拖拽节点使其移动的控制器
 *
 */
export class ControllerEntityClickSelectAndMoveClass extends ControllerClass {
  private isMovingEntity = false;
  private mouseDownViewLocation = Vector.getZero();

  public mousedown: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    this.mouseDownViewLocation = new Vector(event.clientX, event.clientY);

    const pressWorldLocation = this.project.renderer.transformView2World(this.mouseDownViewLocation);
    this.lastMoveLocation = pressWorldLocation.clone();

    // 检查是否点击了缩放控制点，如果是，就不要触发移动事件
    if (this.project.controllerUtils.isClickedResizeRect(pressWorldLocation)) {
      return;
    }

    const clickedStageObject = this.project.controllerUtils.getClickedStageObject(pressWorldLocation);

    // 防止跳跃式移动的时候改变选中内容
    if (this.project.controller.pressingKeySet.has("alt")) {
      return;
    }

    // 单击选中
    if (clickedStageObject !== null) {
      this.isMovingEntity = true;

      if (
        this.project.controller.pressingKeySet.has("shift") &&
        (isMac
          ? this.project.controller.pressingKeySet.has("meta")
          : this.project.controller.pressingKeySet.has("control"))
      ) {
        // ctrl + shift 同时按下
        clickedStageObject.isSelected = !clickedStageObject.isSelected;
      } else if (this.project.controller.pressingKeySet.has("shift")) {
        // shift 按下，只选中节点
        clickedStageObject.isSelected = true;
        // 没有实体被选中则return
        if (this.project.stageManager.getSelectedEntities().length === 0) return;
        const rectangles = this.project.stageManager
          .getSelectedEntities()
          .map((entity) => entity.collisionBox.getRectangle());
        const boundingRectangle = Rectangle.getBoundingRectangle(rectangles);
        this.project.effects.addEffect(RectangleRenderEffect.fromShiftClickSelect(boundingRectangle));
        this.project.effects.addEffect(RectangleNoteEffect.fromShiftClickSelect(this.project, boundingRectangle));
        for (const entity of this.project.stageManager.getStageObjects()) {
          if (entity.collisionBox.isIntersectsWithRectangle(boundingRectangle)) {
            entity.isSelected = true;
          }
        }
      } else if (
        isMac
          ? this.project.controller.pressingKeySet.has("meta")
          : this.project.controller.pressingKeySet.has("control")
      ) {
        // ctrl 按下，只选中节点，不能模仿windows文件管理器设置成反选，否则会和直接移动节点子树冲突
        clickedStageObject.isSelected = true;
      } else {
        // 直接点击
        if (!clickedStageObject.isSelected) {
          // 清空所有其他节点的选中状态
          this.project.stageManager.getStageObjects().forEach((stageObject) => {
            if (stageObject === clickedStageObject) {
              return;
            }
            stageObject.isSelected = false;
          });
        }

        // 选中点击节点的状态
        clickedStageObject.isSelected = true;
      }
    } else {
      // 未点击到节点
    }
  };

  public mousemove: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (
      this.project.controller.rectangleSelect.isUsing ||
      this.project.controller.cutting.isUsing ||
      this.project.controller.pressingKeySet.has("alt")
    ) {
      return;
    }
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }
    if (!this.isMovingEntity) {
      return;
    }
    const worldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    const diffLocation = worldLocation.subtract(this.lastMoveLocation);

    if (this.project.stageManager.isHaveEntitySelected()) {
      // 移动节点
      this.isMovingEntity = true;
      // 暂不监听alt键。因为windows下切换窗口时，alt键释放监听不到
      if (
        isMac
          ? this.project.controller.pressingKeySet.has("meta")
          : this.project.controller.pressingKeySet.has("control")
      ) {
        // 和子节点一起移动
        this.project.entityMoveManager.moveConnectableEntitiesWithChildren(diffLocation);
      } else {
        this.project.entityMoveManager.moveSelectedEntities(diffLocation);
      }

      // 预瞄反馈
      if (Settings.enableDragAutoAlign) {
        this.project.autoAlign.preAlignAllSelected();
      }

      this.lastMoveLocation = worldLocation.clone();
    }
  };

  public mouseup: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (Settings.mouseLeftMode !== "selectAndMove") {
      return;
    }

    const mouseUpViewLocation = new Vector(event.clientX, event.clientY);
    const diffLocation = mouseUpViewLocation.subtract(this.mouseDownViewLocation);
    if (diffLocation.magnitude() > 5) {
      // 判定为有效吸附的拖拽操作
      if (this.isMovingEntity) {
        // 这个时候可以触发对齐吸附事件
        if (Settings.enableDragAutoAlign) {
          this.project.autoAlign.alignAllSelected();
        }
        if (Settings.enableDragAlignToGrid) {
          this.project.autoAlign.alignAllSelectedToGrid();
        }

        this.project.historyManager.recordStep(); // 记录一次历史
      }
    }

    this.isMovingEntity = false;
  };

  public mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector): void {
    super.mouseMoveOutWindowForcedShutdown(_outsideLocation);
    this.isMovingEntity = false;
  }
}
