import { serializable } from "@graphif/serializer";
import { Color, ColorSource, DestroyOptions, Graphics } from "pixi.js";
import { Project } from "../Project";
import { Association, AssociationMember } from "./abstract/Association";
import { MyText } from "./MyText";

export class Section extends Association {
  static PADDING = 16;
  static TITLE_SIZE = 24;
  allowClickToSelect = false;

  private _text: string = "";
  private _cachedTitleText: MyText | null = null;
  private onTitlePointerDown: (() => void) | null = null;

  @serializable
  get text() {
    return this._text;
  }
  set text(value: string) {
    this._text = value;
    this._cachedTitleText = null;
    this.refresh();
  }

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      color = 0xffffff,
      members = [],
      text = "test",
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

  private getOrCreateTitleText(x: number, y: number): MyText {
    if (!this._cachedTitleText) {
      this.onTitlePointerDown = () => {
        this.selected = true;
      };
      this._cachedTitleText = new MyText(this._text, {
        style: {
          fontSize: Section.TITLE_SIZE,
        },
        interactive: true,
      }).on("pointerdown", this.onTitlePointerDown);
    }
    this._cachedTitleText.position.set(x, y);
    return this._cachedTitleText;
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
    if (this._cachedTitleText && this.onTitlePointerDown) {
      this._cachedTitleText.off("pointerdown", this.onTitlePointerDown);
    }
    if (this._cachedTitleText) {
      this._cachedTitleText.destroy();
      this._cachedTitleText = null;
    }
    this.onTitlePointerDown = null;
    super.destroy(options);
  }
}
