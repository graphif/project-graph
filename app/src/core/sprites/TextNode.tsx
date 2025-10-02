import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Color } from "@graphif/data-structures";
import { passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Point, PointData } from "pixi.js";
import { Value } from "platejs";
import { TextInput } from "./TextInput";

/**
 *
 * 文字节点类
 * 2024年10月20日：Node 改名为 TextNode，防止与 原生 Node 类冲突
 */
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
    public unknown = false,
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
    let pressed = false;
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
        .on("pointerdown", () => {
          pressed = true;
        })
        .on("pointerup", () => {
          pressed = false;
        })
        .on("pointerupoutside", () => {
          pressed = false;
        })
        .on("globalpointermove", (e) => {
          if (pressed) {
            this.position.add(e.movement.multiplyScalar(1 / this.project.viewport.scale.x), this.position);
          }
        }),
    );
  }
}
