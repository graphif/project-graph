import { Project, service } from "@/core/project";
import { CanvasLayerName, DirtyLayer } from "@/core/render/canvas2d/dirty-layer";
import { Settings } from "@/core/service/settings";
import { activeTabAtom, store } from "@/state";
import { Vector } from "@graphif/data-structures";

/**
 * 将三层 Canvas（背景层、主舞台层、交互覆盖层）和对应的 2D 上下文封装在一起。
 * `element` 始终为最顶层的交互画布，负责接收所有指针/鼠标/键盘事件。
 */
@service("canvas")
export class Canvas {
  readonly bgElement: HTMLCanvasElement;
  readonly stageElement: HTMLCanvasElement;
  readonly bgCtx: CanvasRenderingContext2D;
  readonly stageCtx: CanvasRenderingContext2D;
  readonly overlayCtx: CanvasRenderingContext2D;

  private activeCtx: CanvasRenderingContext2D;
  private overrideCtx: CanvasRenderingContext2D | null = null;
  private resizeObserver?: ResizeObserver;

  get ctx(): CanvasRenderingContext2D {
    return this.overrideCtx ?? this.activeCtx;
  }

  set ctx(value: CanvasRenderingContext2D) {
    if (value === this.bgCtx || value === this.stageCtx || value === this.overlayCtx) {
      this.overrideCtx = null;
      this.activeCtx = value;
    } else {
      this.overrideCtx = value;
    }
  }

  /**
   * 当前是否处于三层独立画布模式（截图/缩略图导出临时替换 ctx 时为 false）
   */
  isLayeredMode(): boolean {
    return this.overrideCtx === null;
  }

  /**
   * 临时切换当前绘制上下文到指定图层，执行完毕后自动恢复。
   */
  withLayer<T>(layer: CanvasLayerName, fn: () => T): T {
    if (this.overrideCtx !== null) {
      return fn();
    }
    const prev = this.activeCtx;
    this.activeCtx = layer === "background" ? this.bgCtx : layer === "stage" ? this.stageCtx : this.overlayCtx;
    try {
      return fn();
    } finally {
      this.activeCtx = prev;
    }
  }

  private applyContextSettings(ctx: CanvasRenderingContext2D) {
    if (Settings.antialiasing === "disabled") {
      ctx.imageSmoothingEnabled = false;
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = Settings.antialiasing;
    }
  }

