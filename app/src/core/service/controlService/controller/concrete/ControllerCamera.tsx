/**
 * 存放具体的控制器实例
 */

import { ArrayFunctions } from "@/core/algorithm/arrayFunctions";
import { Settings } from "@/core/service/Settings";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { ControllerCameraMac } from "@/core/service/controlService/controller/concrete/ControllerCamera/mac";
import { MouseTipFeedbackEffect } from "@/core/service/feedbackService/effectEngine/concrete/MouseTipFeedbackEffect";
import { CursorNameEnum } from "@/types/cursors";
import { openBrowserOrFileByEntity } from "@/utils/externalOpen";
import { isIpad, isMac } from "@/utils/platform";
import { LimitLengthQueue, Vector } from "@graphif/data-structures";

/**
 *
 * 处理键盘按下事件
 * @param event - 键盘事件
 */
export class ControllerCameraClass extends ControllerClass {
  // 是否正在使用
  public isUsingMouseGrabMove = false;
  private lastMousePressLocation: Vector[] = [Vector.getZero(), Vector.getZero(), Vector.getZero()];
  /**
   * 是否正在使用空格+左键 拖动视野
   */
  public isPreGrabbingWhenSpace = false;

  private mac = new ControllerCameraMac(this.project);

  public keydown: (event: KeyboardEvent) => void = (event: KeyboardEvent) => {
    if (this.project.controller.isCameraLocked) {
      return;
    }
    const key = event.key.toLowerCase();

    if (key === " " && Settings.enableSpaceKeyMouseLeftDrag) {
      if (!this.isPreGrabbingWhenSpace) {
        this.isPreGrabbingWhenSpace = true;
        this.project.controller.setCursorNameHook(CursorNameEnum.Grab);
      }
    }
  };

  /**
   * 处理键盘松开事件
   * @param event - 键盘事件
   */
  public keyup: (event: KeyboardEvent) => void = (event: KeyboardEvent) => {
    if (this.project.controller.isCameraLocked) {
      return;
    }
    const key = event.key.toLowerCase();

    if (key === " ") {
      if (this.isPreGrabbingWhenSpace) {
        this.isPreGrabbingWhenSpace = false;
        this.project.controller.setCursorNameHook(CursorNameEnum.Default);
      }
    }
  };

