import { Settings } from "@/core/service/Settings";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Vector } from "@graphif/data-structures";
import { serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import type { Value } from "platejs";
import { DetailsManager } from "../tools/entityDetailsManager";
/**
 * 一切独立存在、能被移动的东西，且放在框里能被连带移动的东西
 * 实体
 */
export abstract class Entity extends StageObject {
  /**
   * 将某个物体移动某个距离
   * @param delta
   */
  abstract move(delta: Vector): void;

  /**
   * 是否忽略自动对齐功能
   * 例如涂鸦就不吸附对齐
   */
  public isAlignExcluded = false;
  /**
   * 将某个物体移动到某个位置
   * 注意：看的是最小外接矩形的左上角位置，不是中心位置
   * @param location
   */
  abstract moveTo(location: Vector): void;

  /**
   * [
   *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
   *  { type: 'h1', children: [{ text: 'And this heading.' }] }
   * ]
   */
  @serializable
  public details: Value = [];

  /** 用于交互使用，比如鼠标悬浮显示details */
  public isMouseHover: boolean = false;

  public detailsButtonRectangle(): Rectangle {
    const thisRectangle = this.collisionBox.getRectangle();
    return new Rectangle(thisRectangle.rightTop.subtract(new Vector(10, 10)), new Vector(25, 25));
  }
  public isMouseInDetailsButton(mouseWorldLocation: Vector): boolean {
    return this.detailsButtonRectangle().isPointIn(mouseWorldLocation);
  }

  /**
   * 由于自身位置的移动，递归的更新所有父级Section的位置和大小
   */
  protected updateFatherSectionByMove() {
    const fatherSections = this.project.sectionMethods.getFatherSections(this);
    for (const section of fatherSections) {
      section.adjustLocationAndSize();
      section.updateFatherSectionByMove();
    }
  }
  /**
   * 由于自身位置的更新，排开所有同级节点的位置
   * 此函数在move函数中被调用，更新
   */
  protected updateOtherEntityLocationByMove() {
    if (!Settings.isEnableEntityCollision) {
      return;
    }
    for (const entity of this.project.stageManager.getEntities()) {
      if (entity === this) {
        continue;
      }
      this.collideWithOtherEntity(entity);
    }
  }

  /**
   * 与其他实体碰撞，调整位置；能够递归传递
   * @param other 其他实体
   */
  protected collideWithOtherEntity(other: Entity) {
    if (!Settings.isEnableEntityCollision) {
      return;
    }
    const selfRectangle = this.collisionBox.getRectangle();
    const otherRectangle = other.collisionBox.getRectangle();
    if (!selfRectangle.isCollideWith(otherRectangle)) {
      return;
    }

    // 两者相交，需要调整位置
    const overlapSize = selfRectangle.getOverlapSize(otherRectangle);
    let moveDelta;
    if (Math.abs(overlapSize.x) < Math.abs(overlapSize.y)) {
      moveDelta = new Vector(overlapSize.x * Math.sign(otherRectangle.center.x - selfRectangle.center.x), 0);
    } else {
      moveDelta = new Vector(0, overlapSize.y * Math.sign(otherRectangle.center.y - selfRectangle.center.y));
    }
    other.move(moveDelta);
  }
  /**
   * 是不是因为所在的Section被折叠而隐藏了
   * 因为任何Entity都可以放入Section
   */
  abstract isHiddenBySectionCollapse: boolean;

  // 桥接模式，让详细信息的各种操作封装在外部类中
  public detailsManager = new DetailsManager(this);
}
