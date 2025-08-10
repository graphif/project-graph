import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { NodeMoveShadowEffect } from "@/core/service/feedbackService/effectEngine/concrete/NodeMoveShadowEffect";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Serialized } from "@/types/node";
import { getTextSize } from "@/utils/font";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 网页链接节点
 * 通过在舞台上ctrl+v触发创建
 * 一旦创建，url就不能改了，因为也不涉及修改。
 */
export class UrlNode extends ConnectableEntity {
  uuid: string;
  title: string;
  // 网页链接
  url: string;
  color: Color;
  public collisionBox: CollisionBox;

  static width: number = 300;
  static height: number = 150;
  /** 上半部分的高度 */
  static titleHeight: number = 100;
  /** 是否正在编辑标题 */
  _isEditingTitle: boolean = false;
  /** 鼠标是否悬浮在标题上 */
  isMouseHoverTitle: boolean = false;
  /** 鼠标是否悬浮在url上 */
  isMouseHoverUrl: boolean = false;

  public get isEditingTitle() {
    return this._isEditingTitle;
  }
  public set isEditingTitle(value: boolean) {
    this._isEditingTitle = value;
    this.project.urlNodeRenderer.render(this);
  }
  get geometryCenter(): Vector {
    return this.collisionBox.getRectangle().center;
  }
  /**
   * 获取上方标题部分的矩形区域
   */
  get titleRectangle(): Rectangle {
    const rect = this.rectangle;
    return new Rectangle(rect.location, new Vector(rect.size.x, UrlNode.titleHeight));
  }
  get urlRectangle(): Rectangle {
    const rect = this.rectangle;
    return new Rectangle(
      rect.location.add(new Vector(0, UrlNode.titleHeight)),
      new Vector(rect.size.x, UrlNode.height - UrlNode.titleHeight),
    );
  }
  /**
   * 只读，获取节点的矩形
   * 若要修改节点的矩形，请使用 moveTo等 方法
   */
  public get rectangle(): Rectangle {
    return this.collisionBox.shapes[0] as Rectangle;
  }
  move(delta: Vector): void {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = newRectangle.location.add(delta);
    this.collisionBox.shapes[0] = newRectangle;

    // 移动雪花特效
    this.project.effects.addEffect(new NodeMoveShadowEffect(new ProgressNumber(0, 30), this.rectangle, delta));
    this.updateFatherSectionByMove();
    // 移动其他实体，递归碰撞
    this.updateOtherEntityLocationByMove();
  }
  /**
   * 将某个物体 的最小外接矩形的左上角位置 移动到某个位置
   * @param location
   */
  moveTo(location: Vector): void {
    const newRectangle = this.rectangle.clone();
    newRectangle.location = location.clone();
    this.collisionBox.shapes[0] = newRectangle;
    this.updateFatherSectionByMove();
  }
  isHiddenBySectionCollapse: boolean = false;

  constructor(
    protected readonly project: Project,
    {
      uuid,
      title = "",
      details = "",
      url = "",
      location = [0, 0],
      size = [UrlNode.width, UrlNode.height],
      color = [0, 0, 0, 0],
    }: Partial<Serialized.UrlNode> & { uuid: string },
  ) {
    super();
    this.uuid = uuid;
    this.details = details;
    this.title = title;
    this.url = url;
    this.color = new Color(...color);
    this.collisionBox = new CollisionBox([new Rectangle(new Vector(...location), new Vector(...size))]);
  }

  rename(title: string): void {
    this.title = title;
    this.adjustSizeByText();
  }

  private adjustSizeByText() {
    const newSize = getTextSize(this.title, Renderer.FONT_SIZE).add(Vector.same(Renderer.NODE_PADDING).multiply(2));
    newSize.x = Math.max(newSize.x, UrlNode.width);
    newSize.y = Math.max(newSize.y, UrlNode.height);
    this.collisionBox.shapes[0] = new Rectangle(this.rectangle.location.clone(), newSize);
  }
}
