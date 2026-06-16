import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { ShakeDetector } from "@/core/service/controlService/controller/utils/ShakeDetector";
import { ConnectNodeSmartTools } from "@/core/service/dataManageService/connectNodeSmartTools";
import { RectangleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { RectangleRenderEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleRenderEffect";
import { Settings } from "@/core/service/Settings";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Section } from "@/core/stage/stageObject/entity/Section";
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
  private shakeDetector = new ShakeDetector();
  /** 按住 Shift 拖拽时锁定的移动轴，null 表示尚未确定 */
  private shiftAxisLock: "x" | "y" | null = null;
  /** 按住 Shift 拖拽时，相对于按下时世界坐标的累计位移，用于确定锁定轴 */
  private shiftAccumulatedDelta = Vector.getZero();

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

    // 检查点击的物体是否在锁定的 section 内
    if (clickedStageObject && clickedStageObject instanceof Entity) {
      if (clickedStageObject instanceof Section) {
        const outermostLockedAncestor =
          this.project.sectionMethods.getOutermostLockedAncestorSection(clickedStageObject);
        if (outermostLockedAncestor) {
          this.project.stageManager.getStageObjects().forEach((obj) => {
            obj.isSelected = false;
          });
          outermostLockedAncestor.isSelected = true;
          this.isMovingEntity = true;
          return;
        }
      } else {
        // 对于其他实体：如果有锁定的祖先section，转而选中并拖动最外层锁定section
        if (this.project.sectionMethods.isObjectBeLockedBySection(clickedStageObject)) {
          const outermostLockedSection =
            this.project.sectionMethods.getOutermostLockedAncestorSection(clickedStageObject);
          if (outermostLockedSection) {
            this.project.stageManager.getStageObjects().forEach((obj) => {
              obj.isSelected = false;
            });
            outermostLockedSection.isSelected = true;
            this.isMovingEntity = true;
          }
          return;
        }
      }
    }

    // 防止跳跃式移动的时候改变选中内容
    if (this.project.controller.pressingKeySet.has("alt")) {
      return;
    }

    // 单击选中
    if (clickedStageObject !== null) {
      this.isMovingEntity = true;
      this.shakeDetector.reset(); // 开始拖拽时重置摇晃检测器
      this.shiftAxisLock = null;
      this.shiftAccumulatedDelta = Vector.getZero();

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
    let diffLocation = worldLocation.subtract(this.lastMoveLocation);

    {
      // 按住 Shift 键：锁定水平或垂直方向移动
      const isShiftPressed = this.project.controller.pressingKeySet.has("shift");
      if (isShiftPressed) {
        // 累计位移用于确定锁定轴（避免刚按下时微小抖动误判方向）
        this.shiftAccumulatedDelta = this.shiftAccumulatedDelta.add(diffLocation);
        if (this.shiftAxisLock === null) {
          const absX = Math.abs(this.shiftAccumulatedDelta.x);
          const absY = Math.abs(this.shiftAccumulatedDelta.y);
          // 累计位移超过 3 像素时才确定轴方向
          if (absX > 3 || absY > 3) {
            this.shiftAxisLock = absX >= absY ? "x" : "y";
          }
        }
        // 锁定后，将垂直于锁定轴的分量清零
        if (this.shiftAxisLock === "x") {
          diffLocation = new Vector(diffLocation.x, 0);
        } else if (this.shiftAxisLock === "y") {
          diffLocation = new Vector(0, diffLocation.y);
        }
      } else {
        // Shift 松开时重置锁定状态
        this.shiftAxisLock = null;
        this.shiftAccumulatedDelta = Vector.getZero();
      }
    }

    if (this.project.stageManager.isHaveEntitySelected()) {
      // 移动节点
      this.isMovingEntity = true;
      // 暂不监听alt键。因为windows下切换窗口时，alt键释放监听不到
      const isControlPressed = isMac
        ? this.project.controller.pressingKeySet.has("meta")
        : this.project.controller.pressingKeySet.has("control");

      // 根据模式选择移动方式
      if (Settings.reverseTreeMoveMode) {
        // 反转模式：默认树形移动，按住Ctrl键单一移动
        if (isControlPressed) {
          this.project.entityMoveManager.moveSelectedEntities(diffLocation);
        } else {
          this.project.entityMoveManager.moveEntitiesWithChildren(diffLocation);
        }
      } else {
        // 正常模式：默认单一移动，按住Ctrl键树形移动
        if (isControlPressed) {
          this.project.entityMoveManager.moveEntitiesWithChildren(diffLocation);
        } else {
          this.project.entityMoveManager.moveSelectedEntities(diffLocation);
        }
      }

      // 预瞄反馈
      if (Settings.enableDragAutoAlign) {
        this.project.autoAlign.preAlignAllSelected();
      }

      // 检测摇晃动作 - 只在开启设置且选中单个节点时检测
      if (Settings.enableDragNodeShakeDetachFromEdge && !this.shakeDetector.hasTriggered()) {
        const selectedEntities = this.project.stageManager.getSelectedEntities();
        if (selectedEntities.length === 1) {
          // 使用窗口坐标（屏幕像素）进行摇晃检测，与世界坐标缩放无关
          const viewLocation = new Vector(event.clientX, event.clientY);
          const isShaking = this.shakeDetector.addSample(viewLocation, Date.now());
          if (isShaking) {
            // 检测到摇晃，触发节点脱离（不向上平移）
            ConnectNodeSmartTools.removeNodeFromTree(this.project, false);
          }
        }
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
    this.shakeDetector.reset();
    this.shiftAxisLock = null;
    this.shiftAccumulatedDelta = Vector.getZero();
  };

  public mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector): void {
    super.mouseMoveOutWindowForcedShutdown(_outsideLocation);
    this.isMovingEntity = false;
  }
}
