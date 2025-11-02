import { serializable } from "@graphif/serializer";
import {
  Color,
  ColorSource,
  Container,
  DestroyOptions,
  FederatedPointerEvent,
  Graphics,
  Point,
  PointData,
} from "pixi.js";
import { Project } from "../Project";
import { Association, AssociationMember } from "./abstract/Association";
import { MyText } from "./MyText";

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

  private onPointerDownHandler: ((e: FederatedPointerEvent) => void) | null = null;
  private onPointerUpHandler: ((e: FederatedPointerEvent) => void) | null = null;
  private onPointerUpOutsideHandler: ((e: FederatedPointerEvent) => void) | null = null;
  private onGlobalPointerMoveHandler: ((e: FederatedPointerEvent) => void) | null = null;

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

    let moving = false;
    const lastPos = new Point();
    this.onPointerDownHandler = (e) => {
      console.log(1);
      if (e.button !== 0) return;
      moving = true;
      const pos = this.project.viewport.toWorld(e.client);
      lastPos.copyFrom(pos);
    };
    this.onPointerUpHandler = () => {
      moving = false;
    };
    this.onPointerUpOutsideHandler = () => {
      moving = false;
    };
    this.onGlobalPointerMoveHandler = (e) => {
      if (moving) {
        const pos = this.project.viewport.toWorld(e.client);
        const movementX = pos.x - lastPos.x;
        const movementY = pos.y - lastPos.y;
        lastPos.copyFrom(pos);
        // 移动所有members
        for (const member of this.members) {
          member.entity.position.x += movementX;
          member.entity.position.y += movementY;
        }
        this.emit("update");
      }
    };
    this.on("pointerdown", this.onPointerDownHandler)
      .on("pointerup", this.onPointerUpHandler)
      .on("pointerupoutside", this.onPointerUpOutsideHandler)
      .on("globalpointermove", this.onGlobalPointerMoveHandler);
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

    if (this.onPointerDownHandler) this.off("pointerdown", this.onPointerDownHandler);
    if (this.onPointerUpHandler) this.off("pointerup", this.onPointerUpHandler);
    if (this.onPointerUpOutsideHandler) this.off("pointerupoutside", this.onPointerUpOutsideHandler);
    if (this.onGlobalPointerMoveHandler) this.off("globalpointermove", this.onGlobalPointerMoveHandler);
    this.onPointerDownHandler = null;
    this.onPointerUpHandler = null;
    this.onPointerUpOutsideHandler = null;
    this.onGlobalPointerMoveHandler = null;

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
}
