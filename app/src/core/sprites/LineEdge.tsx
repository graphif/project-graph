import { Color, ColorSource, Graphics, Point, Rectangle } from "pixi.js";
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
    // 原始位置
    const os = this.source.position;
    const ot = this.target.position;
    // source和target的矩形
    const sb = this.source.entity.getBounds().rectangle;
    const tb = this.target.entity.getBounds().rectangle;
    // 分别计算「线段os ot」与「矩形sb」/「矩形tb」的交点
    const dir = ot.subtract(os);
    const startPoint = this.rayRectIntersection(os, dir, sb)?.subtract(this.position);
    const endPoint = this.rayRectIntersection(ot, dir.multiplyScalar(-1), tb)?.subtract(this.position);
    if (startPoint && endPoint) {
      g.moveTo(startPoint.x, startPoint.y);
      g.lineTo(endPoint.x, endPoint.y);
      g.stroke({ width: 1, color: this.color });
    }
    this.addChild(g);
  }
  private rayRectIntersection(origin: Point, dir: Point, rect: Rectangle): Point | null {
    let tMin = -Infinity;
    let tMax = Infinity;
    if (dir.x !== 0) {
      const t1 = (rect.x - origin.x) / dir.x;
      const t2 = (rect.x + rect.width - origin.x) / dir.x;
      const tNear = Math.min(t1, t2);
      const tFar = Math.max(t1, t2);
      tMin = Math.max(tMin, tNear);
      tMax = Math.min(tMax, tFar);
    } else {
      if (origin.x < rect.x || origin.x > rect.x + rect.width) return null;
    }
    if (dir.y !== 0) {
      const t1 = (rect.y - origin.y) / dir.y;
      const t2 = (rect.y + rect.height - origin.y) / dir.y;
      const tNear = Math.min(t1, t2);
      const tFar = Math.max(t1, t2);
      tMin = Math.max(tMin, tNear);
      tMax = Math.min(tMax, tFar);
    } else {
      if (origin.y < rect.y || origin.y > rect.y + rect.height) return null;
    }
    if (tMin > tMax || tMax < 0) return null;
    const t = tMin > 0 ? tMin : tMax;
    const result = origin.add(dir.multiplyScalar(t));
    return new Point(result.x, result.y);
  }
}
