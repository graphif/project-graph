import { Project } from "@/core/Project";
import { Entity } from "@/core/sprites/abstract/Entity";
import { passExtraAtArg1, passObject } from "@graphif/serializer";
import { Graphics, Point, PointData } from "pixi.js";
import { Value } from "platejs";

@passExtraAtArg1
@passObject
export class Fulcrum extends Entity {
  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      details = [],
      position = new Point(0, 0),
    }: {
      uuid?: string;
      details?: Value;
      position?: PointData;
    },
  ) {
    super(project);
    this.uuid = uuid;
    this.details = details;
    this.position.copyFrom(position);
    const g = new Graphics({
      width: 32,
      height: 32,
    });
    g.circle(16, 16, 1);
    g.fill(0xffffff);
    this.addChild(g);
  }
}
