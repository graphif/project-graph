import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Color, mixColors, ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 矩形淡化消失特效
 * 用于矩形区域的淡出效果，支持自定义填充色和边框色
 */
export class RectangleFadeEffect extends Effect {
  constructor(
    public override timeProgress: ProgressNumber,
    private rectangle: Rectangle,
    private fillColor: Color,
    private strokeColor: Color,
    private strokeWidth: number,
  ) {
    super(timeProgress);
  }

  render(project: Project) {
    const viewRectangle = project.renderer.transformWorld2View(this.rectangle);

    project.shapeRenderer.renderRect(
      viewRectangle,
      mixColors(this.fillColor, Color.Transparent, this.timeProgress.rate),
      mixColors(this.strokeColor, Color.Transparent, this.timeProgress.rate),
      this.strokeWidth,
    );
  }
}
