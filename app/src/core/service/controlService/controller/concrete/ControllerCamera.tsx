/**
 * 存放具体的控制器实例
 */

import { Settings } from "@/core/service/Settings";
import { Camera } from "@/core/stage/Camera";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { ControllerCameraMac } from "@/core/service/controlService/controller/concrete/ControllerCamera/mac";
import { MouseTipFeedbackEffect } from "@/core/service/feedbackService/effectEngine/concrete/MouseTipFeedbackEffect";
import { CursorNameEnum } from "@/types/cursors";
import { openBrowserOrFileByEntity } from "@/utils/externalOpen";
import { isIpad, isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";

/**
 *
 * 处理键盘按下事件
 * @param event - 键盘事件
 */
export class ControllerCameraClass extends ControllerClass {
  protected get allowViewerModeInteraction(): boolean {
    return true;
  }

  // 是否正在使用
  public isUsingMouseGrabMove = false;
  private dragButton: number | null = null;
  private lastDragPoint = Vector.getZero();
  /**
   * 是否正在使用空格+左键 拖动视野
   */
  public isPreGrabbingWhenSpace = false;

  private mac = new ControllerCameraMac(this.project);
  private previousPinchPoint: Vector | null = null;
  private previousWheelPinchPoint: Vector | null = null;
  private lastWheelPinchTime = 0;
  private lastZoomFeedbackTime = -Infinity;

  public keydown: (event: KeyboardEvent) => void = (event: KeyboardEvent) => {
    if (this.project.controller.isCameraLocked) {
      return;
    }
    const key = event.key.toLowerCase();

    if (key === " " && Settings.enableSpaceKeyMouseLeftDrag) {
      if (!this.isPreGrabbingWhenSpace) {
        this.isPreGrabbingWhenSpace = true;
        this.project.controller.setCursorName(CursorNameEnum.Grab);
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
        if (!this.isUsingMouseGrabMove) this.project.controller.setCursorName(CursorNameEnum.Default);
      }
    }
  };

  public mousedown = (event: MouseEvent) => {
    if (this.project.controller.isCameraLocked) {
      return;
    }
    const point = new Vector(event.clientX, event.clientY);
    const spaceDrag =
      event.button === 0 && this.project.controller.pressingKeySet.has(" ") && Settings.enableSpaceKeyMouseLeftDrag;
    const middleDrag = event.button === 1 && !event.ctrlKey && Settings.mouseRightDragBackground !== "moveCamera";
    const rightDrag =
      event.button === 2 &&
      Settings.mouseRightDragBackground === "moveCamera" &&
      this.project.stageManager.findEntityByLocation(this.project.renderer.transformView2World(point)) === null;
    if (spaceDrag || middleDrag || rightDrag) {
      this.dragButton = event.button;
      this.lastDragPoint = point;
      this.isUsingMouseGrabMove = true;
      this.project.camera.stopImmediately();
      this.project.controller.setCursorName(CursorNameEnum.Grabbing);
    }

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
    if (this.dragButton === null || !this.project.controller.isMouseDown[this.dragButton]) return;
    if (this.dragButton === 2 && this.project.controller.nodeConnection.isUsing) return;
    const point = new Vector(event.clientX, event.clientY);
    this.project.camera.panByViewDelta(this.lastDragPoint.subtract(point));
    this.lastDragPoint = point;
  };

  public mouseMoveOutWindowForcedShutdown(vectorObject: Vector) {
    super.mouseMoveOutWindowForcedShutdown(vectorObject);
    this.isUsingMouseGrabMove = false;
    this.dragButton = null;
    this.project.controller.setCursorName(CursorNameEnum.Default);
  }

  /**
   * 处理鼠标松开事件
   * @param event - 鼠标事件
   */
  public mouseup = (event: MouseEvent) => {
    if (event.button !== this.dragButton) return;
    if (!this.isUsingMouseGrabMove) {
      return;
    }
    if (event.button === 0 && this.project.controller.pressingKeySet.has(" ")) {
      if (this.isPreGrabbingWhenSpace) {
        this.project.controller.setCursorName(CursorNameEnum.Grab);
      }
    }
    if (event.button === 1) {
      // 中键松开
      this.project.controller.setCursorName(CursorNameEnum.Default);
    }
    if (event.button === 4) {
      this.project.controller.setCursorName(CursorNameEnum.Default);
    }
    if (event.button === 2) {
      this.project.controller.setCursorName(CursorNameEnum.Default);
    }
    this.isUsingMouseGrabMove = false;
    this.dragButton = null;
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
    if (
      event.ctrlKey &&
      !this.project.controller.pressingKeySet.has("control") &&
      event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
    ) {
      if (Settings.enableWindowsTouchPad) this.handleTouchPadPinch(event);
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

  private handleTouchPadPinch(event: WheelEvent) {
    const point = new Vector(event.clientX, event.clientY);
    const previousPoint =
      event.timeStamp - this.lastWheelPinchTime < 250 ? (this.previousWheelPinchPoint ?? point) : point;
    this.project.camera.applyGesture(previousPoint, point, Math.exp(-event.deltaY * 0.01));
    this.previousWheelPinchPoint = point;
    this.lastWheelPinchTime = event.timeStamp;
    this.wheelGesture = "touchpad";
    this.lastWheelEventTime = event.timeStamp;
  }

  public touchstart = (event: TouchEvent) => {
    this.previousPinchPoint = event.touches.length === 2 ? this.getTouchMidpoint(event.touches) : null;
    this.previousTouchDistance = event.touches.length === 2 ? this.getTouchDistance(event.touches) : 0;
  };

  public cancelGesture() {
    this.previousPinchPoint = null;
    this.previousTouchDistance = 0;
    this.previousWheelPinchPoint = null;
    this.wheelGesture = null;
    this.isUsingMouseGrabMove = false;
    this.dragButton = null;
    this.isPreGrabbingWhenSpace = false;
  }

  public touchmove = (event: TouchEvent) => {
    if (event.touches.length !== 2 || this.project.controller.isCameraLocked) return;
    event.preventDefault();
    const midpoint = this.getTouchMidpoint(event.touches);
    const previous = this.previousPinchPoint;
    const distance = this.getTouchDistance(event.touches);
    if (previous && this.previousTouchDistance > 0 && distance > 0) {
      this.project.camera.applyGesture(previous, midpoint, distance / this.previousTouchDistance);
    }
    this.previousPinchPoint = midpoint;
    this.previousTouchDistance = distance;
  };

  public touchend = (event: TouchEvent) => {
    if (event.touches.length !== 2) {
      this.previousPinchPoint = null;
      this.previousTouchDistance = 0;
    }
  };

  private previousTouchDistance = 0;

  private getTouchMidpoint(touches: TouchList): Vector {
    const first = this.project.canvas.clientToView(touches[0].clientX, touches[0].clientY);
    const second = this.project.canvas.clientToView(touches[1].clientX, touches[1].clientY);
    return first.add(second).divide(2);
  }

  private getTouchDistance(touches: TouchList): number {
    const first = this.project.canvas.clientToView(touches[0].clientX, touches[0].clientY);
    const second = this.project.canvas.clientToView(touches[1].clientX, touches[1].clientY);
    return first.distance(second);
  }

  private dealStealthMode(event: WheelEvent) {
    if (Settings.isStealthModeEnabled && this.project.controller.pressingKeySet.has("shift")) {
      console.log(event);
      const delta = isMac ? (event.deltaX > 0 ? -10 : 10) : event.deltaY > 0 ? -10 : 10;
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
  private zoomUIMethod(event: WheelEvent, overrideDeltaY?: number) {
    const deltaY = overrideDeltaY ?? event.deltaY;
    const step = 25;
    const current = Settings.uiScalePercent;
    if (deltaY > 0) {
      Settings.uiScalePercent = Math.max(25, current - step);
    } else if (deltaY < 0) {
      Settings.uiScalePercent = Math.min(200, current + step);
    }
  }

  private mousewheelFunction(event: WheelEvent) {
    // 获取触发滚轮的鼠标位置
    const mouseLocation = new Vector(event.clientX, event.clientY);
    // 计算鼠标位置在视野中的位置
    const worldLocation = this.project.renderer.transformView2World(mouseLocation);
    this.project.camera.targetLocationByScale = worldLocation;

    if (event.shiftKey || this.project.controller.pressingKeySet.has("shift")) {
      const overrideDeltaY = Settings.mouseWheelWithShiftModeReverse ? -event.deltaY : undefined;
      if (Settings.mouseWheelWithShiftMode === "zoom") {
        this.zoomCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithShiftMode === "move") {
        this.moveYCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithShiftMode === "moveX") {
        this.moveXCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithShiftMode === "none") {
        return;
      } else if (Settings.mouseWheelWithShiftMode === "zoomUI") {
        this.zoomUIMethod(event, overrideDeltaY);
      }
    } else if (
      event.ctrlKey ||
      event.metaKey ||
      this.project.controller.pressingKeySet.has("control") ||
      this.project.controller.pressingKeySet.has("meta")
    ) {
      // 不要在节点上滚动
      const overrideDeltaY = Settings.mouseWheelWithCtrlModeReverse ? -event.deltaY : undefined;
      if (Settings.mouseWheelWithCtrlMode === "zoom") {
        this.zoomCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithCtrlMode === "move") {
        this.moveYCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithCtrlMode === "moveX") {
        this.moveXCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithCtrlMode === "none") {
        return;
      } else if (Settings.mouseWheelWithCtrlMode === "zoomUI") {
        this.zoomUIMethod(event, overrideDeltaY);
      }
    } else if (event.altKey || this.project.controller.pressingKeySet.has("alt")) {
      const overrideDeltaY = Settings.mouseWheelWithAltModeReverse ? -event.deltaY : undefined;
      if (Settings.mouseWheelWithAltMode === "zoom") {
        this.zoomCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithAltMode === "move") {
        this.moveYCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithAltMode === "moveX") {
        this.moveXCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelWithAltMode === "none") {
        return;
      } else if (Settings.mouseWheelWithAltMode === "zoomUI") {
        this.zoomUIMethod(event, overrideDeltaY);
      }
    } else {
      const overrideDeltaY = Settings.mouseWheelModeReverse ? -event.deltaY : undefined;
      if (Settings.mouseWheelMode === "zoom") {
        this.zoomCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelMode === "move") {
        this.moveYCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelMode === "moveX") {
        this.moveXCameraByMouseWheel(event, overrideDeltaY);
      } else if (Settings.mouseWheelMode === "none") {
        return;
      } else if (Settings.mouseWheelMode === "zoomUI") {
        this.zoomUIMethod(event, overrideDeltaY);
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

  private moveCameraByTouchPadTwoFingerMove(event: WheelEvent) {
    this.project.camera.targetScale = this.project.camera.currentScale;
    if (isMac) {
      this.mac.moveCameraByTouchPadTwoFingerMove(event);
      return;
    }
    // 过滤 -0
    if (Math.abs(event.deltaX) < 0.01 && Math.abs(event.deltaY) < 0.01) {
      return;
    }
    this.project.camera.panByViewDelta(new Vector(event.deltaX, event.deltaY).multiply(Settings.moveAmplitude / 8));
  }

  private zoomCameraByMouseWheel(event: WheelEvent, overrideDeltaY?: number) {
    const deltaY = overrideDeltaY ?? event.deltaY;
    if (isMac) {
      // mac电脑滚动一格滚轮会触发很多次事件。这个列表里是每个事件的deltaY
      // [7, 7, 7, 7, 6, 7, 7, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 1, 1, 1, 1, 1]
      if (Settings.macMouseWheelIsSmoothed) {
        this.applyWheelZoom(-deltaY, event.timeStamp, event.deltaMode);
        return;
      }
    }
    this.applyWheelZoom(deltaY, event.timeStamp, event.deltaMode);
  }

  private applyWheelZoom(deltaY: number, timeStamp: number, deltaMode: number) {
    if (deltaY === 0) return;
    const wheelSteps = Math.min(2, Math.abs(deltaY) / (deltaMode === WheelEvent.DOM_DELTA_LINE ? 3 : 100));
    const camera = this.project.camera;
    const scale = camera.targetScale;
    const nextScale = scale * Math.exp(-Math.sign(deltaY) * 0.14 * wheelSteps);
    camera.targetScale = Camera.validScale(nextScale, scale);
    this.addZoomFeedback(deltaY > 0 ? "shrink" : "expand", timeStamp);
  }

  private addZoomFeedback(type: "shrink" | "expand", timeStamp: number) {
    if (timeStamp - this.lastZoomFeedbackTime < 100) return;
    this.lastZoomFeedbackTime = timeStamp;
    this.project.effects.addEffect(MouseTipFeedbackEffect.default(type));
  }

  private moveYCameraByMouseWheel(event: WheelEvent, overrideDeltaY?: number) {
    const deltaY = overrideDeltaY ?? event.deltaY;
    this.project.camera.bombMove(
      this.project.camera.location.add(
        new Vector(0, (Settings.moveAmplitude * deltaY * 0.5) / this.project.camera.currentScale),
      ),
    );
    if (deltaY > 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveDown"));
    } else if (deltaY < 0) {
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
    this.applyWheelZoom(event.deltaX, event.timeStamp, event.deltaMode);
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

  private moveXCameraByMouseWheel(event: WheelEvent, overrideDeltaY?: number) {
    const deltaY = overrideDeltaY ?? event.deltaY;
    this.project.camera.bombMove(
      this.project.camera.location.add(
        new Vector((Settings.moveAmplitude * deltaY * 0.5) / this.project.camera.currentScale, 0),
      ),
    );
    if (deltaY > 0) {
      this.project.effects.addEffect(MouseTipFeedbackEffect.default("moveRight"));
    } else if (deltaY < 0) {
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

  private wheelGesture: "mouse" | "touchpad" | null = null;
  private lastWheelEventTime = 0;

  private isMouseWheel(event: WheelEvent): boolean {
    if (isIpad || isMac) {
      return this.mac.isMouseWheel(event);
    }

    const now = event.timeStamp;
    if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
      this.wheelGesture = "mouse";
      this.lastWheelEventTime = now;
      return true;
    }
    // 斜向的像素滚动可以确认触控板，覆盖首帧大位移造成的滚轮误判。
    if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && event.deltaX !== 0 && event.deltaY !== 0) {
      this.wheelGesture = "touchpad";
    }
    if (this.wheelGesture === null || now - this.lastWheelEventTime > 250) {
      // WheelEvent 不提供设备类型；按一次手势的首个事件判定并锁定，
      // 避免高精度滚轮的末尾小 delta 把缩放突然切成画布拖动。
      const discrete = event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL;
      const diagonal = event.deltaX !== 0 && event.deltaY !== 0;
      const wheelStep = Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) >= 60;
      this.wheelGesture = discrete || (wheelStep && !diagonal) ? "mouse" : "touchpad";
    }
    this.lastWheelEventTime = now;
    return this.wheelGesture === "mouse";
  }
}
