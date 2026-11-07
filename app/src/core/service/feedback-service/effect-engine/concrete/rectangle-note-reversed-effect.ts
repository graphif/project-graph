import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { reverseAnimate } from "@/core/service/feedbackService/effectEngine/mathTools/animateFunctions";
import { easeInQuint } from "@/core/service/feedbackService/effectEngine/mathTools/easings";
import { Color, mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 用于提示某个矩形区域的效果
 *
 * 一个无比巨大的矩形（恰好是视野大小）突然缩小到目标矩形大小上。
 *
 * 这个效果可以用来提示某个矩形区域的存在，或者用来强调某个矩形区域的重要性。
 *
 * 目标矩形大小是世界坐标系
 */
export class RectangleNoteReversedEffect extends Effect {
  constructor(
    public override timeProgress: ProgressNumber,
    public targetRectangle: Rectangle,
    public strokeColor: Color,
  ) {
    super(timeProgress);
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    const startRect = project.renderer.getCoverWorldRectangle();
    const currentRect = new Rectangle(
      startRect.location.add(
        this.targetRectangle.location.subtract(startRect.location).multiply(easeInQuint(1 - this.timeProgress.rate)),
      ),
      new Vector(
        startRect.size.x + (this.targetRectangle.size.x - startRect.size.x) * easeInQuint(1 - this.timeProgress.rate),
        startRect.size.y + (this.targetRectangle.size.y - startRect.size.y) * easeInQuint(1 - this.timeProgress.rate),
      ),
    );
    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(currentRect),
      Color.Transparent,
      mixColors(this.strokeColor, Color.Transparent, reverseAnimate(this.timeProgress.rate)),
      2,
      5,
    );
  }
}
