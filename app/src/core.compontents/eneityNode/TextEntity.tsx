import { APP } from "@/APP";
import { Entity } from "../abstract/Entity";
import { MouseListener } from "../interface/MouseListener";

export class TextEntity extends Entity implements MouseListener {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  render(_ctx: CanvasRenderingContext2D): void {
    throw new Error("Method not implemented.");
  }
  renderOnce(ctx: CanvasRenderingContext2D): void {
    // 测试绘制
    // const ctx = this.canvasElement.getContext("2d");
    // if (ctx) {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "#00ff00";
    ctx.font = "20px Arial";
    ctx.fillText("Canvas Test", this.x, this.y);
    // 黑色边框
    ctx.strokeStyle = "#ff0000ff";
    // 边框宽度
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    // }
  }
  text!: string;
  constructor(text: string) {
    super();
    this.x = 0;
    this.y = 0;
    this.width = 200;
    this.height = 50;
    this.text = text;
    this.mouseListener = this;
  }

  isMove = false;
  onDown(event: MouseEvent): void {
    this.isMove = true;
    console.log(this.text + "TextNode onDown: " + event.button + " - " + event.buttons);
  }
  onUp(event: MouseEvent): void {
    this.isMove = false;
    console.log(this.text + "TextNode onUp: " + event.button + " - " + event.buttons);
  }
  onMove(event: MouseEvent): void {
    if (this.isMove) {
      this.x = event.x;
      this.y = event.y;
      const app = APP.getInstance();
      const canvasInstance = app.canvases.at(0);
      const canvasElement = canvasInstance?.canvasElement;
      if (canvasInstance) {
        if (!canvasElement) {
          return;
        }
        const ctx = canvasElement.getContext("2d");
        if (ctx) {
          this.renderOnce(ctx);
        }
      }
    }
    console.log(this.text + "TextNode onMove: " + event.button + " - " + event.buttons);
  }
  onClick(event: MouseEvent): void {
    console.log(this.text + "TextNode onClick: " + event.button + " - " + event.buttons);
  }
  onEnter(event: MouseEvent): void {
    console.log(this.text + "TextNode onEnter: " + event.button + " - " + event.buttons);
  }
  onLeave(event: MouseEvent): void {
    this.isMove = false;
    console.log(this.text + "TextNode onLeave: " + event.button + " - " + event.buttons);
  }
}
