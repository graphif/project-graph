import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { RateFunctions } from "@/core/service/feedbackService/effectEngine/mathTools/rateFunctions";

export class EntityJumpMoveEffect extends Effect {
  constructor(
    public time: number,
    public rectStart: Rectangle,
    public delta: Vector,
  ) {
    super(new ProgressNumber(0, time));
  }

  render(project: Project) {
    const currentRect = this.rectStart.clone();
    currentRect.location = currentRect.location.add(this.delta.clone().multiply(this.timeProgress.rate));

    const groundShadowRect = currentRect.clone();

    const addHeight = RateFunctions.quadraticDownward(this.timeProgress.rate) * 100;
    currentRect.location.y -= addHeight;

    // 画地面阴影
    project.shapeRenderer.renderRectWithShadow(
      project.renderer.transformWorld2View(groundShadowRect),
      project.stageStyleManager.currentStyle.effects.windowFlash.toNewAlpha(0.2),
      Color.Transparent,
      2 * project.camera.currentScale,
      project.stageStyleManager.currentStyle.effects.windowFlash.toNewAlpha(0.2),
      10,
      0,
      0,
      Renderer.NODE_ROUNDED_RADIUS * project.camera.currentScale,
    );

    // 画跳高的框
    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(currentRect),
      Color.Transparent,
      project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * project.camera.currentScale,
    );
  }
}
