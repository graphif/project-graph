import { Color, ColorSource, EventMode, Graphics, Point, type PointData } from "pixi.js";
import { Project } from "../Project";
import { Association, AssociationMember } from "./abstract/Association";

export class TempLineEdge extends Association {
  eventMode?: EventMode | undefined = "none";

  // Overrides for animation syncing
  public sourcePoint: PointData | null = null;
  public sourceRotation: number | null = null;
  public targetPoint: PointData | null = null;
  public targetRotation: number | null = null;

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
    this.uuid = uuid;
    this.color = new Color(color);
    this.members = members;
    this.refresh();
  }

  refresh() {
    if (!this.sourcePoint || !this.targetPoint) return;

    const g = new Graphics();

    // 1. Determine Start/End Points (World)
    const spWorld = new Point(this.sourcePoint.x, this.sourcePoint.y);
    const epWorld = new Point(this.targetPoint.x, this.targetPoint.y);

    // 3. Calculate Local Points relative to the computed origin
    const sp = spWorld.subtract(this.position);
    const ep = epWorld.subtract(this.position);
    const distance = Math.hypot(ep.x - sp.x, ep.y - sp.y);
    const offset = 6.25 * Math.sqrt(distance);

    // 4. Calculate CP1 (Source Control Point) (World -> Local)
    let cp1World: Point;
    if (this.sourceRotation !== null) {
      const dx = Math.cos(this.sourceRotation);
      const dy = Math.sin(this.sourceRotation);
      cp1World = new Point(spWorld.x + dx * offset, spWorld.y + dy * offset);
    } else {
      // Default: CP1 is at the start point (linear approach)
      cp1World = spWorld;
    }
    const cp1 = cp1World.subtract(this.position);

    // 5. Calculate CP2 (Target Control Point) (World -> Local)
    let cp2World: Point;
    if (this.targetRotation !== null) {
      const dx = Math.cos(this.targetRotation);
      const dy = Math.sin(this.targetRotation);
      cp2World = new Point(epWorld.x + dx * offset, epWorld.y + dy * offset);
    } else {
      // Default: CP2 is at the end point (linear approach)
      cp2World = epWorld;
    }
    const cp2 = cp2World.subtract(this.position);

    // Draw Curve
    g.moveTo(sp.x, sp.y);
    g.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, ep.x, ep.y);
    g.stroke({ width: 2, color: this.color });

    // Draw Arrow
    let angle: number;
    if (Math.abs(ep.x - cp2.x) < 0.1 && Math.abs(ep.y - cp2.y) < 0.1) {
      // CP2 is at EndPoint, use CP1 to determine angle
      angle = Math.atan2(ep.y - cp1.y, ep.x - cp1.x);
    } else {
      // CP2 is distinct, use it
      angle = Math.atan2(ep.y - cp2.y, ep.x - cp2.x);
    }

    const arrowSize = 8;
    g.moveTo(ep.x, ep.y);
    g.lineTo(ep.x - arrowSize * Math.cos(angle - Math.PI / 6), ep.y - arrowSize * Math.sin(angle - Math.PI / 6));
    g.lineTo(ep.x - arrowSize * Math.cos(angle + Math.PI / 6), ep.y - arrowSize * Math.sin(angle + Math.PI / 6));
    g.closePath();
    g.fill({ color: this.color });

    this.removeChildren();
    this.addChild(g);
  }

  _onUpdate(value: any) {
    if (!this.members) return;
    this.refresh();
    if (!value) return;
    console.log("set position to", value.x, value.y);
  }
}
