import { Graphics, Point, Rectangle } from "pixi.js";
import { Project } from "../Project";
import { Section } from "./Section";
import { AssociationMember } from "./abstract/Association";
import { Entity } from "./abstract/Entity";

export class RegionPicker extends Graphics {
  constructor(project: Project) {
    super();
    let pressed = false;
    let startPoint = new Point(0, 0);
    project.viewport
      .on("pointerdown", (e) => {
        if (e.button !== 0) return;
        startPoint = project.viewport.toWorld(e.client);
        // 点击选中节点
        const clickedEntity = project.getStageObjectAt(startPoint);
        if (clickedEntity) {
          clickedEntity.selected = true;
          return;
        }
        pressed = true;
        // 取消所有节点的选中状态
        project.stage.forEach((it) => {
          it.selected = false;
        });
      })
      .on("pointerup", (e) => {
        pressed = false;
        this.clear();
        if (e.altKey) {
          // 给选中的节点创建Section
          const selectedEntities = project.stage.filter((it) => it.selected);
          const section = new Section(project, {
            members: selectedEntities.filter((it) => it instanceof Entity).map((it) => new AssociationMember(it)),
          });
          project.stage.push(section);
        }
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
            it.selected = rect[isCoverMode ? "containsRect" : "intersects"](it.getWorldBounds().rectangle);
          });
        }
      });
  }
}
