import { Entity } from "@/core.compontents/abstract/Entity";
import { MouseListener } from "@/core.compontents/interface/MouseListener";

/**
 * 文本节点
 */
export class TextEntity extends Entity implements MouseListener {
  text!: string;
  isMove = false;
  dx = 0;
  dy = 0;

  constructor(text: string) {
    super();
    this.x = 0;
    this.y = 0;
    this.width = 200;
    this.height = 50;
    this.text = text;
    this.mouseListener = this;
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderOnce(ctx);
  }

  renderOnce(ctx: CanvasRenderingContext2D): void {
    // 绘制背景
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // 设置文字样式
    ctx.fillStyle = "#00ff00";
    ctx.font = "20px Arial";
    // 垂直基线设为中间
    ctx.textBaseline = "middle";
    // 水平对齐设为中间
    ctx.textAlign = "center";

    // 计算中心点
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // 绘制文字（自动居中）
    ctx.fillText("Canvas Test", centerX, centerY);

    // 绘制边框
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }

  onDown(event: MouseEvent): void {
    this.isMove = true;
    this.dx = event.x - this.x;
    this.dy = event.y - this.y;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUp(_event: MouseEvent): void {
    this.isMove = false;
  }

  onMove(event: MouseEvent): void {
    if (this.isMove) {
      this.x = event.x - this.dx;
      this.y = event.y - this.dy;
      this.reRender();
    }
  }

  onClick(event: MouseEvent): void {
    console.log(this.text + "TextNode onClick: " + event.button + " - " + event.buttons);
  }
  // 弃用
  // onEnter(event: MouseEvent): void {
  //   console.log(this.text + "TextNode onEnter: " + event.button + " - " + event.buttons);
  // }
  // onLeave(event: MouseEvent): void {
  //   this.isMove = false;
  //   console.log(this.text + "TextNode onLeave: " + event.button + " - " + event.buttons);
  // }
}
