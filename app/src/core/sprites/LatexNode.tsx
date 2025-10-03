import { latex2svg } from "@/utils/latex";
import { serializable } from "@graphif/serializer";
import { Assets, Point, Sprite } from "pixi.js";
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
    // 重新渲染
    this.removeChildren();
    Assets.load({
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(latex2svg(this._latex).replaceAll("currentColor", "white"))}`,
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

  constructor(
    protected readonly project: Project,
    {
      latex = "",
      uuid = crypto.randomUUID() as string,
      details = [],
      position = new Point(0, 0),
    }: {
      latex?: string;
      uuid?: string;
      details?: Value;
      position?: Point;
    },
  ) {
    super();
    this.uuid = uuid;
    this.latex = latex;
    this.details = details;
    this.position.copyFrom(position);
  }
}
