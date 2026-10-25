import { Vector } from "@graphif/data-structures";
// import { ControllerKeyboardOnly } from "@/core/service/controlService/controller/concrete/ControllerKeyboardOnly";
// ...
import { Project, service } from "@/core/Project";
import { ControllerAssociationReshapeClass } from "@/core/service/controlService/controller/concrete/ControllerAssociationReshape";
import { ControllerCameraClass } from "@/core/service/controlService/controller/concrete/ControllerCamera";
import { ControllerCuttingClass } from "@/core/service/controlService/controller/concrete/ControllerCutting";
import { ControllerEdgeEditClass } from "@/core/service/controlService/controller/concrete/ControllerEdgeEdit";
import { ControllerEntityClickSelectAndMoveClass } from "@/core/service/controlService/controller/concrete/ControllerEntityClickSelectAndMove";
import { ControllerEntityCreateClass } from "@/core/service/controlService/controller/concrete/ControllerEntityCreate";
import { ControllerLayerMovingClass } from "@/core/service/controlService/controller/concrete/ControllerEntityLayerMoving";
import { ControllerEntityResizeClass } from "@/core/service/controlService/controller/concrete/ControllerEntityResize";
import { ControllerExtensionEntityClickClass } from "@/core/service/controlService/controller/concrete/ControllerExtensionEntityClick";
import { ControllerImageScaleClass } from "@/core/service/controlService/controller/concrete/ControllerImageScale";
import { ControllerNodeConnectionClass } from "@/core/service/controlService/controller/concrete/ControllerNodeConnection";
import { ControllerNodeEditClass } from "@/core/service/controlService/controller/concrete/ControllerNodeEdit";
import { ControllerPenStrokeControlClass } from "@/core/service/controlService/controller/concrete/ControllerPenStrokeControl";
import { ControllerPenStrokeDrawingClass } from "@/core/service/controlService/controller/concrete/ControllerPenStrokeDrawing";
import { ControllerRectangleSelectClass } from "@/core/service/controlService/controller/concrete/ControllerRectangleSelect";
import { ControllerSectionEditClass } from "@/core/service/controlService/controller/concrete/ControllerSectionEdit";
import { CursorNameEnum } from "@/types/cursors";
import { isMac } from "@/utils/platform";
import { Settings } from "../../Settings";
import { ControllerClass } from "./ControllerClass";
import { ControllerInput } from "./ControllerInput";

/**
 * 控制器，控制鼠标、键盘事件
 *
 * 所有具体的控制功能逻辑都封装在控制器对象中
 */
@service("controller")
export class Controller {
  setCursorName(name: CursorNameEnum) {
    this.project.canvas.element.style.cursor = name;
  }

  // 检测正在按下的键
  readonly pressingKeySet: Set<string> = new Set();
  pressingKeysString(): string {
    let res = "";
    for (const key of this.pressingKeySet) {
      res += `[${key}]` + " ";
    }
    return res;
  }

  /**
   * 是否正在进行移动(拖拽旋转)连线的操作
   */

  isMovingEdge = false;
  /**
   * 为移动节点做准备，移动时，记录每上一帧移动的位置
   */

  lastMoveLocation = Vector.getZero();
  /**
   * 当前的鼠标的位置
   */

  mouseLocation = Vector.getZero();

  /**
   * 有时需要锁定相机，比如 编辑节点时
   */

  isCameraLocked = false;

  /**
   * 上次选中的节点
   * 仅为 Ctrl交叉选择使用
   */
  readonly lastSelectedEntityUUID: Set<string> = new Set();
  readonly lastSelectedEdgeUUID: Set<string> = new Set();

  private readonly input: ControllerInput;
  private readonly controllers: ControllerClass[] = [];
  private isCameraPointerGesture = false;

  lastClickTime = 0;
  lastClickLocation = Vector.getZero();

  readonly isMouseDown: boolean[] = [false, false, false];

  private lastManipulateTime = performance.now();

