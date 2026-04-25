import type { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { NodeMoveShadowEffect } from "@/core/service/feedbackService/effectEngine/concrete/NodeMoveShadowEffect";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import type { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import type { ResizeAble } from "@/core/stage/stageObject/abstract/StageObjectInterface";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { getMultiLineTextSize } from "@/utils/font";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import type { Value } from "platejs";

/**
 *
 * 文字节点类
 * 2024年10月20日：Node 改名为 TextNode，防止与 原生 Node 类冲突
 */
@passExtraAtArg1
@passObject
export class TextNode extends ConnectableEntity implements ResizeAble {
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
   * 是否正在使用AI生成
   */
  public isAiGenerating: boolean = false;

  /**
   * 字体缩放级别，整数，基准值为0，对应默认字体大小
   * 计算公式：finalFontSize = Renderer.FONT_SIZE * Math.pow(2, fontScaleLevel)
   */
  @serializable
  public fontScaleLevel: number = 0;

  public static enableResizeCharCount = 20;

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

  /**
   * 获取节点的选中状态
   */
  public get isSelected() {
    return this._isSelected;
  }

  /**
   * 只读，获取节点的矩形
   * 若要修改节点的矩形，请使用 moveTo等 方法
   */
  public get rectangle(): Rectangle {
    return this.collisionBox.shapes[0] as Rectangle;
  }

  public get geometryCenter() {
    return this.rectangle.location.clone().add(this.rectangle.size.clone().multiply(0.5));
  }

  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  /**
   * 是否在编辑文字，编辑时不渲染文字
   */
  _isEditing: boolean = false;

  public get isEditing() {
    return this._isEditing;
  }

  public set isEditing(value: boolean) {
    this._isEditing = value;
    this.project.textNodeRenderer.renderTextNode(this);
    // 再主动渲染一次，确保即使渲染引擎停止，文字也能显示出来
  }
  isHiddenBySectionCollapse = false;

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      details = [],
      collisionBox = new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]),
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
    // 初始化字体大小缓存
    this.updateFontSizeCache();
    // if (this.text.length < TextNode.enableResizeCharCount) {
    //   this.adjustSizeByText();
    // }
    if (this.sizeAdjust === "auto") {
      this.adjustSizeByText();
    } else if (this.sizeAdjust === "manual") {
      this.resizeHandle(Vector.getZero());
    }
  }

  /**
   * 字体大小缓存，避免重复计算
   */
  private fontSizeCache: number = Renderer.FONT_SIZE;

  /**
   * 获取当前字体大小
   */
  public getFontSize(): number {
    return this.fontSizeCache;
  }

  /**
   * 动态内边距，与字体大小等比缩放
   */
  public getPadding(): number {
    return (this.fontSizeCache / Renderer.FONT_SIZE) * Renderer.NODE_PADDING;
  }

  /**
   * 动态边框粗细，与字体大小等比缩放，基准为 2px
   */
  public getBorderWidth(): number {
    return (this.fontSizeCache / Renderer.FONT_SIZE) * 2;
  }

  /**
   * 动态圆角半径，与字体大小等比缩放
   */
  public getBorderRadius(): number {
    return (this.fontSizeCache / Renderer.FONT_SIZE) * Renderer.NODE_ROUNDED_RADIUS;
  }

  /**
   * 更新字体大小缓存
   * fontScaleLevel 存储的是"半个级别"，所以计算时要除以 2
   * 这样步长就是 0.5，避免了浮点数精度问题
   */
  private updateFontSizeCache(): void {
    this.fontSizeCache = Renderer.FONT_SIZE * 2 ** (this.fontScaleLevel / 2);
    if (this.fontSizeCache >= 2) {
      // 确保指数变化的过程中字体不会变小到0
      this.fontSizeCache = Math.floor(this.fontSizeCache);
    }
  }

  public setFontScaleLevel(level: number) {
    this.fontScaleLevel = level;
    this.updateFontSizeCache();
    if (this.sizeAdjust === "auto") {
      this.adjustSizeByText();
    } else if (this.sizeAdjust === "manual") {
      this.resizeHandle(Vector.getZero());
    }
  }

  /**
   * 放大字体
   * @param anchorRate 可选。缩放时保持固定的锚点（矩形内比例，如 (0.5,0.5) 为中心）。不传则保持左上角不变。
   */
  public increaseFontSize(anchorRate?: Vector): void {
    this.fontScaleLevel++;
    this.updateFontSizeCache();
    if (this.sizeAdjust === "auto") {
      const oldRect = this.rectangle.clone();
      this.adjustSizeByText();
      if (anchorRate) {
        this._adjustLocationToKeepAnchor(oldRect, anchorRate);
      }
    }
  }

  /**
   * 缩小字体
   * @param anchorRate 可选。缩放时保持固定的锚点（矩形内比例）。不传则保持左上角不变。
   */
  public decreaseFontSize(anchorRate?: Vector): void {
    this.fontScaleLevel--;
    this.updateFontSizeCache();
    if (this.sizeAdjust === "auto") {
      const oldRect = this.rectangle.clone();
      this.adjustSizeByText();
      if (anchorRate) {
        this._adjustLocationToKeepAnchor(oldRect, anchorRate);
      }
    }
  }

  /**
   * 在尺寸已变更后，根据旧矩形和锚点比例调整 location，使锚点在世界坐标中保持不变
   */
  private _adjustLocationToKeepAnchor(oldRect: Rectangle, anchorRate: Vector): void {
    const newSize = this.rectangle.size;
    const locationDelta = new Vector(
      (oldRect.size.x - newSize.x) * anchorRate.x,
      (oldRect.size.y - newSize.y) * anchorRate.y,
    );
    this.moveTo(oldRect.location.clone().add(locationDelta));
  }

  /**
   * 调整后的矩形是当前文字加了一圈padding之后的大小
   */
  private adjustSizeByText() {
    this.collisionBox.shapes[0] = new Rectangle(
      this.rectangle.location.clone(),
      getMultiLineTextSize(this.text, this.getFontSize(), 1.5).add(Vector.same(this.getPadding()).multiply(2)),
    );
  }
  private adjustHeightByText() {
    const wrapWidth = this.rectangle.size.x - this.getPadding() * 2;
    const newTextSize = this.project.textRenderer.measureMultiLineTextSize(
      this.text,
      this.getFontSize(),
      wrapWidth,
      1.5,
    );
    this.collisionBox.shapes[0] = new Rectangle(
      this.rectangle.location.clone(),
      new Vector(this.rectangle.size.x, newTextSize.y + this.getPadding() * 2),
    );
    this.updateFatherSectionByMove();
  }
  /**
   * 强制触发自动调整大小
   */
  public forceAdjustSizeByText() {
    this.adjustSizeByText();
  }

  // private adjustSizeByTextWidthLimitWidth(width: number) {
  //   const currentSize = this.project.textRenderer.measureMultiLineTextSize(this.text, Renderer.FONT_SIZE, width, 1.5);
  //   this.collisionBox.shapes[0] = new Rectangle(
  //     this.rectangle.location.clone(),
  //     currentSize.clone().add(Vector.same(Renderer.NODE_PADDING).multiply(2)),
  //   );
  // }

  rename(text: string) {
    this.text = text;
    // if (this.text.length < TextNode.enableResizeCharCount) {
    //   this.adjustSizeByText();
    // }
    if (this.sizeAdjust === "auto") {
      this.adjustSizeByText();
    } else if (this.sizeAdjust === "manual") {
      this.adjustHeightByText();
    }
    // 向孪生兄弟同步 text（_isSyncing 为 true 时说明自己正在被同步写入，跳过避免循环）
    if (!this._isSyncing) {
      this.project.syncAssociationManager.syncFrom(this, "text");
    }
  }

  resizeHandle(delta: Vector) {
    const currentRect: Rectangle = this.collisionBox.shapes[0] as Rectangle;
    const newRectangle = currentRect.clone();
    // todo：宽度能自定义控制，但是高度不能
    const newSize = newRectangle.size.add(delta);
    newSize.x = Math.max(75, newSize.x);
    const newTextSize = this.project.textRenderer.measureMultiLineTextSize(
      this.text,
      this.getFontSize(),
      newSize.x - this.getPadding() * 2,
      1.5,
    );
    newSize.y = newTextSize.y + this.getPadding() * 2;
    newRectangle.size = newSize;

    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }

  resizeWidthTo(width: number) {
    const currentWidth = this.rectangle.size.x;
    this.resizeHandle(new Vector(width - currentWidth, 0));
  }

  getResizeHandleRect(): Rectangle {
    const rect = this.collisionBox.getRectangle();
    return new Rectangle(rect.rightTop, new Vector(25, rect.size.y));
  }

  /**
   * 将某个物体移动一小段距离
   * @param delta
   */
  move(delta: Vector) {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapes[0] = newRectangle;

    // 移动雪花特效
    if (!this.isHiddenBySectionCollapse) {
      this.project.effects.addEffect(new NodeMoveShadowEffect(new ProgressNumber(0, 30), this.rectangle, delta));
    }
    this.updateFatherSectionByMove();
    // 移动其他实体，递归碰撞
    this.updateOtherEntityLocationByMove();
  }

  protected override collideWithOtherEntity(other: Entity): void {
    if (!Settings.isEnableEntityCollision) {
      return;
    }
    if (other instanceof Section) {
      // 如果碰撞的东西是一个section
      // 如果自己是section的子节点，则不移动
      if (this.project.sectionMethods.isEntityInSection(this, other)) {
        return;
      }
    }
    super.collideWithOtherEntity(other);
  }

  /**
   * 将某个物体 的最小外接矩形的左上角位置 移动到某个位置
   * @param location
   */
  moveTo(location: Vector) {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = location.clone();
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
}