  constructor(
    private readonly project: Project,
    public element: HTMLCanvasElement = document.createElement("canvas"),
  ) {
    this.bgElement = document.createElement("canvas");
    this.stageElement = document.createElement("canvas");

    for (const el of [this.bgElement, this.stageElement, element]) {
      el.style.position = "absolute";
      el.style.top = "0";
      el.style.left = "0";
    }
    this.bgElement.style.pointerEvents = "none";
    this.stageElement.style.pointerEvents = "none";
    this.bgElement.dataset.layer = "background";
    this.stageElement.dataset.layer = "stage";
    element.dataset.layer = "overlay";

    element.tabIndex = -1;
    element.style.touchAction = "none";
    // 鼠标移动到画布上开始tick并标记交互层脏
    element.addEventListener("mousemove", () => {
      if (document.querySelector("[data-radix-popper-content-wrapper]")) {
        // workaround: 解决菜单栏弹出后鼠标移动到canvas区域，导致菜单自动关闭的问题
        return;
      }
      this.project.renderer?.markDirty(DirtyLayer.Overlay);
      this.project.loop();
    });
    for (const evt of ["mousedown", "mouseup", "wheel", "pointerdown", "pointerup"] as const) {
      element.addEventListener(evt, () => {
        this.project.renderer?.markDirty(DirtyLayer.All);
      });
    }
    // 重定向键盘事件
    element.addEventListener("focus", () => element.blur());
    const shouldRedirectKeyboardEvent = () =>
      store.get(activeTabAtom) === this.project &&
      !(
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      );
    window.addEventListener("keydown", (event) => {
      // 在窗口层面拦截浏览器默认快捷键，避免触发系统/浏览器查找/搜索等行为
      // 必须在 shouldRedirectKeyboardEvent 判断之前执行，否则输入框聚焦时会被跳过
      const key = event.key;
      if (
        (event.ctrlKey && (key === "f" || key === "F" || key === "g" || key === "G" || key === "r" || key === "R")) ||
        key === "F3" ||
        key === "F5" ||
        key === "F7"
      ) {
        event.preventDefault();
      }
      if (!shouldRedirectKeyboardEvent()) return;
      if (project.isRunning) {
        this.project.renderer?.markDirty(DirtyLayer.All);
        element.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: event.key,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
          }),
        );
      }
    });
    window.addEventListener("keyup", (event) => {
      if (!shouldRedirectKeyboardEvent()) {
        this.project.controller.pressingKeySet.clear();
        return;
      }
      if (project.isRunning) {
        this.project.renderer?.markDirty(DirtyLayer.All);
        element.dispatchEvent(
          new KeyboardEvent("keyup", {
            key: event.key,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
          }),
        );
      }
    });
    // 失焦时清空按下的按键
    window.addEventListener("blur", () => {
      this.project.controller.pressingKeySet.clear();
    });
    this.bgCtx = this.bgElement.getContext("2d")!;
    this.stageCtx = this.stageElement.getContext("2d")!;
    this.overlayCtx = element.getContext("2d")!;
    this.activeCtx = this.stageCtx;
    this.applyContextSettings(this.bgCtx);
    this.applyContextSettings(this.stageCtx);
    this.applyContextSettings(this.overlayCtx);
  }

  resize(newW: number, newH: number, scale: number) {
    if (this.overrideCtx !== null) {
      this.element.width = newW * scale;
      this.element.height = newH * scale;
      this.element.style.width = `${newW}px`;
      this.element.style.height = `${newH}px`;
      this.overrideCtx.setTransform(scale, 0, 0, scale, 0, 0);
      this.applyContextSettings(this.overrideCtx);
      return;
    }
    const pairs: Array<[HTMLCanvasElement, CanvasRenderingContext2D]> = [
      [this.bgElement, this.bgCtx],
      [this.stageElement, this.stageCtx],
      [this.element, this.overlayCtx],
    ];
    for (const [el, ctx] of pairs) {
      el.width = newW * scale;
      el.height = newH * scale;
      el.style.width = `${newW}px`;
      el.style.height = `${newH}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      this.applyContextSettings(ctx);
    }
  }

  mount(wrapper: HTMLDivElement) {
    this.resizeObserver?.disconnect();
    if (window.getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    }
    wrapper.innerHTML = "";
    wrapper.appendChild(this.bgElement);
    wrapper.appendChild(this.stageElement);
    wrapper.appendChild(this.element);
    this.project.renderer.resizeWindow(wrapper.clientWidth, wrapper.clientHeight);
    // 监听画布大小变化
    this.resizeObserver = new ResizeObserver(() => {
      this.project.renderer.resizeWindow(wrapper.clientWidth, wrapper.clientHeight);
    });
    this.resizeObserver.observe(wrapper);
  }

  clientToView(clientX: number, clientY: number) {
    const rect = this.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return new Vector(clientX - rect.left, clientY - rect.top);
    return new Vector(
      ((clientX - rect.left) * this.element.clientWidth) / rect.width,
      ((clientY - rect.top) * this.element.clientHeight) / rect.height,
    );
  }

  viewToClient(location: Vector) {
    const rect = this.element.getBoundingClientRect();
    const scale = this.viewToClientScale();
    return new Vector(rect.left + location.x * scale.x, rect.top + location.y * scale.y);
  }

  viewToClientScale() {
    const rect = this.element.getBoundingClientRect();
    return new Vector(
      this.element.clientWidth === 0 ? 1 : rect.width / this.element.clientWidth,
      this.element.clientHeight === 0 ? 1 : rect.height / this.element.clientHeight,
    );
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.bgElement.remove();
    this.stageElement.remove();
    this.element.remove();
  }
}
