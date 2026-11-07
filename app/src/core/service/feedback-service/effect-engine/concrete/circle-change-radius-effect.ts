import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 圆形光圈缩放特效
 */
export class CircleChangeRadiusEffect extends Effect {
  constructor(
    /**
     * 一开始为0，每tick + 1
     */
    public timeProgress: ProgressNumber,
    public location: Vector,
    public radiusStart: number,
    public radiusEnd: number,
    public color: Color,
  ) {
    super(timeProgress);
  }

  get radius() {
    return this.radiusStart + (this.radiusEnd - this.radiusStart) * this.timeProgress.rate;
  }

  static fromConnectPointExpand(location: Vector, expandRadius: number) {
    return new CircleChangeRadiusEffect(
      new ProgressNumber(0, 10),
      location,
      0.01,
      expandRadius,
      new Color(255, 255, 255),
    );
  }
  static fromConnectPointShrink(location: Vector, currentRadius: number) {
    return new CircleChangeRadiusEffect(
      new ProgressNumber(0, 10),
      location,
      currentRadius,
      0.1,
      new Color(255, 255, 255),
    );
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    this.color.a = 1 - this.timeProgress.rate;
    project.shapeRenderer.renderCircle(
      project.renderer.transformWorld2View(this.location),
      this.radius * project.camera.currentScale,
      Color.Transparent,
      this.color,
      2 * project.camera.currentScale,
    );
  }
}
