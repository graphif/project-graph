import { Color, ColorSource, Graphics } from "pixi.js";
import { Project } from "../Project";
import { Association, AssociationMember } from "./abstract/Association";

export class LineEdge extends Association {
  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      color = 0xffffff,
      members = [],
    }: {
      uuid?: string;
      color?: ColorSource;
      members?: AssociationMember[];
    } = {},
  ) {
    super();
    if (members.length !== 2) {
      throw new Error("LineEdge must have exactly two members");
    }
    this.uuid = uuid;
    this.color = new Color(color);
    this.members = members;
    this.refresh();

    this.on("pointerdown", () => {
      this.selected = true;
    });
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

  refresh() {
    if (this.members.length !== 2) return;
    this.removeChildren();
    const g = new Graphics();
    const s = this.source.position.subtract(this.position);
    const t = this.target.position.subtract(this.position);
    g.moveTo(s.x, s.y);
    g.lineTo(t.x, t.y);
    g.stroke({ width: 2, color: 0xff0000 });
    this.addChild(g);
    console.log(this.x, this.y, this.width, this.height);
  }
}
