import { Color, mixColors, ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 自动吸附对齐的时候闪烁一下实体矩形边框
 */
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
      mixColors(this.strokeColor, this.strokeColor.toTransparent(), this.timeProgress.rate),
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
