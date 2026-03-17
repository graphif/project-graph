import { ContainerEntity } from "@/core.compontents/abstract/ContainerEntity";
import { Entity } from "@/core.compontents/abstract/Entity";
import { TextEntity } from "@/core.compontents/eneityNode/TextEntity";
import { MouseListener } from "@/core.compontents/interface/MouseListener";

/**
 * Canvas核心类，用于项目构建与组织，是所有组件的顶层容器。
 */
export class Canvas extends ContainerEntity implements MouseListener {
  canvasElement: HTMLCanvasElement;
  x = 0;
  y = 0;

  width = 0;
  height = 0;
  Entitys: Entity[] = new Array<Entity>();
  // children = Array<
  // collsion;
  constructor(canvasElement: HTMLCanvasElement) {
    super();
    this.canvasElement = canvasElement;
    this.width = canvasElement.width;
    this.height = canvasElement.height;
    this.Entitys.push(new TextEntity("Hello World"));
    this.Entitys.at(0)!.parent = this;
  }
  // 组件树的事件捕获
  onDown = (event: MouseEvent) => {
    this.onDownCaptrue(event);
  };
  onUp = (event: MouseEvent) => {
    this.onUpCaptrue(event);
  };
  onMove = (event: MouseEvent) => {
    this.onMoveCaptrue(event);
  };
  onClick = (event: MouseEvent) => {
    this.onClickCaptrue(event);
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnter = (_event: MouseEvent) => {
    // this.onEnterCaptrue(event);
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLeave = (_event: MouseEvent) => {
    // this.onLeaveCaptrue(event);
  };

  // 绘制采用了双阶段组件树绘制，从下到上通知，从上到下绘制。
  /**
   * 顶层需要处理重绘需求
   */
  reRender(): void {
    const ctx = this.canvasElement.getContext("2d");
    if (ctx) {
      this.render(ctx);
    }
  }
  /**
   * 绘制逻辑
   * @param ctx canvas ctx
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.renderOnce(ctx);
  }
  /**
   * 组件绘制只执行一次，节省计算资源。
   * @param ctx canvas ctx
   */
  renderOnce(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // console.log(this.width + " : " + this.height);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, this.width, this.height);
    for (const entity of this.Entitys) {
      entity.render(ctx);
    }
  }
}
