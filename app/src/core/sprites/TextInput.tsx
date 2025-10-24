import { Text } from "@pixi/layout/components";
import { Viewport } from "pixi-viewport";
import { Color, ColorSource, TextOptions } from "pixi.js";

export class TextInput extends Text {
  interactive = true;

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
    el.style.left = this.getGlobalPosition().x + this.offset * this.viewport.scale.x + "px";
    el.style.top = this.getGlobalPosition().y + this.offset * this.viewport.scale.x + "px";
    el.style.zIndex = "1000";
    el.style.background = "transparent";
    el.style.color = new Color(this.style.fill as ColorSource).toHex();
    el.style.fontSize = this.style.fontSize * this.viewport.scale.x + "px";
    el.style.padding = "0px";
    el.style.outline = "none";
    el.style.border = "none";
    el.style.resize = "none";
    el.style.overflow = "hidden";
    const lines = el.value.split("\n").length;
    el.style.lineHeight = (this.style.lineHeight || this.height / lines) * this.viewport.scale.x + "px";
    el.rows = lines;
    document.body.appendChild(el);
    setTimeout(() => {
      el.focus();
    }, 10);
    el.addEventListener("input", () => {
      this.text = el.value;
      this.emit("textchange", this.text);
      el.rows = Math.max(1, el.value.split("\n").length);
    });
    el.addEventListener("blur", () => {
      this.text = el.value;
      this.emit("textchange", this.text);
      this.emit("finishedit", this.text);
      el.remove();
      this.style.fill = oldStyleFill;
    });
    // 把自己设置成透明
    const oldStyleFill = this.style.fill;
    this.style.fill = new Color("transparent");
  }
}
