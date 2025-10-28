import { Graphics, Point, Rectangle } from "pixi.js";
import { Project } from "../Project";
import { StageObject } from "./abstract/StageObject";

export class Cutter extends Graphics {
  constructor(project: Project) {
    super();
    let pressed = false;
    let startPoint = new Point(0, 0);
    // 待删除的舞台对象
    const toBeDeleted = new Set<StageObject>();
    project.viewport
      .on("pointerdown", (e) => {
        if (e.button !== 2) return;
        startPoint = project.viewport.toWorld(e.client);
        if (project.getStageObjectAt(startPoint)) return;
        pressed = true;
        // 取消所有节点的选中状态
        project.stage.forEach((it) => {
          it.selected = false;
        });
      })
      .on("pointerup", () => {
        pressed = false;
        this.clear();
        // 删除所有标记为待删除的舞台对象
        toBeDeleted.forEach((it) => it.destroy());
      })
      .on("pointerupoutside", () => {
        pressed = false;
        this.clear();
        // 删除所有标记为待删除的舞台对象
        toBeDeleted.forEach((it) => it.destroy());
      })
      .on("globalpointermove", (e) => {
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
      });
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
}
