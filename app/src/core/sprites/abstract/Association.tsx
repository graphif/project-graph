import { Entity } from "@/core/sprites/abstract/Entity";
import { StageObject } from "@/core/sprites/abstract/StageObject";
import { ObservableArray } from "@graphif/data-structures";
import { serializable } from "@graphif/serializer";
import { Color, ObservablePoint, Point } from "pixi.js";

/**
 * 一切连接关系的抽象
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
    super.position = value;
  }

  onMembersChange() {
    this.position = this.position.clone();
    this.refresh();
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

  /** 往anchor的方向偏移150px */
  get bezierControlPoint(): Point {
    const pos = this.position.clone();
    switch (this.anchor) {
      case "center":
        break;
      case "top":
        pos.y -= 150;
        break;
      case "bottom":
        pos.y += 150;
        break;
      case "left":
        pos.x -= 150;
        break;
      case "right":
        pos.x += 150;
        break;
    }
    return pos;
  }
}
