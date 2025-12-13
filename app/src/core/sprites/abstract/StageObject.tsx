import { Project } from "@/core/Project";
import { BindEvents, on } from "@graphif/on";
import { id, serializable } from "@graphif/serializer";
import { LayoutContainer } from "@pixi/layout/components";
import { DestroyOptions, FederatedPointerEvent, Graphics, PointData, Rectangle } from "pixi.js";

/**
 * 一切舞台上的东西
 */
@BindEvents
export abstract class StageObject extends LayoutContainer {
  /**
   * 选中节点时会向viewport添加一个「SELECTION_OUTLINE_LABEL+uuid」作为标签的Graphics来渲染选中框
   */
  static SELECTION_OUTLINE_LABEL = "selection-outline";
  static SELECTION_OUTLINE_PADDING = 8;

  allowCutting: boolean = true;
  allowSelection: boolean = true;

  @id
  @serializable
  public uuid: string = crypto.randomUUID();

  protected _selected: boolean = false;
  public get selected() {
    return this._selected;
  }
  /**
   * 如果选中状态变动，则在viewport上添加或移除选中框
   */
  public set selected(value: boolean) {
    if (value === this._selected) return;
    if (value) {
      const g = new Graphics({
        label: StageObject.SELECTION_OUTLINE_LABEL + this.uuid,
      });
      // 在自己的bounds外面一圈画框
      const bounds = this.getWorldBounds();
      g.roundRect(
        bounds.x - StageObject.SELECTION_OUTLINE_PADDING,
        bounds.y - StageObject.SELECTION_OUTLINE_PADDING,
        bounds.width / this.scale.x + StageObject.SELECTION_OUTLINE_PADDING * 2,
        bounds.height / this.scale.y + StageObject.SELECTION_OUTLINE_PADDING * 2,
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

  /**
   * 移除所有事件监听器，并同时从渲染层和数据层中移除自己
   */
  destroy(options?: DestroyOptions): void {
    super.destroy(options);
    this.project.stage = this.project.stage.filter((s) => s !== this);
    // 清理有关的关系
    for (const so of this.project.stage) {
      if ("members" in so && Array.isArray(so.members)) {
        if (so.members.find((m) => m.entity === this)) {
          so.destroy();
        }
      }
    }
  }

  /**
   * 可选实现
   * 清空所有children,并重新添加children,应由属性的setter来执行
   */
  refresh() {}

  constructor(protected readonly project: Project) {
    super();
  }

  /**
   * 获取在世界坐标系下的bounds
   */
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

  /**
   * 检测碰撞
   */
  myContainsPoint(point: PointData) {
    const rect = this.getWorldBounds().rectangle;
    return rect.contains(point.x, point.y);
  }
  myIntersects(rect: Rectangle) {
    const myRect = this.getWorldBounds().rectangle;
    return myRect.intersects(rect);
  }

  private hovered = false;
  @on("pointermove")
  _StageObject_pointermove(e: FederatedPointerEvent) {
    const pos = this.project.viewport.toWorld(e.client);
    if (!this.hovered && this.myContainsPoint(pos)) {
      this.hovered = true;
      this.emit("hover", e);
      this.project.emit("pointer-enter-stage-object", this, e);
    } else if (this.hovered && !this.myContainsPoint(pos)) {
      this.hovered = false;
      this.emit("unhover", e);
      this.project.emit("pointer-leave-stage-object", this, e);
    }
  }
  @on("pointerleave")
  _StageObject_pointerleave(e: FederatedPointerEvent) {
    // 不用globalpointermove是因为可能有性能问题
    // TODO: 需要测试一下性能
    if (this.hovered) {
      this.hovered = false;
      this.emit("unhover", e);
      this.project.emit("pointer-leave-stage-object", this, e);
    }
  }
  @on("update")
  _StageObject_update() {
    if (this.selected) {
      // 更新一下选中框的大小
      this.selected = false;
      this.selected = true;
    }
  }
}
