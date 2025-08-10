import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Color } from "@graphif/color";
import { ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

export class RectangleRenderEffect extends Effect {
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
    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(this.rectangle),
      this.fillColor,
      this.strokeColor.mix({ a: this.timeProgress.rate }),
      this.strokeWidth * project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * project.camera.currentScale,
    );
  }

  static fromPreAlign(rectangle: Rectangle): RectangleRenderEffect {
    return new RectangleRenderEffect(
      new ProgressNumber(0, 10),
      rectangle,
      Color.Transparent,
      // TODO: 先暂时不解决 this.project 报错问题
      // this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
      Color.White,
      4,
    );
  }

  static fromShiftClickSelect(rectangle: Rectangle): RectangleRenderEffect {
    return new RectangleRenderEffect(
      new ProgressNumber(0, 100),
      rectangle,
      Color.Transparent,
      // TODO
      Color.White,
      // this.project.stageStyleManager.currentStyle.CollideBoxPreSelected.toSolid(),
      4,
    );
  }
}
