import { MouseCaptrueListener } from "@/core.compontents/interface/MouseCaptrueListener";
import { MouseListener } from "@/core.compontents/interface/MouseListener";
import { ReaderInterface } from "@/core.compontents/interface/ReaderInterface";
import { ContainerEntity } from "@/core.compontents/abstract/ContainerEntity";

/**
 * 实体类，所有组件的父类，这里决定组件基础属性和方法。
 */
export abstract class Entity implements ReaderInterface, MouseCaptrueListener {
  Entitys!: Array<Entity>;
  parent!: ContainerEntity;
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  mouseListener!: MouseListener;

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

  reRender(): void {
    this.parent.reRender();
  }
  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract renderOnce(ctx: CanvasRenderingContext2D): void;

  /**
   * 判断鼠标是否于该组件中。
   * @param event 事件
   * @returns true | false。
   */
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
