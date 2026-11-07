import { Color, mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 线段特效
 * 直接显示全部，随着时间推移逐渐透明，但会有一个从开始到结束点的划过的特效
 *
 * 0%
 * ------------------->
 * 50%
 *          ---------->
 * 100%
 *                   ->
 */
export class LineCuttingEffect extends Effect {
  constructor(
    public override timeProgress: ProgressNumber,
    public fromLocation: Vector,
    public toLocation: Vector,
    public fromColor: Color,
    public toColor: Color,
    public lineWidth: number = 25,
  ) {
    super(timeProgress);
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    const fromLocation = this.fromLocation.add(
      this.toLocation.subtract(this.fromLocation).multiply(this.timeProgress.rate),
    );

    const toLocation = this.toLocation;
    project.worldRenderUtils.renderCuttingFlash(
      fromLocation,
      toLocation,
      this.lineWidth * (1 - this.timeProgress.rate),
      mixColors(this.fromColor, this.toColor, this.timeProgress.rate),
    );
  }
}
