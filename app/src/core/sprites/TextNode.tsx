import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Entity } from "@/core/sprites/abstract/Entity";
import { Color } from "@graphif/data-structures";
import { passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Point, PointData } from "pixi.js";
import { Value } from "platejs";
import { LatexNode } from "./LatexNode";
import { TextInput } from "./TextInput";

@passExtraAtArg1
@passObject
export class TextNode extends Entity {
  @serializable
  text: string;
  @serializable
  color: Color = Color.Transparent;
  @serializable
  public sizeAdjust: string = "auto";

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      details = [],
      color = Color.Transparent,
      sizeAdjust = "auto",
      position = new Point(0, 0),
    }: {
      uuid?: string;
      text?: string;
      details?: Value;
      color?: Color;
      sizeAdjust?: "auto" | "manual";
      position?: PointData;
    },
  ) {
    super();
    this.uuid = uuid;
    this.text = text;
    this.details = details;
    this.color = color;
    this.sizeAdjust = sizeAdjust;
    this.position.copyFrom(position);
    this.layout = {
      borderRadius: 8,
      padding: 8,
      borderWidth: 2,
      borderColor: 0xffffff,
    };
    this.addChild(
      new TextInput(
        this.project.viewport,
        {
          text: this.text,
          style: {
            fill: "white",
            fontFamily: "system-ui",
          },
          interactive: true,
          resolution: Settings.textResolution,
          layout: true,
        },
        // padding8+border2
        10,
      )
        .on("textchange", (value) => {
          this.text = value;
        })
        .on("finishedit", () => {
          if (this.text.startsWith("$$") && this.text.endsWith("$$")) {
            // 转换为LatexNode
            this.project.stage.push(
              new LatexNode(this.project, {
                latex: this.text.slice(2, -2).trim(),
                position: this.position,
              }),
            );
            this.destroy();
          }
        }),
    );
  }
}
