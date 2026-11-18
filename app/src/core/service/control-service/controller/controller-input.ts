import { Vector } from "@graphif/data-structures";

export interface ControllerInputHandlers {
  down(event: PointerEvent): void;
  move(event: PointerEvent): void;
  up(event: PointerEvent): void;
  doubleClick(event: PointerEvent): void;
  mouseChord(): void;
  wheel(event: WheelEvent): void;
  keydown(event: KeyboardEvent): void;
  keyup(event: KeyboardEvent): void;
  touchstart(event: TouchEvent): void;
  touchmove(event: TouchEvent): void;
  touchend(event: TouchEvent): void;
  cancel(location: Vector): void;
}

/** DOM 输入只在这里归一化，业务控制器接收画布坐标。 */
export class ControllerInput {
  private press: { id: number; button: number; location: Vector; dragged: boolean } | null = null;
  private lastClick: { button: number; location: Vector; time: number } | null = null;
  private touchMode: "idle" | "single" | "multi" = "idle";
  private location = Vector.getZero();
  private chordPointerId: number | null = null;
  private suppressContextMenu = false;

  constructor(
    private readonly element: HTMLCanvasElement,
    private readonly clientToView: (x: number, y: number) => Vector,
    private readonly handlers: ControllerInputHandlers,
  ) {
    for (const [type, handler] of Object.entries(this.listeners))
      element.addEventListener(type, handler, { passive: false });
    window.addEventListener("blur", this.cancel);
  }

  private viewEvent<T extends PointerEvent | WheelEvent>(event: T): T {
    const point = this.clientToView(event.clientX, event.clientY);
    // 捏合的 deltaY 是缩放量，只有普通像素滚动需要转换坐标单位。
    const delta =
      "deltaMode" in event && event.deltaMode === 0 && !event.ctrlKey
        ? this.clientToView(event.deltaX, event.deltaY).subtract(this.clientToView(0, 0))
        : null;
    return new Proxy(event, {
      get(target, property) {
        if (property === "clientX") return point.x;
        if (property === "clientY") return point.y;
        if (delta && property === "deltaX") return delta.x;
        if (delta && property === "deltaY") return delta.y;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  private down(event: PointerEvent) {
    this.location = new Vector(event.clientX, event.clientY);
    this.press = { id: event.pointerId, button: event.button, location: this.location, dragged: false };
    this.handlers.down(event);
  }

  private move(event: PointerEvent) {
    this.location = new Vector(event.clientX, event.clientY);
    if (this.press && this.press.location.distance(this.location) > 5) this.press.dragged = true;
    this.handlers.move(event);
  }

  private up(event: PointerEvent) {
    const press = this.press;
    this.press = null;
    this.location = new Vector(event.clientX, event.clientY);
    this.handlers.up(event);
    if (!press || press.button !== event.button || press.dragged || press.location.distance(this.location) > 5) {
      this.lastClick = null;
      return;
    }
    const time = event.timeStamp;
    if (
      this.lastClick &&
      this.lastClick.button === event.button &&
      time - this.lastClick.time < 300 &&
      this.lastClick.location.distance(this.location) < 5
    ) {
      this.lastClick = null;
      this.handlers.doubleClick(event);
    } else {
      this.lastClick = { button: event.button, location: this.location, time };
    }
  }

  private pointerdown = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    if (this.press && this.press.id !== event.pointerId) return;
    if (this.chordPointerId === null) this.suppressContextMenu = false;
    if (this.consumeMouseChord(event)) return;
    this.element.setPointerCapture(event.pointerId);
    this.down(this.viewEvent(event));
  };

  private pointermove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    if (this.press && this.press.id !== event.pointerId) return;
    if (this.consumeMouseChord(event)) return;
    if (this.press && event.buttons === 0) {
      this.cancel();
      return;
    }
    this.move(this.viewEvent(event));
  };

  private pointerup = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    if (this.consumeMouseChord(event)) return;
    if (!this.press) return;
    if (this.press && this.press.id !== event.pointerId) return;
    if (this.press.button !== event.button) {
      this.cancel();
      return;
    }
    this.up(this.viewEvent(event));
    if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId);
  };

