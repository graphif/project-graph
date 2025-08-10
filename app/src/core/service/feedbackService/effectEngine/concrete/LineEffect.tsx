import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";

/**
 * 线段特效
 * 直接显示全部，随着时间推移逐渐透明
 */
export class LineEffect extends Effect {
  constructor(
    public override timeProgress: ProgressNumber,
    public fromLocation: Vector,
    public toLocation: Vector,
    public fromColor: Color,
    public toColor: Color,
    public lineWidth: number,
  ) {
    super(timeProgress);
  }
  static default(fromLocation: Vector, toLocation: Vector) {
    return new LineEffect(
      new ProgressNumber(0, 30),
      fromLocation,
      toLocation,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      1,
    );
  }
  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    const fromLocation = project.renderer.transformWorld2View(this.fromLocation);
    const toLocation = project.renderer.transformWorld2View(this.toLocation);
    const fromColor = this.fromColor.with({ a: this.timeProgress.rate });
    const toColor = this.toColor.with({ a: this.timeProgress.rate });
    project.curveRenderer.renderGradientLine(
      fromLocation,
      toLocation,
      fromColor,
      toColor,
      this.lineWidth * project.camera.currentScale,
    );
  }
}
