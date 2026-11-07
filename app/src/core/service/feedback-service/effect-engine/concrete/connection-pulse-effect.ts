import { ProgressNumber, Vector } from "@graphif/data-structures";
import type { Project } from "@/core/Project";
import { Effect } from "../effectObject";

export class ConnectionPulseEffect extends Effect {
  constructor(
    private readonly start: Vector,
    private readonly end: Vector,
  ) {
    super(new ProgressNumber(0, 24));
  }

  render(project: Project) {
    if (this.timeProgress.isFull) return;
    const t = this.timeProgress.rate;
    const from = project.renderer.transformWorld2View(this.start);
    const to = project.renderer.transformWorld2View(this.end);
    const delta = to.subtract(from);
    const distance = delta.magnitude();
    if (distance < 1) return;
    const head = from.add(delta.multiply(t));
    const tail = from.add(delta.multiply(Math.max(0, t - Math.min(0.2, 32 / distance))));
    const color = project.stageStyleManager.currentStyle.CollideBoxSelected;
    const alpha = Math.sin(Math.PI * t) * 0.75;
    const ctx = project.canvas.ctx;
    ctx.save();
    try {
      ctx.lineCap = "round";
      project.curveRenderer.renderGradientLine(tail, head, color.toNewAlpha(0), color.toNewAlpha(alpha), 2);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color.toNewAlpha(alpha).toString();
      ctx.fill();
    } finally {
      ctx.restore();
    }
  }
}
