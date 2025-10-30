import { Project } from "@/core/Project";
import { id, serializable } from "@graphif/serializer";
import { LayoutContainer } from "@pixi/layout/components";
import { DestroyOptions, Graphics, PointData } from "pixi.js";

/**
 * 一切舞台上的东西
 */
export abstract class StageObject extends LayoutContainer {
  static SELECTION_OUTLINE_LABEL = "selection-outline";
  static SELECTION_OUTLINE_PADDING = 8;
  allowClickToSelect: boolean = true;

  interactive = true;

  @id
  @serializable
  public uuid: string = crypto.randomUUID();

  protected _selected: boolean = false;
  public get selected() {
    return this._selected;
  }
  public set selected(value: boolean) {
    if (value === this._selected) return;
    if (value) {
      const g = new Graphics({
        label: StageObject.SELECTION_OUTLINE_LABEL + this.uuid,
      });
      // 在自己的bounds外面一圈画框
      g.roundRect(
        this.x - StageObject.SELECTION_OUTLINE_PADDING,
        this.y - StageObject.SELECTION_OUTLINE_PADDING,
        this.width / this.scale.x + StageObject.SELECTION_OUTLINE_PADDING * 2,
        this.height / this.scale.y + StageObject.SELECTION_OUTLINE_PADDING * 2,
        StageObject.SELECTION_OUTLINE_PADDING + (this.layout?._styles?.custom.borderRadius ?? 8),
      );
      g.stroke({
        width: 2,
        color: 0x00ffff,
      });
      this.project.viewport.addChild(g);
    } else {
      const e = this.project.viewport.getChildByLabel(StageObject.SELECTION_OUTLINE_LABEL + this.uuid);
      if (e) {
        this.project.viewport.removeChild(e);
      }
    }
    this._selected = value;
  }

  private onPointerEnter: ((e: any) => void) | null = null;
  private onPointerLeave: ((e: any) => void) | null = null;
  private onPointerDown: (() => void) | null = null;
  private onUpdate: (() => void) | null = null;

  destroy(options?: DestroyOptions): void {
    // 移除所有事件监听器
    if (this.onPointerEnter) {
      this.off("pointerenter", this.onPointerEnter);
    }
    if (this.onPointerLeave) {
      this.off("pointerleave", this.onPointerLeave);
    }
    if (this.onPointerDown) {
      this.off("pointerdown", this.onPointerDown);
    }
    if (this.onUpdate) {
      this.off("update", this.onUpdate);
    }

    this.onPointerEnter = null;
    this.onPointerLeave = null;
    this.onPointerDown = null;
    this.onUpdate = null;

    super.destroy(options);
    this.project.stage = this.project.stage.filter((s) => s !== this);
  }

  removeFromParent(): void {
    super.removeFromParent();
    this.project.stage = this.project.stage.filter((s) => s !== this);
  }

  refresh() {}

  constructor(protected readonly project: Project) {
    super();

    this.onPointerEnter = (e) => {
      this.project.emit("pointer-enter-stage-object", this, e);
    };

    this.onPointerLeave = (e) => {
      this.project.emit("pointer-leave-stage-object", this, e);
    };

    this.onPointerDown = () => {
      if (!this.allowClickToSelect) return;
    };

    this.onUpdate = () => {
      if (this.selected) {
        // 更新一下选中框的大小
        this.selected = false;
        this.selected = true;
      }
    };

    this.on("pointerenter", this.onPointerEnter)
      .on("pointerleave", this.onPointerLeave)
      .on("pointerdown", this.onPointerDown)
      .on("update", this.onUpdate);
  }

  getWorldBounds() {
    const bounds = super.getBounds();
    // 处理坐标系
    const vp = this.project.viewport;
    bounds.x = (bounds.x - vp.position.x) / vp.scale.x;
    bounds.y = (bounds.y - vp.position.y) / vp.scale.y;
    bounds.width = bounds.width / vp.scale.x;
    bounds.height = bounds.height / vp.scale.y;
    return bounds;
  }

  myContainsPoint(point: PointData) {
    const rect = this.getWorldBounds().rectangle;
    return rect.contains(point.x, point.y);
  }
}
