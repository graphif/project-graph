import { Dialog } from "@/components/ui/dialog";
import { serializable } from "@graphif/serializer";
import { Assets, Color, type ColorSource, Point } from "pixi.js";
import { Value } from "platejs";
import { Project } from "../Project";
import { TextureNode } from "./abstract/TextureNode";

export class SvgNode extends TextureNode {
  private _svg: string = "";
  @serializable
  get svg() {
    return this._svg;
  }
  set svg(value: string) {
    this._svg = value;
    Assets.load({
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value.replaceAll("currentColor", this.color.toHexa()))}`,
      data: {
        resolution: 5,
        resourceOptions: {
          scale: 5,
        },
      },
    }).then((texture) => {
      this.texture = texture;
    });
  }

  private _color: Color = new Color(0xffffff);
  @serializable
  get color(): Color {
    return this._color;
  }
  set color(source: ColorSource) {
    this._color = new Color(source);
    Assets.load({
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(this.svg.replaceAll("currentColor", new Color(source).toHexa()))}`,
      data: {
        resolution: 5,
        resourceOptions: {
          scale: 5,
        },
      },
    }).then((texture) => {
      this.texture = texture;
    });
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
    super(project);
    this.uuid = uuid;
    this.svg = svg;
    this.details = details;
    this.position.copyFrom(position);
    this.color = color;
  }

  override edit() {
    Dialog.input("编辑 SVG 节点", "", { defaultValue: this.svg, multiline: true }).then((result) => {
      if (result) {
        this.svg = result;
      }
    });
  }
}
