import { DestroyOptions, Graphics, Point, Rectangle } from "pixi.js";
import { Project } from "../Project";
import { StageObject } from "./abstract/StageObject";

export class Cutter extends Graphics {
  private onPointerDown: ((e: any) => void) | null = null;
  private onPointerUp: (() => void) | null = null;
  private onPointerUpOutside: (() => void) | null = null;
  private onGlobalPointerMove: ((e: any) => void) | null = null;

  constructor(private project: Project) {
    super();
    let pressed = false;
    let startPoint = new Point(0, 0);
    // 待删除的舞台对象
    const toBeDeleted = new Set<StageObject>();

    this.onPointerDown = (e) => {
      if (e.button !== 2) return;
      startPoint = project.viewport.toWorld(e.client);
      if (project.getStageObjectAt(startPoint)) return;
      pressed = true;
      // 取消所有节点的选中状态
      project.stage.forEach((it) => {
        it.selected = false;
      });
    };

    this.onPointerUp = () => {
      pressed = false;
      this.clear();
      // 删除所有标记为待删除的舞台对象
      toBeDeleted.forEach((it) => it.destroy());
    };

    this.onPointerUpOutside = () => {
      pressed = false;
      this.clear();
      // 删除所有标记为待删除的舞台对象
      toBeDeleted.forEach((it) => it.destroy());
    };

    this.onGlobalPointerMove = (e) => {
      if (pressed) {
        const currentPoint = project.viewport.toWorld(e.client);
        this.clear();
        // 从起始位置到当前鼠标位置画一条线
        this.moveTo(startPoint.x, startPoint.y);
        this.lineTo(currentPoint.x, currentPoint.y);
        this.stroke({
          width: 1 / project.viewport.scale.x,
          color: 0xff0000,
        });
        // 标记与线相交的舞台对象
        project.stage.forEach((it) => {
          const rect = it.getWorldBounds().rectangle;
          if (this.lineIntersectsRect(startPoint, currentPoint, rect)) {
            toBeDeleted.add(it);
            // 画一个框提示
            this.roundRect(rect.x - 8, rect.y - 8, rect.width + 16, rect.height + 16, 16);
            this.stroke({
              width: 4,
              color: 0xff0000,
            });
          } else {
            toBeDeleted.delete(it);
          }
        });
      }
    };

    project.viewport
      .on("pointerdown", this.onPointerDown)
      .on("pointerup", this.onPointerUp)
      .on("pointerupoutside", this.onPointerUpOutside)
      .on("globalpointermove", this.onGlobalPointerMove);
  }

  private lineIntersectsRect(p1: Point, p2: Point, rect: Rectangle): boolean {
    // 检查端点是否在矩形内
    if (rect.contains(p1.x, p1.y) || rect.contains(p2.x, p2.y)) {
      return true;
    }

    // 检查线段是否与矩形的四条边相交
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    // 左边
    if (this.linesIntersect(p1.x, p1.y, p2.x, p2.y, left, top, left, bottom)) {
      return true;
    }
    // 右边
    if (this.linesIntersect(p1.x, p1.y, p2.x, p2.y, right, top, right, bottom)) {
      return true;
    }
    // 上边
    if (this.linesIntersect(p1.x, p1.y, p2.x, p2.y, left, top, right, top)) {
      return true;
    }
    // 下边
    if (this.linesIntersect(p1.x, p1.y, p2.x, p2.y, left, bottom, right, bottom)) {
      return true;
    }

    return false;
  }

  private linesIntersect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return false; // 平行或共线

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  override destroy(options?: DestroyOptions): void {
    // 清理所有事件监听器
    if (this.onPointerDown) {
      this.project.viewport.off("pointerdown", this.onPointerDown);
    }
    if (this.onPointerUp) {
      this.project.viewport.off("pointerup", this.onPointerUp);
    }
    if (this.onPointerUpOutside) {
      this.project.viewport.off("pointerupoutside", this.onPointerUpOutside);
    }
    if (this.onGlobalPointerMove) {
      this.project.viewport.off("globalpointermove", this.onGlobalPointerMove);
    }
    this.onPointerDown = null;
    this.onPointerUp = null;
    this.onPointerUpOutside = null;
    this.onGlobalPointerMove = null;
    super.destroy(options);
  }
}
