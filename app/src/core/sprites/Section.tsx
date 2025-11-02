import { serializable } from "@graphif/serializer";
import { Color, ColorSource, Container, DestroyOptions, Graphics, PointData } from "pixi.js";
import { Project } from "../Project";
import { Association, AssociationMember } from "./abstract/Association";
import { MyText } from "./MyText";

/**
 * 框
 * 3.0版本从实体改为关系
 * 目前是唯一的可以移动的关系
 */
export class Section extends Association {
  static PADDING = 16;
  static TITLE_SIZE = 24;
  allowClickToSelect = false;

  private _text: string = "";
  private _cachedTitleContainer: Container | null = null;

  @serializable
  get text() {
    return this._text;
  }
  set text(value: string) {
    this._text = value;
    this._cachedTitleContainer = null;
    this.refresh();
  }

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      color = 0xffffff,
      members = [],
      text = "test123",
    }: {
      uuid?: string;
      color?: ColorSource;
      members?: AssociationMember[];
      text?: string;
    } = {},
  ) {
    super(project);
    this.uuid = uuid;
    this.color = new Color(color);
    this.members = members;
    this.text = text;
    this.refresh();
  }

  get source() {
    return this.members[0]!;
  }
  set source(value: AssociationMember) {
    this.members[0] = value;
    this.refresh();
  }

  get target() {
    return this.members[1]!;
  }
  set target(value: AssociationMember) {
    this.members[1] = value;
    this.refresh();
  }

  private getOrCreateTitleText(x: number, y: number): Container {
    if (!this._cachedTitleContainer) {
      this._cachedTitleContainer = new Container({
        layout: {},
      });
      this._cachedTitleContainer.addChild(
        new MyText(this._text, {
          style: {
            fontSize: Section.TITLE_SIZE,
          },
          interactive: true,
          layout: true,
        }),
      );
    }
    this._cachedTitleContainer.position.set(x, y);
    const bounds = this.members.map((m) => m.entity.getWorldBounds());
    const minX = Math.min(...bounds.map((e) => e.x)) - this.position.x;
    const maxX = Math.max(...bounds.map((e) => e.x + e.width)) - this.position.x;
    this._cachedTitleContainer.layout = {
      width: maxX - minX,
    };
    return this._cachedTitleContainer;
  }

  refresh() {
    const g = new Graphics();

    const bounds = this.members.map((m) => m.entity.getWorldBounds());
    const minX = Math.min(...bounds.map((e) => e.x)) - this.position.x - Section.PADDING;
    const minY = Math.min(...bounds.map((e) => e.y)) - this.position.y - Section.PADDING * 2 - Section.TITLE_SIZE;
    const maxX = Math.max(...bounds.map((e) => e.x + e.width)) - this.position.x + Section.PADDING;
    const maxY = Math.max(...bounds.map((e) => e.y + e.height)) - this.position.y + Section.PADDING;

    g.roundRect(minX, minY, maxX - minX, maxY - minY, Section.PADDING + 8);
    g.stroke({ width: 2, color: this.color });

    this.removeChildren();
    this.addChild(g);

    if (this.text) {
      this.addChild(this.getOrCreateTitleText(minX + Section.PADDING, minY + Section.PADDING));
    }
  }

  override destroy(options?: DestroyOptions): void {
    // 移除缓存的标题文本的事件监听器
    if (this._cachedTitleContainer) {
      this._cachedTitleContainer.destroy();
      this._cachedTitleContainer = null;
    }

    super.destroy(options);
  }

  override myContainsPoint(point: PointData): boolean {
    const bounds = this.getWorldBounds();
    const titleHeight = this.text ? Section.TITLE_SIZE + Section.PADDING : 0;
    const strokeWidth = 2;
    // prettier-ignore
    return (
      // 标题区域
      (
        point.x >= bounds.x &&
        point.x <= bounds.maxX &&
        point.y >= bounds.y &&
        point.y <= bounds.y + titleHeight
      ) ||
      // 左边
      (
        point.x >= bounds.x &&
        point.x <= bounds.x + strokeWidth &&
        point.y >= bounds.y &&
        point.y <= bounds.maxY
      ) ||
      // 右边
      (
        point.x >= bounds.maxX - strokeWidth &&
        point.x <= bounds.maxX &&
        point.y >= bounds.y &&
        point.y <= bounds.maxY
      ) ||
      // 上边
      (
        point.x >= bounds.x &&
        point.x <= bounds.maxX &&
        point.y >= bounds.y &&
        point.y <= bounds.y + strokeWidth
      ) ||
      // 下边
      (
        point.x >= bounds.x &&
        point.x <= bounds.maxX &&
        point.y >= bounds.maxY - strokeWidth &&
        point.y <= bounds.maxY
      )
    );
  }

  moveTo(position: PointData): void {
    const offsetX = position.x - this.x;
    const offsetY = position.y - this.y;
    this.members.forEach((m) => {
      m.entity.position.x += offsetX;
      m.entity.position.y += offsetY;
    });
    this.emit("update");
  }
}
