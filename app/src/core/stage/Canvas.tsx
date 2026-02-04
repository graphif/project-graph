import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";

/**
 * 将Canvas标签和里面的ctx捏在一起封装成一个类
 */
@service("canvas")
export class Canvas {
  ctx: CanvasRenderingContext2D;

  constructor(
    private readonly project: Project,
    public element: HTMLCanvasElement = document.createElement("canvas"),
  ) {
    element.tabIndex = -1;
    // 鼠标移动到画布上开始tick
    element.addEventListener("mousemove", () => {
      if (document.querySelector("[data-radix-popper-content-wrapper]")) {
        // workaround: 解决菜单栏弹出后鼠标移动到canvas区域，导致菜单自动关闭的问题
        return;
      }
      this.project.loop();
    });
    // 重定向键盘事件
    element.addEventListener("focus", () => element.blur());
    const shouldRedirectKeyboardEvent = () =>
      !(
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      );
    window.addEventListener("keydown", (event) => {
      if (!shouldRedirectKeyboardEvent()) return;
      // 在窗口层面拦截浏览器默认快捷键，避免触发系统/浏览器查找/搜索等行为
      const key = event.key;
      if (
        (event.ctrlKey && (key === "f" || key === "F" || key === "g" || key === "G" || key === "r" || key === "R")) ||
        key === "F3" ||
        key === "F5" ||
        key === "F7"
      ) {
        event.preventDefault();
      }
      if (project.isRunning) {
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
    this.ctx = element.getContext("2d")!;
    if (Settings.antialiasing === "disabled") {
      this.ctx.imageSmoothingEnabled = false;
    } else {
      this.ctx.imageSmoothingQuality = Settings.antialiasing;
    }
  }

  mount(wrapper: HTMLDivElement) {
    wrapper.innerHTML = "";
    wrapper.appendChild(this.element);
    // 监听画布大小变化
    const resizeObserver = new ResizeObserver(() => {
      this.project.renderer.resizeWindow(wrapper.clientWidth, wrapper.clientHeight);
    });
    resizeObserver.observe(wrapper);
  }

  dispose() {
    this.element.remove();
  }
}
