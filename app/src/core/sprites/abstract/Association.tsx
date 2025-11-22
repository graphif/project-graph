import { Entity } from "@/core/sprites/abstract/Entity";
import { StageObject } from "@/core/sprites/abstract/StageObject";
import { ObservableArray } from "@graphif/data-structures";
import { serializable } from "@graphif/serializer";
import { Color, DestroyOptions, ObservablePoint, Point } from "pixi.js";

/**
 * 一切连接关系的抽象
 * 可选实现: moveTo(position: PointData): void 如果实现了此方法，关系就可以被拖拽移动，但是移动的行为要自己定义
 */
export abstract class Association extends StageObject {
  private handleMemberMoved = () => {
    this.onMembersChange();
  };

  private _members = new ObservableArray<AssociationMember>(
    (it) => it.entity.on("update", this.handleMemberMoved),
    (it) => it.entity.off("update", this.handleMemberMoved),
    [],
  );
  @serializable
  get members() {
    return this._members;
  }
  set members(value: AssociationMember[]) {
    // Remove listeners from old members
    this._members.forEach((it) => it.entity.off("update", this.handleMemberMoved));
    this._members = new ObservableArray(
      (it) => it.entity.on("update", this.handleMemberMoved),
      (it) => it.entity.off("update", this.handleMemberMoved),
      value,
    );
    this.onMembersChange();
  }

  /**
   * 任何关系都应该有一个颜色用来标注
   */
  public color: Color = new Color("transparent");

  /*
   * 下图中，折线段为Association，矩形为Entity，X标记的位置就是Association的position
   * ```
   *                    ┌──────┐
   *         X    ┌────►│member│
   * ┌──────┐     │     └──────┘
   * │member│─────┘
   * └──────┘
   * ```
   */
  get position() {
    if (this.members.length === 0) {
      return new ObservablePoint({ _onUpdate() {} }, 0, 0);
    }
    let minX = Infinity;
    let minY = Infinity;
    for (const member of this.members) {
      const pos = member.position;
      if (pos.x < minX) {
        minX = pos.x;
      }
      if (pos.y < minY) {
        minY = pos.y;
      }
    }
    return new ObservablePoint({ _onUpdate() {} }, minX, minY);
  }
  get x() {
    return this.position.x;
  }
  get y() {
    return this.position.y;
  }
  set position(value: ObservablePoint) {
    super.position?.copyFrom(value);
  }

  onMembersChange() {
    this.position = this.position.clone();
    this.refresh();
  }

  destroy(options?: DestroyOptions): void {
    // 清理所有成员的事件监听器
    this._members.forEach((it) => it.entity.off("update", this.handleMemberMoved));
    super.destroy(options);
  }
}

type AssociationAnchor = "center" | "top" | "bottom" | "left" | "right";

export class AssociationMember {
  @serializable
  entity: Entity;
  @serializable
  anchor: AssociationAnchor = "center";

  constructor(entity: Entity, anchor: AssociationAnchor = "center") {
    this.entity = entity;
    this.anchor = anchor;
  }

  /** 锚点的世界坐标 */
  get position(): Point {
    // HACK: 2025/10/6 发现ObservablePoint.clone不会把observer去掉
    const pos = this.entity.position.clone({ _onUpdate() {} });
    // pos是左上角坐标
    switch (this.anchor) {
      case "center":
        pos.x += this.entity.width / 2;
        pos.y += this.entity.height / 2;
        break;
      case "top":
        pos.x += this.entity.width / 2;
        break;
      case "bottom":
        pos.x += this.entity.width / 2;
        pos.y += this.entity.height;
        break;
      case "left":
        pos.y += this.entity.height / 2;
        break;
      case "right":
        pos.x += this.entity.width;
        pos.y += this.entity.height / 2;
        break;
    }
    return pos;
  }

  /** 往旁边偏移 */
  withOffset(distance: number): Point {
    const pos = this.position.clone();
    switch (this.anchor) {
      case "center":
        break;
      case "top":
        pos.y -= distance;
        break;
      case "bottom":
        pos.y += distance;
        break;
      case "left":
        pos.x -= distance;
        break;
      case "right":
        pos.x += distance;
        break;
    }
    return pos;
  }
}
