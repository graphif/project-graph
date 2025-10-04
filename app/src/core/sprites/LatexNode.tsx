import { latex2svg } from "@/utils/latex";
import { serializable } from "@graphif/serializer";
import { Assets, Color, type ColorSource, Point, Sprite } from "pixi.js";
import { Value } from "platejs";
import { Project } from "../Project";
import { Entity } from "../stage/stageObject/abstract/StageEntity";

export class LatexNode extends Entity {
  private _latex: string = "";
  @serializable
  get latex() {
    return this._latex;
  }
  set latex(value: string) {
    this._latex = value;
    this.refresh();
  }

  private _color: Color = new Color(0xffffff);
  @serializable
  get color() {
    return this._color;
  }
  set color(source: ColorSource) {
    this._color = new Color(source);
    this.refresh();
  }

  constructor(
    protected readonly project: Project,
    {
      latex = "",
      uuid = crypto.randomUUID() as string,
      details = [],
      position = new Point(0, 0),
      color = 0xffffff,
    }: {
      latex?: string;
      uuid?: string;
      details?: Value;
      position?: Point;
      color?: ColorSource;
    },
  ) {
    super();
    this.uuid = uuid;
    this.latex = latex;
    this.details = details;
    this.position.copyFrom(position);
    this.color = color;
  }

  refresh() {
    this.removeChildren();
    Assets.load({
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(latex2svg(this._latex).replaceAll("currentColor", this._color.toHexa()))}`,
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
}