  /**
   * 重置渲染倒计时器
   * 触发了一次操作，记录时间
   */
  public resetCountdownTimer() {
    this.lastManipulateTime = performance.now();
  }

  /**
   * 检测是否已经有挺长一段时间没有操作了
   * 进而决定不刷新屏幕
   */
  isManipulateOverTime() {
    return performance.now() - this.lastManipulateTime > Settings.renderOverTimeWhenNoManipulateTime * 1000;
  }

  /**
   * 悬浮提示的边缘距离
   */
  readonly edgeHoverTolerance = 10;

  private cancelInput(location: Vector) {
    this.pressingKeySet.clear();
    this.project.camera.stopImmediately();
    this.camera.cancelGesture();
    this.isMouseDown.fill(false);
    this.isMovingEdge = false;
    this.isCameraPointerGesture = false;
    for (const controller of this.controllers) controller.mouseMoveOutWindowForcedShutdown(location);
    this.setCursorName(CursorNameEnum.Default);
  }

  private dispatch(callback: (controller: ControllerClass) => void) {
    for (const controller of this.controllers) {
      if (controller.shouldHandleInteraction) callback(controller);
    }
  }

  /**
   * 初始化函数在页面挂在的时候调用，将事件绑定到Canvas上
   * @param this.project.canvas.element
   */
  constructor(private readonly project: Project) {
    // 所有的具体的功能逻辑封装成控制器对象
    // 当有新功能时新建控制器对象，并在这里初始化
    Object.values(import.meta.glob("./concrete/*.tsx", { eager: true }))
      .map((module) => Object.entries(module as any).find(([k]) => k.includes("Class"))!)
      .filter(Boolean)
      .map(([k, v]) => {
        const inst = new (v as any)(this.project);
        let id = k.replace("Controller", "").replace("Class", "");
        id = id[0].toLowerCase() + id.slice(1);
        this[id as keyof this] = inst;
        this.controllers.push(inst);
      });
    this.input = new ControllerInput(project.canvas.element, (x, y) => project.canvas.clientToView(x, y), {
      down: (event) => {
        this.mousedown(event);
        this.camera.mousedown(event);
        this.isCameraPointerGesture = this.camera.isUsingMouseGrabMove;
        if (!this.isCameraPointerGesture)
          this.dispatch((c) => {
            if (c !== this.camera) c.mousedown(event);
          });
      },
      move: (event) => {
        this.resetCountdownTimer();
        if (this.isCameraPointerGesture) this.camera.mousemove(event);
        else this.dispatch((c) => c.mousemove(event));
      },
      up: (event) => {
        this.mouseup(event);
        if (this.isCameraPointerGesture) this.camera.mouseup(event);
        else this.dispatch((c) => c.mouseup(event));
      },
      doubleClick: (event) => {
        if (this.isCameraPointerGesture) this.camera.mouseDoubleClick(event);
        else this.dispatch((c) => c.mouseDoubleClick(event));
      },
      wheel: (event) => {
        this.mousewheel(event);
        this.dispatch((c) => c.mousewheel(event));
      },
      keydown: (event) => {
        this.keydown(event);
        this.dispatch((c) => c.keydown(event));
      },
      keyup: (event) => {
        this.keyup(event);
        this.dispatch((c) => c.keyup(event));
      },
      touchstart: (event) => {
        this.resetCountdownTimer();
        this.dispatch((c) => c.touchstart(event));
      },
      touchmove: (event) => {
        this.resetCountdownTimer();
        this.dispatch((c) => c.touchmove(event));
      },
      touchend: (event) => {
        this.resetCountdownTimer();
        for (const c of this.controllers) c.touchend(event);
      },
      cancel: (location) => this.cancelInput(location),
      mouseChord: () => {
        this.resetCountdownTimer();
        if (!Settings.viewerMode) Settings.mouseLeftMode = Settings.mouseLeftMode === "draw" ? "selectAndMove" : "draw";
      },
    });
  }
  dispose() {
    this.input.dispose();
    for (const controller of this.controllers) controller.dispose();
    this.controllers.length = 0;
  }

