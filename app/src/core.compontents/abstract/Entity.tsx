import { MouseCaptrueListener } from "../interface/MouseCaptrueListener";
import { MouseListener } from "../interface/MouseListener";
import { ReaderInterface } from "../interface/ReaderInterface";
import { ContainerEntity } from "./ContainerEntity";

export abstract class Entity implements ReaderInterface, MouseCaptrueListener {
  reRender(): void {
    this.parent.reRender();
  }
  onDownCaptrue(event: MouseEvent): void {
    if (!this.Entitys) {
      this.mouseListener.onDown(event);
      return;
    }
    this.Entitys.forEach((item) => {
      if (item.contains(event)) {
        item.onDownCaptrue(event);
      }
    });
    this.reRender();
  }
  onUpCaptrue(event: MouseEvent): void {
    if (!this.Entitys) {
      this.mouseListener.onUp(event);
      return;
    }
    this.Entitys.forEach((item) => {
      if (item.contains(event)) {
        item.onUpCaptrue(event);
      }
    });
    this.reRender();
  }
  onMoveCaptrue(event: MouseEvent): void {
    if (!this.Entitys) {
      this.mouseListener.onMove(event);
      return;
    }
    this.Entitys.forEach((item) => {
      if (item.contains(event)) {
        item.onMoveCaptrue(event);
      }
    });
    this.reRender();
  }
  onClickCaptrue(event: MouseEvent): void {
    if (!this.Entitys) {
      this.mouseListener.onClick(event);
      return;
    }
    this.Entitys.forEach((item) => {
      if (item.contains(event)) {
        item.onClickCaptrue(event);
      }
    });
    this.reRender();
  }
  onEnterCaptrue(event: MouseEvent): void {
    if (!this.Entitys) {
      this.mouseListener.onEnter(event);
      return;
    }
    this.Entitys.forEach((item) => {
      if (item.contains(event)) {
        item.onEnterCaptrue(event);
      }
    });
    this.reRender();
  }
  onLeaveCaptrue(event: MouseEvent): void {
    if (!this.Entitys) {
      this.mouseListener.onLeave(event);
      return;
    }
    this.Entitys.forEach((item) => {
      if (item.contains(event)) {
        item.onLeaveCaptrue(event);
      }
    });
    this.reRender();
  }
  Entitys!: Array<Entity>;
  parent!: ContainerEntity;
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  mouseListener!: MouseListener;

  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract renderOnce(ctx: CanvasRenderingContext2D): void;
  contains(event: MouseEvent): boolean {
    if (event.x < this.x) {
      return false;
    }
    if (event.x > this.x + this.width) {
      return false;
    }
    if (event.y < this.y) {
      return false;
    }
    if (event.y > this.y + this.height) {
      return false;
    }
    return true;
  }
}