  public mousedown = (event: MouseEvent) => {
    if (this.project.controller.isCameraLocked) {
      return;
    }
    if (event.button === 0 && this.project.controller.pressingKeySet.has(" ") && Settings.enableSpaceKeyMouseLeftDrag) {
      this.project.controller.setCursorNameHook(CursorNameEnum.Grabbing);
      this.isUsingMouseGrabMove = true;
    }
    if (event.button === 1 && Settings.mouseRightDragBackground !== "moveCamera") {
      // 中键按下
      this.isUsingMouseGrabMove = true;
    }
    if (Settings.mouseRightDragBackground === "moveCamera" && event.button === 2) {
      // 右键按下
      this.isUsingMouseGrabMove = true;
    }
    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.x, event.y));
    // 获取左右中键
    this.lastMousePressLocation[event.button] = pressWorldLocation;

    if (this.isUsingMouseGrabMove && Settings.autoRefreshStageByMouseAction) {
      // 开始刷新舞台
      this.project.stageManager.refreshAllStageObjects();
    }

    // 2025年4月28日：实验性内容
    if (event.button === 4) {
      // 前侧键按下
      this.project.camera.resetBySelected();
    } else if (event.button === 3) {
      // 后侧键按下
      this.project.camera.reset();
    }
  };

  /**
   * 处理鼠标移动事件
   * @param event - 鼠标事件
   */
  public mousemove: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (this.project.controller.isCameraLocked) {
      return;
    }
    if (!this.isUsingMouseGrabMove) {
      return;
    }
    // 空格+左键 拖动视野
    if (
      this.project.controller.pressingKeySet.has(" ") &&
      this.project.controller.isMouseDown[0] &&
      Settings.enableSpaceKeyMouseLeftDrag
    ) {
      this.moveCameraByMouseMove(event.clientX, event.clientY, 0);
      return;
    }
    // 中键按下拖动视野
    if (this.project.controller.isMouseDown[1] && Settings.mouseRightDragBackground !== "moveCamera") {
      if (event.ctrlKey) {
        // ctrl键按下时,不允许移动视野
        return;
      }
      this.moveCameraByMouseMove(event.clientX, event.clientY, 1);
      this.project.controller.setCursorNameHook(CursorNameEnum.Grabbing);
    }
    // 侧键按下拖动视野
    if (this.project.controller.isMouseDown[4]) {
      this.moveCameraByMouseMove(event.clientX, event.clientY, 4);
      this.project.controller.setCursorNameHook(CursorNameEnum.Grabbing);
    }
    if (Settings.mouseRightDragBackground === "moveCamera" && this.project.controller.isMouseDown[2]) {
      // 还要保证这个鼠标位置没有悬浮在什么东西上
      const mouseLocation = new Vector(event.clientX, event.clientY);
      const worldLocation = this.project.renderer.transformView2World(mouseLocation);
      const entity = this.project.stageManager.findEntityByLocation(worldLocation);
      if (this.project.controller.nodeConnection.isUsing) {
        return;
      }
      if (entity !== null) {
        return;
      }
      this.moveCameraByMouseMove(event.clientX, event.clientY, 2);
      this.project.controller.setCursorNameHook(CursorNameEnum.Grabbing);
    }
  };

  public mouseMoveOutWindowForcedShutdown(vectorObject: Vector) {
    super.mouseMoveOutWindowForcedShutdown(vectorObject);
    this.isUsingMouseGrabMove = false;
    this.project.controller.setCursorNameHook(CursorNameEnum.Default);
  }

  /**
   * 处理鼠标松开事件
   * @param event - 鼠标事件
   */
  public mouseup = (event: MouseEvent) => {
    if (this.project.controller.isCameraLocked) {
      return;
    }
    if (event.button === 4) {
      // this.project.camera.currentScale = this.recordCameraScale;
      // this.project.camera.currentScale = this.recordCameraScale;
      // // this.project.camera.location = this.recordCameraLocation.clone();
    }
    if (!this.isUsingMouseGrabMove) {
      return;
    }
    if (event.button === 0 && this.project.controller.pressingKeySet.has(" ")) {
      if (this.isPreGrabbingWhenSpace) {
        this.project.controller.setCursorNameHook(CursorNameEnum.Grab);
      }
    }
    if (event.button === 1) {
      // 中键松开
      this.project.controller.setCursorNameHook(CursorNameEnum.Default);
    }
    if (event.button === 4) {
      this.project.controller.setCursorNameHook(CursorNameEnum.Default);
    }
    if (event.button === 2) {
      this.project.controller.setCursorNameHook(CursorNameEnum.Default);
    }
    this.isUsingMouseGrabMove = false;
  };

  /**
   * 处理鼠标滚轮事件
   * @param event - 滚轮事件
   */
  public mousewheel = (event: WheelEvent) => {
    if (this.dealStealthMode(event)) {
      return;
    }
    if (this.project.controller.isCameraLocked) {
      return;
    }
    // 涂鸦模式下的量角器，禁止滚动
    if (Settings.mouseLeftMode === "draw" && this.project.controller.pressingKeySet.has("shift")) {
      return;
    }
    // 禁用触控板在这里的滚动
    const isUsingTouchPad = !this.isMouseWheel(event);
    if (!Settings.enableWindowsTouchPad) {
      if (isUsingTouchPad) {
        // 禁止使用触摸板
        // this.project.effects.addEffect(
        //   TextRiseEffect.default(`已禁用触控板滚动，（${event.deltaX}, ${event.deltaY}）`),
        // );
        return;
      }
    }
    // 👇下面都是允许使用触控板的操作
    if (isUsingTouchPad) {
      // 是触控板
      // zoomCameraByTouchPadTwoFingerMove(event);
      this.moveCameraByTouchPadTwoFingerMove(event);
      return;
    }
    if (isMac) {
      // 检测一下是否是双指缩放
      if (this.mac.isTouchPadTwoFingerScale(event)) {
        // 双指缩放
        this.mac.handleTwoFingerScale(event);
        return;
      }
    }

    this.mousewheelFunction(event);
  };

  private dealStealthMode(event: WheelEvent) {
    if (Settings.isStealthModeEnabled && this.project.controller.pressingKeySet.has("shift")) {
      console.log(event);
      let delta = 0;

      if (isMac) {
        delta = event.deltaX > 0 ? -10 : 10;
      } else {
        delta = event.deltaY > 0 ? -10 : 10;
      }
      const newRadius = Math.max(10, Math.min(500, Settings.stealthModeScopeRadius + delta));
      Settings.stealthModeScopeRadius = newRadius;
      this.project.effects.addEffect(MouseTipFeedbackEffect.default(delta > 0 ? "expand" : "shrink"));
      return true;
    }
    return false;
  }

  /**
   * 在上游代码已经确认是鼠标滚轮事件，这里进行处理
   * @param event
   * @returns
   */
  private mousewheelFunction(event: WheelEvent) {
    // 获取触发滚轮的鼠标位置
    const mouseLocation = new Vector(event.clientX, event.clientY);
    // 计算鼠标位置在视野中的位置
    const worldLocation = this.project.renderer.transformView2World(mouseLocation);
    this.project.camera.targetLocationByScale = worldLocation;

    if (this.project.controller.pressingKeySet.has("shift")) {
      if (Settings.mouseWheelWithShiftMode === "zoom") {
        this.zoomCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithShiftMode === "move") {
        this.moveYCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithShiftMode === "moveX") {
        this.moveXCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithShiftMode === "none") {
        return;
      }
    } else if (
      this.project.controller.pressingKeySet.has("control") ||
      this.project.controller.pressingKeySet.has("meta")
    ) {
      // 不要在节点上滚动
      if (Settings.mouseWheelWithCtrlMode === "zoom") {
        this.zoomCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithCtrlMode === "move") {
        this.moveYCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithCtrlMode === "moveX") {
        this.moveXCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithCtrlMode === "none") {
        return;
      }
    } else if (this.project.controller.pressingKeySet.has("alt")) {
      if (Settings.mouseWheelWithAltMode === "zoom") {
        this.zoomCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithAltMode === "move") {
        this.moveYCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithAltMode === "moveX") {
        this.moveXCameraByMouseWheel(event);
      } else if (Settings.mouseWheelWithAltMode === "none") {
        return;
      }
    } else {
      if (Settings.mouseWheelMode === "zoom") {
        this.zoomCameraByMouseWheel(event);
      } else if (Settings.mouseWheelMode === "move") {
        this.moveYCameraByMouseWheel(event);
      } else if (Settings.mouseWheelMode === "moveX") {
        this.moveXCameraByMouseWheel(event);
      } else if (Settings.mouseWheelMode === "none") {
        return;
      }
    }

    // 滚轮横向滚动是水平移动
    this.moveCameraByMouseSideWheel(event);
  }

  /**
   * 处理鼠标双击事件
   * @param event - 鼠标事件
   */
  public mouseDoubleClick: (event: MouseEvent) => void = (event: MouseEvent) => {
    if (event.button === 1 && !this.project.controller.isCameraLocked) {
      if (event.ctrlKey) {
        return;
      }

      // 中键双击
      const pressLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
      const clickedEntity = this.project.stageManager.findEntityByLocation(pressLocation);
      if (clickedEntity !== null) {
        // 实体上双击中键：打开 URL / 文件（独立开关）
        if (Settings.doubleClickMiddleMouseButtonOnEntity === "openUrl") {
          openBrowserOrFileByEntity(clickedEntity, this.project);
        }
      } else {
        // 空白处双击中键：重置视野（原设置项控制）
        if (Settings.doubleClickMiddleMouseButton !== "none") {
          this.project.camera.resetBySelected();
        }
      }
    }
  };

  /**
   * 根据鼠标移动位置移动摄像机
   * @param x - 鼠标在X轴的坐标
   * @param y - 鼠标在Y轴的坐标
   * @param mouseIndex - 鼠标按钮索引
   */
  private moveCameraByMouseMove(x: number, y: number, mouseIndex: number) {
    const currentMouseMoveLocation = this.project.renderer.transformView2World(new Vector(x, y));
    const diffLocation = currentMouseMoveLocation.subtract(this.lastMousePressLocation[mouseIndex]);
    this.project.effects.addEffect(MouseTipFeedbackEffect.default("drag"));
    this.project.camera.location = this.project.camera.location.subtract(diffLocation);
  }

  private moveCameraByTouchPadTwoFingerMove(event: WheelEvent) {
    if (isMac) {
      this.mac.moveCameraByTouchPadTwoFingerMove(event);
      return;
    }
    // 过滤 -0
    if (Math.abs(event.deltaX) < 0.01 && Math.abs(event.deltaY) < 0.01) {
      return;
    }
    const dx = event.deltaX / 500;
    const dy = event.deltaY / 500;
    const diffLocation = new Vector(dx, dy).multiply((Settings.moveAmplitude * 50) / this.project.camera.currentScale);
    this.project.effects.addEffect(MouseTipFeedbackEffect.directionObject(diffLocation));
    this.project.camera.location = this.project.camera.location.add(diffLocation);
  }

  private zoomCameraByMouseWheel(event: WheelEvent) {
    if (isMac) {
      // mac电脑滚动一格滚轮会触发很多次事件。这个列表里是每个事件的deltaY
      // [7, 7, 7, 7, 6, 7, 7, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 1, 1, 1, 1, 1]
      if (Settings.macMouseWheelIsSmoothed) {
        // 盲猜是开了平滑滚动了
        const deltaY = event.deltaY;
        this.project.camera.targetScale *= 1 + deltaY / 500;
      } else {
        // 如果没有开平滑滚动
        if (event.deltaY > 0) {
          this.project.camera.targetScale *= 0.8;
          this.project.effects.addEffect(MouseTipFeedbackEffect.default("shrink"));
        } else if (event.deltaY < 0) {
          this.project.camera.targetScale *= 1.2;
          this.project.effects.addEffect(MouseTipFeedbackEffect.default("expand"));
        }
      }
    } else {
      if (event.deltaY > 0) {
        this.project.camera.targetScale *= 0.8;
        this.project.effects.addEffect(MouseTipFeedbackEffect.default("shrink"));
      } else if (event.deltaY < 0) {
        this.project.camera.targetScale *= 1.2;
        this.project.effects.addEffect(MouseTipFeedbackEffect.default("expand"));
      }
    }
  }

  private moveYCameraByMouseWheel(event: WheelEvent) {
    this.project.camera.bombMove(
      this.project.camera.location.add(
        new Vector(0, (Settings.moveAmplitude * event.deltaY * 0.5) / this.project.camera.currentScale),
      ),
    );
    if (event.deltaY > 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveDown"));
    } else if (event.deltaY < 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveUp"));
    }
  }

  private moveCameraByMouseSideWheel(event: WheelEvent) {
    if (event.deltaX === 0) {
      return;
    }
    if (Settings.mouseSideWheelMode === "zoom") {
      this.zoomCameraByMouseSideWheel(event);
    } else if (Settings.mouseSideWheelMode === "move") {
      this.moveYCameraByMouseSideWheel(event);
    } else if (Settings.mouseSideWheelMode === "moveX") {
      this.moveXCameraByMouseSideWheel(event);
    } else if (Settings.mouseSideWheelMode === "none") {
      return;
    } else if (Settings.mouseSideWheelMode === "cameraMoveToMouse") {
      // 先测试性的加一个，将准星向鼠标位置移动
      const mouseLocation = new Vector(event.clientX, event.clientY);
      const mouseWorldLocation = this.project.renderer.transformView2World(mouseLocation);
      let diffLocation = mouseWorldLocation.subtract(this.project.camera.location).multiply(0.75);
      if (event.deltaX < 0) {
        diffLocation = diffLocation.multiply(-1);
        this.project.effects.addEffect(MouseTipFeedbackEffect.default("cameraBackToMouse"));
      } else {
        // 正常
        this.project.effects.addEffect(MouseTipFeedbackEffect.default("cameraMoveToMouse"));
      }
      const moveToLocation = this.project.camera.location.add(diffLocation);
      this.project.camera.bombMove(moveToLocation);
    } else if (Settings.mouseSideWheelMode === "adjustWindowOpacity") {
      const currentValue = Settings.windowBackgroundAlpha;
      if (event.deltaX < 0) {
        Settings.windowBackgroundAlpha = Math.min(1, currentValue + 0.1);
      } else {
        Settings.windowBackgroundAlpha = Math.max(0, currentValue - 0.1);
      }
    } else if (Settings.mouseSideWheelMode === "adjustPenStrokeWidth") {
      if (Settings.mouseLeftMode !== "draw") {
        return;
      }
      // TODO: 调整笔画粗细
      // if (event.deltaX < 0) {
      //   const newWidth = this.project.controller.penStrokeDrawing.currentStrokeWidth + 1;
      //   this.project.controller.penStrokeDrawing.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));
      //   toast(`画笔粗细: ${this.project.controller.penStrokeDrawing.currentStrokeWidth}px`);
      // } else {
      //   const newWidth = this.project.controller.penStrokeDrawing.currentStrokeWidth - 1;
      //   this.project.controller.penStrokeDrawing.currentStrokeWidth = Math.max(1, Math.min(newWidth, 1000));
      //   toast(`画笔粗细: ${this.project.controller.penStrokeDrawing.currentStrokeWidth}px`);
      // }
    }
  }

  private zoomCameraByMouseSideWheel(event: WheelEvent) {
    if (event.deltaX > 0) {
      this.project.camera.targetScale *= 0.8;
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("shrink"));
    } else if (event.deltaX < 0) {
      this.project.camera.targetScale *= 1.2;
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("expand"));
    }
  }

  private moveYCameraByMouseSideWheel(event: WheelEvent) {
    this.project.camera.location = this.project.camera.location.add(
      new Vector(0, (Settings.moveAmplitude * event.deltaX * 0.5) / this.project.camera.currentScale),
    );
    if (event.deltaX > 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveDown"));
    } else if (event.deltaX < 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveUp"));
    }
  }

  private moveXCameraByMouseWheel(event: WheelEvent) {
    this.project.camera.bombMove(
      this.project.camera.location.add(
        new Vector((Settings.moveAmplitude * event.deltaY * 0.5) / this.project.camera.currentScale, 0),
      ),
    );
    if (event.deltaY > 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveRight"));
    } else if (event.deltaY < 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveLeft"));
    }
  }

  private moveXCameraByMouseSideWheel(event: WheelEvent) {
    this.project.camera.bombMove(
      this.project.camera.location.add(
        new Vector((Settings.moveAmplitude * event.deltaX * 0.5) / this.project.camera.currentScale, 0),
      ),
    );
    if (event.deltaX > 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveRight"));
    } else if (event.deltaX < 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveLeft"));
    }
  }

  /**
   *
   * 区分滚轮和触摸板的核心函数
   * 返回true：是鼠标滚轮事件
   * 返回false：是触摸板事件
   * @param event
   * @returns
   */
  private isMouseWheel(event: WheelEvent): boolean {
    if (isIpad || isMac) {
      return this.mac.isMouseWheel(event);
    }

    // 不是mac系统 ======

    if (event.deltaX !== 0 && event.deltaY !== 0) {
      // 斜向滚动肯定不是鼠标滚轮。因为滚轮只有横向滚轮和竖向滚轮
      return false;
    }
    if (event.deltaX === 0 && event.deltaY === 0) {
      // 无意义的滚动事件
      return false;
    }

    // 纯竖向滚动
    if (event.deltaX === 0 && event.deltaY !== 0) {
      const distance = Math.abs(event.deltaY);
      if (distance < 20) {
        // 缓慢滚动是触摸板
        return false;
      }
      if (this.addDistanceNumberAndDetect(distance)) {
        return true;
      }
    }

    // 纯横向滚动
    if (event.deltaX !== 0 && event.deltaY === 0) {
      const distance = Math.abs(event.deltaX);
      if (distance < 20) {
        // 缓慢滚动是触摸板
        return false;
      }
      if (this.addDistanceNumberAndDetect(distance)) {
        return true;
      }
    }
    return false;
  }

  private addDistanceNumberAndDetect(distance: number): boolean {
    // 开始序列化检测
    this.detectDeltaY.enqueue(distance);
    const multiArray = this.detectDeltaY.multiGetTail(4);
    if (multiArray.length >= 4) {
      if (ArrayFunctions.isSame(multiArray)) {
        // 检测到关键数字
        this.importantNumbers.add(distance);
        // 连续4个都一样，说明是滚轮
        // 实测发现连续三个都一样，用滚轮极小概率触发。四个都一样几乎不太可能了
        return true;
      }
    } else {
      // 长度还不足 说明刚打开软件，可能拨动了两下滚轮，也可能滑动了一下触摸板
      // 先按滚轮算
      return true;
    }

    // 是整数倍
    for (const importNumber of this.importantNumbers) {
      if (distance % importNumber === 0) {
        return true;
      }
    }
    return false;
  }

  private detectDeltaY: LimitLengthQueue<number> = new LimitLengthQueue<number>(100);
  private importantNumbers: Set<number> = new Set<number>([]); // 100, 133, 138, 166
}
