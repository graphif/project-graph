import { ContainerEntity } from "./abstract/ContainerEntity";
import { Entity } from "./abstract/Entity";
import { TextEntity } from "./eneityNode/TextEntity";
import { MouseListener } from "./interface/MouseListener";

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
  onEnter = (event: MouseEvent) => {
    this.onEnterCaptrue(event);
  };
  onLeave = (event: MouseEvent) => {
    this.onLeaveCaptrue(event);
  };

  reRender(): void {
    const ctx = this.canvasElement.getContext("2d");
    if (ctx) {
      this.renderOnce(ctx);
    }
  }
  render(): void {}
  renderOnce(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, this.width, this.height);
    for (const entity of this.Entitys) {
      entity.renderOnce(ctx);
    }
  }
}
