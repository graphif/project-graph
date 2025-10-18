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
    super(project);
    if (members.length !== 2) {
      throw new Error("LineEdge must have exactly two members");
    }
    this.uuid = uuid;
    this.color = new Color(color);
    this.members = members;
    this.refresh();
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
    const g = new Graphics();
    const sp = this.source.position.subtract(this.position);
    const ep = this.target.position.subtract(this.position);
    const distance = Math.hypot(ep.x - sp.x, ep.y - sp.y);

    // 获取两个控制点
    // const offset = 6.25 * Math.sqrt(distance);
    const offset = 0.5 * distance;
    const cp1 = this.source.offset(offset).subtract(this.position);
    const cp2 = this.target.offset(offset).subtract(this.position);
    g.moveTo(sp.x, sp.y);
    g.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, ep.x, ep.y);
    g.stroke({ width: 2, color: this.color });
    // debug:画出控制点
    // g.circle(cp1.x, cp1.y, 2).fill({ color: 0xff0000 });
    // g.circle(cp2.x, cp2.y, 2).fill({ color: 0x00ff00 });

    // 画箭头
    const arrowSize = 8;
    const angle = Math.atan2(ep.y - sp.y, ep.x - sp.x);
    g.moveTo(ep.x, ep.y);
    g.lineTo(ep.x - arrowSize * Math.cos(angle - Math.PI / 6), ep.y - arrowSize * Math.sin(angle - Math.PI / 6));
    g.lineTo(ep.x - arrowSize * Math.cos(angle + Math.PI / 6), ep.y - arrowSize * Math.sin(angle + Math.PI / 6));
    g.closePath();
    g.fill({ color: this.color });

    this.removeChildren();
    this.addChild(g);
  }
}
