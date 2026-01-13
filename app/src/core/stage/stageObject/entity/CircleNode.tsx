import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { NodeMoveShadowEffect } from "@/core/service/feedbackService/effectEngine/concrete/NodeMoveShadowEffect";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { ResizeAble } from "@/core/stage/stageObject/abstract/StageObjectInterface";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { getMultiLineTextSize } from "@/utils/font";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Circle, Rectangle } from "@graphif/shapes";
import { Value } from "platejs";

/**
 * 圆形节点类
 */
@passExtraAtArg1
@passObject
export class CircleNode extends ConnectableEntity implements ResizeAble {
  @id
  @serializable
  uuid: string;
  @serializable
  text: string;
  @serializable
  public collisionBox: CollisionBox;
  @serializable
  color: Color = Color.Transparent;

  /**
   * 字体缩放级别，整数，基准值为0，对应默认字体大小
   */
  @serializable
  public fontScaleLevel: number = 0;

  /**
   * 调整大小的模式
   * auto：自动缩紧
   * manual：手动调整半径
   */
  @serializable
  public sizeAdjust: string = "auto";

  /**
   * 节点是否被选中
   */
  _isSelected: boolean = false;

  public get isSelected() {
    return this._isSelected;
  }

  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  /**
   * 只读，获取节点的圆形
   */
  public get circle(): Circle {
    return this.collisionBox.shapes[0] as Circle;
  }

  /**
   * 获取外接矩形（用于兼容某些需要矩形的操作）
   */
  public get rectangle(): Rectangle {
    return this.circle.getRectangle();
  }

  public get geometryCenter() {
    return this.circle.location;
  }

  /**
   * 是否在编辑文字
   */
  _isEditing: boolean = false;

  public get isEditing() {
    return this._isEditing;
  }

  public set isEditing(value: boolean) {
    this._isEditing = value;
    this.project.circleNodeRenderer.renderCircleNode(this);
  }

  isHiddenBySectionCollapse = false;

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      details = [],
      collisionBox = new CollisionBox([new Circle(Vector.getZero(), 60)]),
      color = Color.Transparent,
      sizeAdjust = "auto",
      fontScaleLevel = 0,
    }: {
      uuid?: string;
      text?: string;
      details?: Value;
      color?: Color;
      sizeAdjust?: "auto" | "manual";
      collisionBox?: CollisionBox;
      fontScaleLevel?: number;
    },
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.text = text;
    this.details = details;
    this.collisionBox = collisionBox;
    this.color = color;
    this.sizeAdjust = sizeAdjust;
    this.fontScaleLevel = fontScaleLevel;

    if (this.sizeAdjust === "auto") {
      this.adjustSizeByText();
    } else if (this.sizeAdjust === "manual") {
      this.resizeHandle(Vector.getZero());
    }
  }

  /**
   * 字体大小缓存
   */
  private fontSizeCache: number = Renderer.FONT_SIZE;

  public getFontSize(): number {
    return this.fontSizeCache;
  }

  private updateFontSizeCache(): void {
    this.fontSizeCache = Renderer.FONT_SIZE * Math.pow(2, this.fontScaleLevel);
  }

  public setFontScaleLevel(level: number) {
    this.fontScaleLevel = level;
    this.updateFontSizeCache();
  }

  public increaseFontSize(): void {
    this.fontScaleLevel++;
    this.updateFontSizeCache();
    if (this.sizeAdjust === "auto") {
      this.adjustSizeByText();
    }
  }

  public decreaseFontSize(): void {
    this.fontScaleLevel--;
    this.updateFontSizeCache();
    if (this.sizeAdjust === "auto") {
      this.adjustSizeByText();
    }
  }

  /**
   * 根据文本自动调整大小
   */
  private adjustSizeByText() {
    const textSize = getMultiLineTextSize(this.text, this.getFontSize(), 1.5);
    // 计算圆形半径，需要能容纳文本（加上padding）
    const padding = Renderer.NODE_PADDING;
    const diameter = Math.max(textSize.x, textSize.y) + padding * 2;
    const radius = diameter / 2;
    const center = this.circle.location;
    this.collisionBox.shapes[0] = new Circle(center.clone(), radius);
  }

  public forceAdjustSizeByText() {
    this.adjustSizeByText();
  }

  rename(text: string) {
    this.text = text;
    if (this.sizeAdjust === "auto") {
      this.adjustSizeByText();
    }
  }

  resizeHandle(delta: Vector) {
    const currentCircle = this.circle;
    // 使用 delta 的长度来调整半径
    const deltaRadius = (delta.x + delta.y) / 2;
    const newRadius = Math.max(37.5, currentCircle.radius + deltaRadius);
    this.collisionBox.shapes[0] = new Circle(currentCircle.location.clone(), newRadius);
  }

  getResizeHandleRect(): Rectangle {
    const rect = this.rectangle;
    return new Rectangle(rect.rightTop, new Vector(25, rect.size.y));
  }

  move(delta: Vector) {
    const newCircle = new Circle(this.circle.location.add(delta), this.circle.radius);
    this.collisionBox.shapes[0] = newCircle;

    this.project.effects.addEffect(new NodeMoveShadowEffect(new ProgressNumber(0, 30), this.rectangle, delta));
    this.updateFatherSectionByMove();
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
    super.collideWithOtherEntity(other);
  }

  moveTo(location: Vector) {
    const newCircle = new Circle(location.clone(), this.circle.radius);
    this.collisionBox.shapes[0] = newCircle;
    this.updateFatherSectionByMove();
  }
}
