import { Dialog } from "@/components/ui/dialog";
import { serializable } from "@graphif/serializer";
import { Assets, Color, type ColorSource, FederatedEventHandler, FederatedPointerEvent, Point, Sprite } from "pixi.js";
import { Value } from "platejs";
import { Project } from "../Project";
import { Entity } from "./abstract/Entity";

export class SvgNode extends Entity {
  private _svg: string = "";
  @serializable
  get svg() {
    return this._svg;
  }
  set svg(value: string) {
    this._svg = value;
    this.refresh();
  }

  private _color: Color = new Color(0xffffff);
  @serializable
  get color(): Color {
    return this._color;
  }
  set color(source: ColorSource) {
    this._color = new Color(source);
    this.refresh();
  }

  constructor(
    protected readonly project: Project,
    {
      svg = "",
      uuid = crypto.randomUUID() as string,
      details = [],
      position = new Point(0, 0),
      color = 0xffffff,
    }: {
      svg?: string;
      uuid?: string;
      details?: Value;
      position?: Point;
      color?: ColorSource;
    },
  ) {
    super();
    this.uuid = uuid;
    this.svg = svg;
    this.details = details;
    this.position.copyFrom(position);
    this.color = color;
  }

  refresh() {
    this.removeChildren();
    Assets.load({
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(this._svg.replaceAll("currentColor", this._color.toHexa()))}`,
      data: {
        resolution: 5,
        resourceOptions: {
          scale: 5,
        },
      },
    }).then((texture) => {
      this.addChild(new Sprite(texture));
    });
  }

  private lastClickTime = 0;
  onclick?: FederatedEventHandler<FederatedPointerEvent> | null | undefined = (e) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - this.lastClickTime < 300) {
      // 双击
      this.lastClickTime = 0;
      this.edit();
    } else {
      this.lastClickTime = now;
      return;
    }
  };

  edit() {
    Dialog.input("编辑 SVG 节点", "", { defaultValue: this.svg, multiline: true }).then((result) => {
      if (result) {
        this.svg = result;
      }
    });
  }
}
