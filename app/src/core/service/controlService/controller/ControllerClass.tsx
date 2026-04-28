import { Vector } from "@graphif/data-structures";
import type { Project } from "@/core/Project";
import { ViewOutlineFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";

/**
 * 控制器类，用于处理事件绑定和解绑
 * 每一个对象都是一个具体的功能
 */
export class ControllerClass {
  constructor(protected readonly project: Project) {
    // 等一会再开始绑定
    setTimeout(() => {
      this.project.canvas.element.addEventListener("keydown", this.keydown.bind(this));
      this.project.canvas.element.addEventListener("keyup", this.keyup.bind(this));
      this.project.canvas.element.addEventListener("pointerdown", this.mousedown.bind(this));
      this.project.canvas.element.addEventListener("pointerup", this._mouseup.bind(this));
      this.project.canvas.element.addEventListener("pointermove", this.mousemove.bind(this));
      this.project.canvas.element.addEventListener("wheel", this.mousewheel.bind(this));
      this.project.canvas.element.addEventListener("touchstart", this._touchstart.bind(this));
      this.project.canvas.element.addEventListener("touchmove", this._touchmove.bind(this));
      this.project.canvas.element.addEventListener("touchend", this._touchend.bind(this));
    }, 10);
  }

  public lastMoveLocation: Vector = Vector.getZero();
  private lastClickTime: number = 0;
  private lastClickLocation: Vector = Vector.getZero();

  public keydown: (event: KeyboardEvent) => void = () => {};
  public keyup: (event: KeyboardEvent) => void = () => {};
  public mousedown: (event: PointerEvent) => void = () => {};
  public mouseup: (event: PointerEvent) => void = () => {};
  public mousemove: (event: PointerEvent) => void = () => {};
  public mousewheel: (event: WheelEvent) => void = () => {};
  public mouseDoubleClick: (event: PointerEvent) => void = () => {};
  public touchstart: (event: TouchEvent) => void = () => {};
  public touchmove: (event: TouchEvent) => void = () => {};
  public touchend: (event: TouchEvent) => void = () => {};

  public dispose() {
    this.project.canvas.element.removeEventListener("keydown", this.keydown.bind(this));
    this.project.canvas.element.removeEventListener("keyup", this.keyup.bind(this));
    this.project.canvas.element.removeEventListener("pointerdown", this.mousedown.bind(this));
    this.project.canvas.element.removeEventListener("pointerup", this._mouseup.bind(this));
    this.project.canvas.element.removeEventListener("pointermove", this.mousemove.bind(this));
    this.project.canvas.element.removeEventListener("wheel", this.mousewheel.bind(this));
    // this.project.canvas.element.removeEventListener("touchstart", this._touchstart.bind(this));
    // this.project.canvas.element.removeEventListener("touchmove", this._touchmove.bind(this));
    // this.project.canvas.element.removeEventListener("touchend", this._touchend.bind(this));

    this.lastMoveLocation = Vector.getZero();
  }

  // private _mousedown = (event: PointerEvent) => {
  //   this.mousedown(event);
  //   // 检测双击
  //   const now = new Date().getTime();
  //   if (
  //     now - this.lastClickTime < 300 &&
  //     this.lastClickLocation.distance(
  //       new Vector(event.clientX, event.clientY),
  //     ) < 5
  //   ) {
  //     this.mouseDoubleClick(event);
  //   }
  //   this.lastClickTime = now;
  //   this.lastClickLocation = new Vector(event.clientX, event.clientY);
  // };

  /**
   * tips:
   * 如果把双击函数写在mousedown里
   * 双击的函数写在mousedown里了之后，双击的过程有四步骤：
   *  1按下，2抬起，3按下，4抬起
   *  结果在3按下的时候，瞬间创建了一个Input输入框透明的element
   *  挡在了canvas上面。导致第四步抬起释放没有监听到了
   *  进而导致：
   *  双击创建节点后会有一个框选框吸附在鼠标上
   *  双击编辑节点之后节点会进入编辑状态后一瞬间回到正常状态，然后节点吸附在了鼠标上
   * 所以，双击的函数应该写在mouseup里，pc上就没有这个问题了。
   * ——2024年12月5日
   * @param event 鼠标事件对象
   */
  private _mouseup = (event: PointerEvent) => {
    this.mouseup(event);
    // 检测双击
    const now = Date.now();
    if (
      now - this.lastClickTime < 300 &&
      this.lastClickLocation.distance(new Vector(event.clientX, event.clientY)) < 20
    ) {
      this.mouseDoubleClick(event);
    }
    this.lastClickTime = now;
    this.lastClickLocation = new Vector(event.clientX, event.clientY);
  };

  private _touchstart = (event: TouchEvent) => {
    // event.preventDefault();
    const touch = {
      ...(event.touches[event.touches.length - 1] as unknown as PointerEvent),
      button: 0, // 通过对象展开实现相对安全的属性合并

      // 尝试修复华为触摸屏的笔记本报错问题
      clientX: event.touches[event.touches.length - 1].clientX,
      clientY: event.touches[event.touches.length - 1].clientY,
    } as PointerEvent;
    if (event.touches.length > 1) {
      this.project.controller.rectangleSelect.shutDown();
    }
    this.mousedown(touch);
  };

  private _touchmove = (event: TouchEvent) => {
    // event.preventDefault();
    this.onePointTouchMoveLocation = new Vector(
      event.touches[event.touches.length - 1].clientX,
      event.touches[event.touches.length - 1].clientY,
    );
    const touch = {
      ...(event.touches[event.touches.length - 1] as unknown as PointerEvent),
      button: 0, // 通过对象展开实现相对安全的属性合并

      // 尝试修复华为触摸屏的笔记本报错问题
      clientX: this.onePointTouchMoveLocation.x,
      clientY: this.onePointTouchMoveLocation.y,
    } as PointerEvent;
    this.mousemove(touch);
  };

  // 由于touchend事件没有位置检测，所以只能延用touchmove的位置
  private onePointTouchMoveLocation: Vector = Vector.getZero();

  private _touchend = (event: TouchEvent) => {
    // event.preventDefault();
    const touch = {
      ...(event.touches[event.touches.length - 1] as unknown as PointerEvent),
      button: 0, // 通过对象展开实现相对安全的属性合并

      // 尝试修复华为触摸屏的笔记本报错问题
      clientX: this.onePointTouchMoveLocation.x,
      clientY: this.onePointTouchMoveLocation.y,
    } as PointerEvent;
    this._mouseup(touch);
  };

  /**
   * 鼠标移出窗口越界，强行停止功能
   * @param _outsideLocation
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector) {
    this.project.effects.addEffect(
      ViewOutlineFlashEffect.short(this.project.stageStyleManager.currentStyle.effects.warningShadow),
    );
  }
}
