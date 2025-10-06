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
    const g = new Graphics();
    // 原始位置
    const os = this.source.position;
    const ot = this.target.position;
    // source和target的矩形
    const sb = this.source.entity.getBounds().rectangle;
    const tb = this.target.entity.getBounds().rectangle;
    // 分别计算「线段os ot」与「矩形sb」/「矩形tb」的交点，作为sp和ep
    const dx = ot.x - os.x;
    const dy = ot.y - os.y;
    type IntersectionCandidate = { t: number; x: number; y: number };
    const getExitPoint = (rect: Rectangle, p: Point): Point => {
      const candidates: IntersectionCandidate[] = [];
      // Check left side
      if (dx !== 0) {
        const t = (rect.x - p.x) / dx;
        const y = p.y + t * dy;
        if (t >= 0 && t <= 1 && y >= rect.y && y <= rect.y + rect.height) {
          candidates.push({ t, x: p.x + t * dx, y });
        }
      }
      // Check right side
      if (dx !== 0) {
        const t = (rect.x + rect.width - p.x) / dx;
        const y = p.y + t * dy;
        if (t >= 0 && t <= 1 && y >= rect.y && y <= rect.y + rect.height) {
          candidates.push({ t, x: p.x + t * dx, y });
        }
      }
      // Check top side
      if (dy !== 0) {
        const t = (rect.y - p.y) / dy;
        const x = p.x + t * dx;
        if (t >= 0 && t <= 1 && x >= rect.x && x <= rect.x + rect.width) {
          candidates.push({ t, x, y: p.y + t * dy });
        }
      }
      // Check bottom side
      if (dy !== 0) {
        const t = (rect.y + rect.height - p.y) / dy;
        const x = p.x + t * dx;
        if (t >= 0 && t <= 1 && x >= rect.x && x <= rect.x + rect.width) {
          candidates.push({ t, x, y: p.y + t * dy });
        }
      }
      if (candidates.length === 0) return new Point(p.x, p.y);
      candidates.sort((a, b) => b.t - a.t);
      return new Point(candidates[0].x, candidates[0].y);
    };
    const getEntryPoint = (rect: Rectangle, p: Point, q: Point): Point => {
      const candidates: IntersectionCandidate[] = [];
      // Check left side
      if (dx !== 0) {
        const t = (rect.x - p.x) / dx;
        const y = p.y + t * dy;
        if (t >= 0 && t <= 1 && y >= rect.y && y <= rect.y + rect.height) {
          candidates.push({ t, x: p.x + t * dx, y });
        }
      }
      // Check right side
      if (dx !== 0) {
        const t = (rect.x + rect.width - p.x) / dx;
        const y = p.y + t * dy;
        if (t >= 0 && t <= 1 && y >= rect.y && y <= rect.y + rect.height) {
          candidates.push({ t, x: p.x + t * dx, y });
        }
      }
      // Check top side
      if (dy !== 0) {
        const t = (rect.y - p.y) / dy;
        const x = p.x + t * dx;
        if (t >= 0 && t <= 1 && x >= rect.x && x <= rect.x + rect.width) {
          candidates.push({ t, x, y: p.y + t * dy });
        }
      }
      // Check bottom side
      if (dy !== 0) {
        const t = (rect.y + rect.height - p.y) / dy;
        const x = p.x + t * dx;
        if (t >= 0 && t <= 1 && x >= rect.x && x <= rect.x + rect.width) {
          candidates.push({ t, x, y: p.y + t * dy });
        }
      }
      if (candidates.length === 0) return new Point(q.x, q.y);
      candidates.sort((a, b) => a.t - b.t);
      return new Point(candidates[0].x, candidates[0].y);
    };
    const sp = getExitPoint(sb, os).subtract(this.position);
    const ep = getEntryPoint(tb, os, ot).subtract(this.position);
    g.moveTo(sp.x, sp.y);
    g.lineTo(ep.x, ep.y);
    g.stroke({ width: 1, color: this.color });
    // 画一个实心的箭头
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
