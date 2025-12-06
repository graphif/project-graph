import { Dialog } from "@/components/ui/dialog";
import { latex2svg } from "@graphif/latex";
import { serializable } from "@graphif/serializer";
import { type ColorSource, Point } from "pixi.js";
import { Value } from "platejs";
import { Project } from "../Project";
import { SvgNode } from "./SvgNode";

export class LatexNode extends SvgNode {
  private _latex: string = "";
  @serializable
  get latex() {
    return this._latex;
  }
  set latex(value: string) {
    this._latex = value;
    this.svg = latex2svg(this._latex).replaceAll("currentColor", this.color.toHexa());
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
    super(project, { uuid, details, position, color });
    this.latex = latex;
  }

  edit() {
    Dialog.input("编辑 LaTeX 公式", "", { defaultValue: this.latex, multiline: true }).then((result) => {
      if (result) {
        this.latex = result;
      }
    });
  }
}
