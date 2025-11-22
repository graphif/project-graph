import { Text } from "@pixi/layout/components";
import { Viewport } from "pixi-viewport";
import { Color, ColorSource, DestroyOptions, TextOptions } from "pixi.js";

export class TextInput extends Text {
  interactive = true;
  private activeTextarea: HTMLTextAreaElement | null = null;
  private handleInput: ((e: Event) => void) | null = null;
  private handleBlur: ((e: Event) => void) | null = null;

  constructor(
    private viewport: Viewport,
    opts: TextOptions,
    private offset: number = 0,
  ) {
    super(opts);

    let lastClickTime = 0;
    this.on("click", (e) => {
      const now = Date.now();
      if (now - lastClickTime < 300) {
        // 双击
        lastClickTime = 0;
      } else {
        lastClickTime = now;
        return;
      }
      e.stopPropagation();
      this.activate();
    });
  }

  activate() {
    const el = document.createElement("textarea");
    el.id = `TextInput${this.uid}`;
    el.value = this.text;
    el.style.position = "fixed";
    el.style.left = this.getGlobalPosition().x + this.offset * this.viewport.scaled + "px";
    el.style.top = this.getGlobalPosition().y + this.offset * this.viewport.scaled + "px";
    el.style.zIndex = "1000";
    el.style.background = "transparent";
    el.style.color = new Color(this.style.fill as ColorSource).toHex();
    el.style.fontSize = this.style.fontSize * this.viewport.scaled + "px";
    el.style.padding = "0px";
    el.style.outline = "none";
    el.style.border = "none";
    el.style.resize = "none";
    el.style.overflow = "hidden";
    const lines = el.value.split("\n").length;
    el.style.lineHeight = (this.style.lineHeight || this.height / lines) * this.viewport.scaled + "px";
    el.rows = lines;
    document.body.appendChild(el);

    // 清理旧的输入元素和监听器
    if (this.activeTextarea) {
      if (this.handleInput) {
        this.activeTextarea.removeEventListener("input", this.handleInput);
      }
      if (this.handleBlur) {
        this.activeTextarea.removeEventListener("blur", this.handleBlur);
      }
      this.activeTextarea.remove();
    }

    this.activeTextarea = el;
    const oldStyleFill = this.style.fill;

    setTimeout(() => {
      el.focus();
    }, 10);

    this.handleInput = () => {
      this.text = el.value;
      this.emit("textchange", this.text);
      el.rows = Math.max(1, el.value.split("\n").length);
    };

    this.handleBlur = () => {
      this.text = el.value;
      this.emit("textchange", this.text);
      this.emit("finishedit", this.text);
      el.removeEventListener("input", this.handleInput!);
      el.removeEventListener("blur", this.handleBlur!);
      el.remove();
      this.activeTextarea = null;
      this.style.fill = oldStyleFill;
    };

    el.addEventListener("input", this.handleInput);
    el.addEventListener("blur", this.handleBlur);
    // 把自己设置成透明
    this.style.fill = new Color("transparent");
  }

  destroy(options?: DestroyOptions): void {
    // 清理 DOM 元素和事件监听器
    if (this.activeTextarea) {
      if (this.handleInput) {
        this.activeTextarea.removeEventListener("input", this.handleInput);
      }
      if (this.handleBlur) {
        this.activeTextarea.removeEventListener("blur", this.handleBlur);
      }
      this.activeTextarea.remove();
      this.activeTextarea = null;
    }
    this.handleInput = null;
    this.handleBlur = null;

    super.destroy(options);
  }
}
