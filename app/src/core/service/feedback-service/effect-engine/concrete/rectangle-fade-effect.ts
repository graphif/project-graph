import { Project } from "@/core/project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Effect } from "@/core/service/feedback-service/effect-engine/effect-object";
import { Color, mixColors, ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 矩形淡化消失特效
 * 用于矩形区域的淡出效果，支持自定义填充色和边框色
 */
export class RectangleFadeEffect extends Effect {
  static readonly effectId = "RectangleFadeEffect";
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
      Renderer.NODE_ROUNDED_RADIUS,
    );
  }
}
