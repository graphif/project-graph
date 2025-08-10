import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { NodeMoveShadowEffect } from "@/core/service/feedbackService/effectEngine/concrete/NodeMoveShadowEffect";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { getTextSize } from "@/utils/font";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Line, Rectangle, Shape } from "@graphif/shapes";

@passExtraAtArg1
@passObject
export class Section extends ConnectableEntity {
  /**
   * 节点是否被选中
   */
  _isSelected: boolean = false;
  @serializable
  public uuid: string;
  _isEditingTitle: boolean = false;
  private _collisionBoxWhenCollapsed: CollisionBox;
  private _collisionBoxNormal: CollisionBox;

  public get isEditingTitle() {
    return this._isEditingTitle;
  }
  public set isEditingTitle(value: boolean) {
    this._isEditingTitle = value;
    this.project.sectionRenderer.render(this);
  }

  /**
   * 小于多少的情况下，开始渲染大标题
   */
  static bigTitleCameraScale = 0.2;

  public get collisionBox(): CollisionBox {
    if (this.isCollapsed) {
      return this._collisionBoxWhenCollapsed;
    } else {
      return this._collisionBoxNormal;
    }
  }

  /** 获取折叠状态下的碰撞箱 */
  private collapsedCollisionBox(): CollisionBox {
    const centerLocation = this._collisionBoxNormal.getRectangle().center;
    const collapsedRectangleSize = getTextSize(this.text, Renderer.FONT_SIZE).add(
      Vector.same(Renderer.NODE_PADDING).multiply(2),
    );
    const collapsedRectangle = new Rectangle(
      centerLocation.clone().subtract(collapsedRectangleSize.multiply(0.5)),
      collapsedRectangleSize,
    );
    return new CollisionBox([collapsedRectangle]);
  }

  @serializable
  color: Color = Color.Transparent;
  @serializable
  text: string;
  @serializable
  children: Entity[];

  /** 是否是折叠状态 */
  @serializable
  isCollapsed: boolean;
  /** 是否是隐藏状态 */
  @serializable
  isHidden: boolean;
  isHiddenBySectionCollapse = false;

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      collisionBox = new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(0, 0))]),
      color = Color.Transparent,
      isHidden = false,
      isCollapsed = false,
      children = [] as Entity[],
      details = "",
    } = {},
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;

    this._collisionBoxWhenCollapsed = collisionBox;

    const rect = collisionBox.getRectangle();
    const shapes: Shape[] = rect.getBoundingLines();
    // shapes.push(
    //   new Rectangle(rect.location, new Vector(rect.size.x, 50)),
    // );
    this._collisionBoxNormal = new CollisionBox(shapes);

    this.color = color;
    this.text = text;
    this.isHidden = isHidden;
    this.isCollapsed = isCollapsed;
    this.details = details;
    this.children = children;
    // 一定要放在最后
    this.adjustLocationAndSize();
  }

  /**
   * 根据多个实体创建Section
   * @param entities
   */
  static fromEntities(project: Project, entities: Entity[]): Section {
    const section = new Section(project, {
      text: "section",
      children: entities,
    });

    return section;
  }

  rename(newName: string) {
    this.text = newName;
    this.adjustLocationAndSize();
  }

  adjustLocationAndSize() {
    let rectangle: Rectangle;
    const titleSize = getTextSize(this.text, Renderer.FONT_SIZE);

    if (this.children.length === 0) {
      rectangle = new Rectangle(
        this.collisionBox.getRectangle().location,
        new Vector(Math.max(titleSize.x + Renderer.NODE_PADDING * 2, 100), 100),
      );
    } else {
      // 调整展开状态
      rectangle = Rectangle.getBoundingRectangle(
        this.children.map((child) => child.collisionBox.getRectangle()),
        30,
      );
      rectangle.size.x = Math.max(rectangle.size.x, titleSize.x + Renderer.NODE_PADDING * 2);
      // 留白范围在上面调整
      rectangle.location = rectangle.location.subtract(new Vector(0, 50));
      rectangle.size = rectangle.size.add(new Vector(0, 50));
    }

    this._collisionBoxNormal.shapes = rectangle.getBoundingLines();
    // 群友需求：希望Section框扩大交互范围，标题也能拖动
    const newRect = new Rectangle(rectangle.location.clone(), new Vector(rectangle.size.x, 50));
    this._collisionBoxNormal.shapes.push(newRect);
    // 调整折叠状态
    this._collisionBoxWhenCollapsed = this.collapsedCollisionBox();
  }
  /**
   * 根据自身的折叠状态调整子节点的状态
   * 以屏蔽触碰和显示
   */
  adjustChildrenStateByCollapse() {
    if (this.isCollapsed) {
      this.children.forEach((child) => {
        if (child instanceof Section) {
          child.adjustChildrenStateByCollapse();
        }
        child.isHiddenBySectionCollapse = true;
      });
    }
  }

  /**
   * 获取节点的选中状态
   */
  public get isSelected() {
    return this._isSelected;
  }
  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  /**
   * 只读，获取节点的矩形
   * 若要修改节点的矩形，请使用 moveTo等 方法
   */
  public get rectangle(): Rectangle {
    if (this.isCollapsed) {
      return this._collisionBoxWhenCollapsed.getRectangle();
    } else {
      const topLine: Line = this._collisionBoxNormal.shapes[0] as Line;
      const rightLine: Line = this._collisionBoxNormal.shapes[1] as Line;
      const bottomLine: Line = this._collisionBoxNormal.shapes[2] as Line;
      const leftLine: Line = this._collisionBoxNormal.shapes[3] as Line;
      return new Rectangle(
        new Vector(leftLine.start.x, topLine.start.y),
        new Vector(rightLine.end.x - leftLine.start.x, bottomLine.end.y - topLine.start.y),
      );
    }
  }

  public get geometryCenter() {
    return this.rectangle.location.clone().add(this.rectangle.size.clone().multiply(0.5));
  }

  move(delta: Vector): void {
    // 让自己移动
    for (const shape of this.collisionBox.shapes) {
      if (shape instanceof Line) {
        shape.start = shape.start.add(delta);
        shape.end = shape.end.add(delta);
      } else if (shape instanceof Rectangle) {
        shape.location = shape.location.add(delta);
      }
    }
    // 让内部元素也移动
    for (const child of this.children) {
      child.move(delta);
    }

    // 移动雪花特效
    this.project.effects.addEffect(new NodeMoveShadowEffect(new ProgressNumber(0, 30), this.rectangle, delta));
    this.updateFatherSectionByMove();
    // 移动其他实体，递归碰撞
    this.updateOtherEntityLocationByMove();
  }
  protected override collideWithOtherEntity(other: Entity): void {
    if (!Settings.isEnableEntityCollision) {
      return;
    }
    if (other instanceof Section) {
      if (this.project.sectionMethods.isEntityInSection(this, other)) {
        return;
      }
    }
    if (this.project.sectionMethods.isEntityInSection(other, this)) {
      return;
    }
    super.collideWithOtherEntity(other);
  }

  /**
   * 将某个物体 的最小外接矩形的左上角位置 移动到某个位置
   * @param location
   */
  moveTo(location: Vector): void {
    const currentLeftTop = this.rectangle.location;
    const delta = location.clone().subtract(currentLeftTop);
    this.move(delta);
    this.updateFatherSectionByMove();
  }
}
