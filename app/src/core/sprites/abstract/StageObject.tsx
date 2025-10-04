import { Project } from "@/core/Project";
import { id, serializable } from "@graphif/serializer";
import { LayoutContainer } from "@pixi/layout/components";
import { DestroyOptions, Graphics } from "pixi.js";

/**
 * 一切舞台上的东西
 */
export abstract class StageObject extends LayoutContainer {
  private static SELECTION_OUTLINE_LABEL = "selection-outline";
  private static SELECTION_OUTLINE_PADDING = 8;

  protected abstract readonly project: Project;
  @id
  @serializable
  public uuid: string = crypto.randomUUID();

  private _selected: boolean = false;
  public get selected() {
    return this._selected;
  }
  public set selected(value: boolean) {
    if (value === this._selected) return;
    if (value) {
      const g = new Graphics({
        label: StageObject.SELECTION_OUTLINE_LABEL,
      });
      // 在自己的bounds外面一圈画框
      g.roundRect(
        -StageObject.SELECTION_OUTLINE_PADDING,
        -StageObject.SELECTION_OUTLINE_PADDING,
        this.width + StageObject.SELECTION_OUTLINE_PADDING * 2,
        this.height + StageObject.SELECTION_OUTLINE_PADDING * 2,
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
    this._selected = value;
  }

  destroy(options?: DestroyOptions): void {
    super.destroy(options);
    this.project.stage = this.project.stage.filter((s) => s !== this);
  }
  removeFromParent(): void {
    super.removeFromParent();
    this.project.stage = this.project.stage.filter((s) => s !== this);
  }
}
