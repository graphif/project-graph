import { Color, mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 屏幕闪颜色效果
 */
export class ViewFlashEffect extends Effect {
  constructor(
    public color: Color,
    public override timeProgress: ProgressNumber = new ProgressNumber(0, 100),
  ) {
    super(timeProgress);
  }

  static SaveFile(project: Project) {
    return new ViewFlashEffect(project.stageStyleManager.currentStyle.effects.windowFlash, new ProgressNumber(0, 10));
  }
  static Portal() {
    return new ViewFlashEffect(new Color(127, 75, 124), new ProgressNumber(0, 10));
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    project.shapeRenderer.renderRect(
      new Rectangle(new Vector(-10000, -10000), new Vector(20000, 20000)),
      mixColors(this.color, new Color(0, 0, 0, 0), this.timeProgress.rate),
      Color.Transparent,
      0,
    );
  }
}
