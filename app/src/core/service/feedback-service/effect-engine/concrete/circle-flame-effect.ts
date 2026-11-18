import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Project } from "@/core/project";
import { Effect } from "@/core/service/feedback-service/effect-engine/effect-object";

/**
 * 圆形火光特效
 * 中间有颜色，边缘透明，中心放射状过渡
 */
export class CircleFlameEffect extends Effect {
  static readonly effectId = "CircleFlameEffect";
  constructor(
    /**
     * 一开始为0，每tick + 1
     */
    public override timeProgress: ProgressNumber,
    public location: Vector,
    public radius: number,
    public color: Color,
  ) {
    super(timeProgress);
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    this.color.a = 1 - this.timeProgress.rate;
    const rendRadius = this.radius * this.timeProgress.rate;
    project.shapeRenderer.renderCircleTransition(
      project.renderer.transformWorld2View(this.location),
      rendRadius * project.camera.currentScale,
      this.color,
    );
  }
}
