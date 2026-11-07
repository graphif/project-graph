import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 在特定的世界坐标系下渲染一个文字
 * 用途之一：给逻辑引擎渲染编号
 */
export class TextRaiseEffectLocated extends Effect {
  constructor(
    public text: string,
    public location: Vector,
    public raiseDistance: number,
    public textSize: number = 16,
    public override timeProgress: ProgressNumber = new ProgressNumber(0, 100),
  ) {
    super(timeProgress);
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    project.textRenderer.renderTextFromCenter(
      this.text,
      project.renderer.transformWorld2View(
        this.location.add(new Vector(0, -this.timeProgress.rate * this.raiseDistance)),
      ),
      this.textSize * project.camera.currentScale,
      project.stageStyleManager.currentStyle.CollideBoxPreSelected,
    );
  }

  static fromDebugLogicNode(n: number, location: Vector): TextRaiseEffectLocated {
    return new TextRaiseEffectLocated(`${n}`, location, 0, 150, new ProgressNumber(0, 3));
  }
}