  // 以下事件处理函数仅为Controller总控制器修改重要属性使用。不涉及具体的功能逻辑。

  private mousedown(event: PointerEvent) {
    // event.preventDefault();
    this.handleMousedown(event.button, event.clientX, event.clientY);
    this.resetCountdownTimer();
  }

  private mouseup(event: PointerEvent) {
    // event.preventDefault();
    this.handleMouseup(event.button, event.clientX, event.clientY);
    this.resetCountdownTimer();
  }

  private mousewheel(event: WheelEvent) {
    event.preventDefault();
    // 禁用鼠标滚轮缩放
    this.resetCountdownTimer();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleMousedown(button: number, _x: number, _y: number) {
    this.isMouseDown[button] = true;

    // 左右键按下时移除所有input焦点
    if (button === 0 || button === 2) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
    }
  }

  private handleMouseup(button: number, x: number, y: number) {
    this.isMouseDown[button] = false;
    if (Date.now() - this.lastClickTime < 200 && this.lastClickLocation.distance(new Vector(x, y)) < 10) {
      //
    }
    this.lastClickTime = Date.now();
    this.lastClickLocation = new Vector(x, y);
  }

  private keydown(event: KeyboardEvent) {
    this.resetCountdownTimer();
    // 2025年2月1日
    // 必须要禁止ctrl f 和ctrl+g的浏览器默认行为，否则会弹出一个框
    // ctrl r 会刷新页面
    if (event.ctrlKey && (event.key === "f" || event.key === "g")) {
      event.preventDefault();
    }
    if (event.key === "F3" || event.key === "F7" || event.key === "F5") {
      // 禁用F3查找功能，防止浏览器默认行为
      // F7 插入光标浏览功能
      event.preventDefault();
    }
    if (event.key === "r" || event.key === "R") {
      // 禁用r刷新页面功能，防止浏览器默认行为
      // 如果要在开发中测试刷新，应该在DevTools界面按这个快捷键
      event.preventDefault();
    }
    // 禁止ctrl+shift+g 浏览器默认行为：查找上一个匹配项, ctrl+shift+c 打开控制台
    if (event.key === "G" || event.key === "C") {
      event.preventDefault();
    }
    if (event.key === "p") {
      // 禁用p打印功能，防止浏览器默认行为
      event.preventDefault();
    }
    if (event.key === "j") {
      // 禁用弹出下载界面功能
      event.preventDefault();
    }
    const key = event.key.toLowerCase();
    this.pressingKeySet.add(key);
  }

  private keyup(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (this.pressingKeySet.has(key)) {
      this.pressingKeySet.delete(key);
    }
    if (event.key === " " && isMac) {
      // 停止框选
      this.project.rectangleSelect.shutDown();
    }
    this.resetCountdownTimer();
  }
}

declare module "./Controller" {
  interface Controller {
    associationReshape: ControllerAssociationReshapeClass;
    camera: ControllerCameraClass;
    cutting: ControllerCuttingClass;
    edgeEdit: ControllerEdgeEditClass;
    entityClickSelectAndMove: ControllerEntityClickSelectAndMoveClass;
    entityCreate: ControllerEntityCreateClass;
    extensionEntityClick: ControllerExtensionEntityClickClass;
    layerMoving: ControllerLayerMovingClass;
    entityResize: ControllerEntityResizeClass;
    nodeConnection: ControllerNodeConnectionClass;
    nodeEdit: ControllerNodeEditClass;
    penStrokeControl: ControllerPenStrokeControlClass;
    penStrokeDrawing: ControllerPenStrokeDrawingClass;
    rectangleSelect: ControllerRectangleSelectClass;
    sectionEdit: ControllerSectionEditClass;
    imageScale: ControllerImageScaleClass;
  }
}
