import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { easeInExpo, easeOutExpo } from "@/core/service/feedbackService/effectEngine/mathTools/easings";
import { Color, mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 用于从一个矩形平滑过渡到另一个矩形的效果
 *
 * 可以用于展示矩形的移动和变形过程
 */
export class RectangleTransformEffect extends Effect {
  constructor(
    public override timeProgress: ProgressNumber,
    public startRectangle: Rectangle,
    public endRectangle: Rectangle,
    public strokeColor: Color,
  ) {
    super(timeProgress);
  }

  static fromRectangles(project: Project, startRect: Rectangle, endRect: Rectangle) {
    return new RectangleTransformEffect(
      new ProgressNumber(0, 15),
      startRect,
      endRect,
      project.stageStyleManager.currentStyle.CollideBoxPreSelected.toSolid(),
    );
  }

  override tick(project: Project) {
    super.tick(project);
  }

  getCurrentRectangle() {
    const rate = easeOutExpo(this.timeProgress.rate);
    return new Rectangle(
      this.startRectangle.location.add(
        this.endRectangle.location.subtract(this.startRectangle.location).multiply(rate),
      ),
      new Vector(
        this.startRectangle.size.x + (this.endRectangle.size.x - this.startRectangle.size.x) * rate,
        this.startRectangle.size.y + (this.endRectangle.size.y - this.startRectangle.size.y) * rate,
      ),
    );
  }

  render(project: Project) {
    if (this.timeProgress.curValue >= this.timeProgress.maxValue) {
      return;
    }

    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(this.getCurrentRectangle()),
      Color.Transparent,
      mixColors(this.strokeColor, Color.Transparent, easeInExpo(this.timeProgress.rate)),
      2 * project.camera.currentScale,
      5 * project.camera.currentScale,
    );
  }
}
