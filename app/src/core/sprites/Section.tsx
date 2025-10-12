import { Project } from "@/core/Project";
import { Entity } from "@/core/sprites/abstract/Entity";
import { passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Color, ColorSource, Point, PointData } from "pixi.js";
import { Value } from "platejs";

@passExtraAtArg1
@passObject
export class Section extends Entity {
  @serializable
  text: string;
  @serializable
  color: Color = new Color("transparent");
  @serializable
  sizeAdjust: "auto" | "manual" = "auto";

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      text = "",
      details = [],
      color = new Color("transparent"),
      sizeAdjust = "auto",
      position = new Point(0, 0),
    }: {
      uuid?: string;
      text?: string;
      details?: Value;
      color?: ColorSource;
      sizeAdjust?: "auto" | "manual";
      position?: PointData;
    },
  ) {
    super(project);
    this.uuid = uuid;
    this.text = text;
    this.details = details;
    this.color = new Color(color);
    this.sizeAdjust = sizeAdjust;
    this.position.copyFrom(position);
    this.layout = {
      borderRadius: 8,
      padding: 8,
      borderWidth: 2,
      borderColor: 0xffffff,
    };
  }
}
