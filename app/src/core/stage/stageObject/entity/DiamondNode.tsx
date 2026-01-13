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
import { Diamond, Rectangle } from "@graphif/shapes";
import { Value } from "platejs";

/**
 * 菱形节点类
 */
@passExtraAtArg1
@passObject
export class DiamondNode extends ConnectableEntity implements ResizeAble {
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
   * manual：手动调整宽度，高度自动撑开。
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
   * 只读，获取节点的菱形
   */
  public get diamond(): Diamond {
    return this.collisionBox.shapes[0] as Diamond;
  }

  /**
   * 获取外接矩形（用于兼容某些需要矩形的操作）
   */
  public get rectangle(): Rectangle {
    return this.diamond.getRectangle();
  }

  public get geometryCenter() {
    return this.diamond.getCenter();
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
    this.project.diamondNodeRenderer.renderDiamondNode(this);
  }

  isHiddenBySectionCollapse = false;

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      details = [],
      collisionBox = new CollisionBox([new Diamond(Vector.getZero(), Vector.same(120))]),
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
    const textSize = getMultiLineTextSize(this.text, this.getFontSize(), 1.5).add(
      Vector.same(Renderer.NODE_PADDING).multiply(2),
    );
    // 菱形需要保持宽高相等，取较大的值
    const size = Math.max(textSize.x, textSize.y);
    this.collisionBox.shapes[0] = new Diamond(this.diamond.location.clone(), Vector.same(size));
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
    const currentDiamond = this.diamond;
    const newSize = currentDiamond.size.add(delta);
    const minSize = 75;
    newSize.x = Math.max(minSize, newSize.x);
    newSize.y = Math.max(minSize, newSize.y);
    // 菱形保持宽高相等
    const size = Math.max(newSize.x, newSize.y);
    this.collisionBox.shapes[0] = new Diamond(currentDiamond.location.clone(), Vector.same(size));
  }

  getResizeHandleRect(): Rectangle {
    const rect = this.rectangle;
    return new Rectangle(rect.rightTop, new Vector(25, rect.size.y));
  }

  move(delta: Vector) {
    const newDiamond = this.diamond.clone();
    newDiamond.location = newDiamond.location.add(delta);
    this.collisionBox.shapes[0] = newDiamond;

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
    const newDiamond = this.diamond.clone();
    newDiamond.location = location.clone();
    this.collisionBox.shapes[0] = newDiamond;
    this.updateFatherSectionByMove();
  }
}
