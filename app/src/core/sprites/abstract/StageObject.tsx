import { Project } from "@/core/Project";
import { id, serializable } from "@graphif/serializer";
import { LayoutContainer } from "@pixi/layout/components";
import { DestroyOptions, Graphics } from "pixi.js";

/**
 * 一切舞台上的东西
 */
export abstract class StageObject extends LayoutContainer {
  static SELECTION_OUTLINE_LABEL = "selection-outline";
  static SELECTION_OUTLINE_PADDING = 8;

  interactive = true;

  protected abstract readonly project: Project;
  @id
  @serializable
  public uuid: string = crypto.randomUUID();

  protected _selected: boolean = false;
  public get selected() {
    return this._selected;
  }
  public set selected(value: boolean) {
    if (value === this._selected) return;
    this._selected = value;
    if (value) {
      const g = new Graphics({
        label: StageObject.SELECTION_OUTLINE_LABEL,
      });
      // 在自己的bounds外面一圈画框
      g.roundRect(
        -StageObject.SELECTION_OUTLINE_PADDING,
        -StageObject.SELECTION_OUTLINE_PADDING,
        this.width / this.scale.x + StageObject.SELECTION_OUTLINE_PADDING * 2,
        this.height / this.scale.y + StageObject.SELECTION_OUTLINE_PADDING * 2,
        StageObject.SELECTION_OUTLINE_PADDING + 8,
      );
      g.stroke({
        width: 2,
        color: 0x00ffff,
      });
      this.addChild(g);
    } else {
      const e = this.getChildByLabel(StageObject.SELECTION_OUTLINE_LABEL);
      if (e) {
        this.removeChild(e);
      }
    }
  }

  destroy(options?: DestroyOptions): void {
    super.destroy(options);
    this.project.stage = this.project.stage.filter((s) => s !== this);
  }
  removeFromParent(): void {
    super.removeFromParent();
    this.project.stage = this.project.stage.filter((s) => s !== this);
  }

  refresh() {}

  constructor() {
    super();
    this.on("pointerenter", (e) => {
      this.project.emit("pointer-enter-stage-object", this, e);
    })
      .on("pointerleave", (e) => {
        this.project.emit("pointer-leave-stage-object", this, e);
      })
      .on("pointerdown", () => {
        this.project.stage.forEach((it) => (it.selected = false));
        this.selected = true;
      })
      .on("update", () => {
        if (this.selected) {
          this.selected = false;
          this.selected = true;
        }
      });
  }

  getBounds() {
    const bounds = super.getBounds();
    // 如果是选中状态，要把选中框的大小减掉
    if (this.selected) {
      bounds.x += StageObject.SELECTION_OUTLINE_PADDING;
      bounds.y += StageObject.SELECTION_OUTLINE_PADDING;
      bounds.width -= StageObject.SELECTION_OUTLINE_PADDING * 2;
      bounds.height -= StageObject.SELECTION_OUTLINE_PADDING * 2;
    }
    return bounds;
  }
}
