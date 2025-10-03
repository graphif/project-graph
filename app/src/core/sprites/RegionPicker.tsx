import { Graphics, Point, Rectangle } from "pixi.js";
import { Project } from "../Project";

export class RegionPicker extends Graphics {
  constructor(project: Project) {
    super();
    let pressed = false;
    let startPoint = new Point(0, 0);
    project.viewport
      .on("pointerdown", (e) => {
        pressed = true;
        startPoint = project.viewport.toWorld(e.client);
        // 取消所有节点的选中状态
        project.stage.forEach((it) => {
          it.selected = false;
        });
      })
      .on("pointerup", () => {
        pressed = false;
        this.clear();
      })
      .on("pointerupoutside", () => {
        pressed = false;
        this.clear();
      })
      .on("globalpointermove", (e) => {
        if (pressed) {
          const currentPoint = project.viewport.toWorld(e.client);
          const rect = new Rectangle(
            Math.min(startPoint.x, currentPoint.x),
            Math.min(startPoint.y, currentPoint.y),
            Math.abs(currentPoint.x - startPoint.x),
            Math.abs(currentPoint.y - startPoint.y),
          );
          const isCoverMode = startPoint.x > currentPoint.x && startPoint.y > currentPoint.y;
          this.clear();
          this.roundRect(rect.x, rect.y, rect.width, rect.height, 8 / project.viewport.scale.x);
          this.stroke({
            width: 1 / project.viewport.scale.x,
            color: isCoverMode ? 0xffff00 : 0x00ff00,
          });
          // 选中区域内的节点
          project.stage.forEach((it) => {
            if (rect[isCoverMode ? "containsRect" : "intersects"](new Rectangle(it.x, it.y, it.width, it.height))) {
              it.selected = true;
            }
          });
        }
      });
  }
}
