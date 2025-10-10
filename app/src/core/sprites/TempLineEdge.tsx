import { serializable } from "@graphif/serializer";
import { Color, ColorSource, EventMode, Graphics, ObservablePoint, Point, type PointData } from "pixi.js";
import { Project } from "../Project";
import { Association, AssociationMember } from "./abstract/Association";

export class TempLineEdge extends Association {
  eventMode?: EventMode | undefined = "none";

  private _endPoint = new ObservablePoint(this, 0, 0);
  @serializable
  get endPoint(): ObservablePoint {
    return this._endPoint;
  }
  set endPoint(value: PointData) {
    this._endPoint.copyFrom(value);
  }

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      color = 0xffffff,
      members = [],
      endPoint = new Point(0, 0),
    }: {
      uuid?: string;
      color?: ColorSource;
      members?: AssociationMember[];
      endPoint?: PointData;
    } = {},
  ) {
    super(project);
    if (members.length !== 1) {
      throw new Error("LineEdge must have exactly one member");
    }
    this.uuid = uuid;
    this.color = new Color(color);
    this.members = members;
    this.endPoint = endPoint;
    this.refresh();
  }
  get source() {
    return this.members[0]!;
  }
  set source(value: AssociationMember) {
    this.members[0] = value;
    this.refresh();
  }

  refresh() {
    if (this.members.length !== 1) return;
    const g = new Graphics();
    const sp = this.source.position.subtract(this.position);
    const ep = this.endPoint.subtract(this.position);
    const distance = Math.hypot(ep.x - sp.x, ep.y - sp.y);

    // 画曲线
    const offset = 6.25 * Math.sqrt(distance);
    const cp1 = this.source.offset(offset).subtract(this.position);
    const cp2 = this.endPoint.subtract(this.source.position);
    g.moveTo(sp.x, sp.y);
    g.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, ep.x, ep.y);
    g.stroke({ width: 2, color: this.color });

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

  _onUpdate() {
    if (!this.members) return;
    this.refresh();
  }
}