  private pointercancel = (event: PointerEvent) => {
    if (this.press?.id === event.pointerId || this.chordPointerId === event.pointerId) this.cancel();
  };

  private consumeMouseChord(event: PointerEvent): boolean {
    if (event.pointerType !== "mouse") return false;
    if (this.chordPointerId !== null) {
      if (event.pointerId === this.chordPointerId && event.buttons === 0) {
        this.chordPointerId = null;
        if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId);
      }
      event.preventDefault();
      return true;
    }
    // 第二个鼠标键通过 pointermove 上报；只接受从当前画布开始的按键组合。
    if ((event.buttons & 3) !== 3 || (!this.press && event.type !== "pointerdown")) return false;
    const viewEvent = this.viewEvent(event);
    this.location = new Vector(viewEvent.clientX, viewEvent.clientY);
    this.press = null;
    this.lastClick = null;
    this.chordPointerId = event.pointerId;
    this.suppressContextMenu = true;
    this.element.setPointerCapture(event.pointerId);
    this.handlers.cancel(this.location);
    this.handlers.mouseChord();
    event.preventDefault();
    return true;
  }

  private touchPointer(touch: Touch, type: string): PointerEvent {
    return this.viewEvent(
      new PointerEvent(type, {
        pointerType: "touch",
        pointerId: touch.identifier,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: touch.clientX,
        clientY: touch.clientY,
      }),
    );
  }

  private touchstart = (event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length > 1) {
      if (this.touchMode !== "multi") this.cancel();
      this.touchMode = "multi";
    } else if (this.touchMode === "idle" && event.touches.length === 1) {
      this.touchMode = "single";
      this.down(this.touchPointer(event.touches[0], "pointerdown"));
    }
    this.handlers.touchstart(event);
  };

  private touchmove = (event: TouchEvent) => {
    event.preventDefault();
    if (this.touchMode === "single" && event.touches.length === 1)
      this.move(this.touchPointer(event.touches[0], "pointermove"));
    this.handlers.touchmove(event);
  };

  private touchend = (event: TouchEvent) => {
    event.preventDefault();
    this.handlers.touchend(event);
    if (event.touches.length !== 0) return;
    if (this.touchMode === "single" && event.changedTouches.length > 0)
      this.up(this.touchPointer(event.changedTouches[0], "pointerup"));
    this.touchMode = "idle";
  };

  public cancel = () => {
    const pointerId = this.press?.id ?? this.chordPointerId;
    this.press = null;
    this.chordPointerId = null;
    this.lastClick = null;
    this.touchMode = "idle";
    if (pointerId !== null && pointerId !== undefined && this.element.hasPointerCapture(pointerId))
      this.element.releasePointerCapture(pointerId);
    this.handlers.cancel(this.location);
  };

  private readonly listeners: Record<string, EventListener> = {
    pointerdown: this.pointerdown as EventListener,
    pointermove: this.pointermove as EventListener,
    pointerup: this.pointerup as EventListener,
    pointercancel: this.pointercancel as EventListener,
    lostpointercapture: this.pointercancel as EventListener,
    contextmenu: (event) => {
      if (!this.suppressContextMenu) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    touchstart: this.touchstart as EventListener,
    touchmove: this.touchmove as EventListener,
    touchend: this.touchend as EventListener,
    touchcancel: this.cancel,
    keydown: ((event: KeyboardEvent) => this.handlers.keydown(event)) as EventListener,
    keyup: ((event: KeyboardEvent) => this.handlers.keyup(event)) as EventListener,
    wheel: ((event: WheelEvent) => {
      event.preventDefault();
      this.handlers.wheel(this.viewEvent(event));
    }) as EventListener,
  };

  public dispose() {
    this.cancel();
    for (const [type, handler] of Object.entries(this.listeners)) this.element.removeEventListener(type, handler);
    window.removeEventListener("blur", this.cancel);
  }
}
