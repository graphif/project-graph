import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 圆形火光特效
 * 中间有颜色，边缘透明，中心放射状过渡
 */
export class CircleFlameEffect extends Effect {
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
