import { DestroyOptions, Graphics, Point, Rectangle } from "pixi.js";
import { Project } from "../Project";
import { Section } from "./Section";
import { AssociationMember } from "./abstract/Association";
import { Entity } from "./abstract/Entity";

export class RegionPicker extends Graphics {
  private onPointerDown: ((e: any) => void) | null = null;
  private onPointerUp: ((e: any) => void) | null = null;
  private onPointerUpOutside: (() => void) | null = null;
  private onGlobalPointerMove: ((e: any) => void) | null = null;

  constructor(private project: Project) {
    super();
    let pressed = false;
    let startPoint = new Point(0, 0);

    this.onPointerDown = (e) => {
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
    };

    this.onPointerUp = (e) => {
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
    };

    this.onPointerUpOutside = () => {
      pressed = false;
      this.clear();
    };

    this.onGlobalPointerMove = (e) => {
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
    };

    project.viewport
      .on("pointerdown", this.onPointerDown)
      .on("pointerup", this.onPointerUp)
      .on("pointerupoutside", this.onPointerUpOutside)
      .on("globalpointermove", this.onGlobalPointerMove);
  }

  override destroy(options?: DestroyOptions): void {
    // 移除所有事件监听器
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
