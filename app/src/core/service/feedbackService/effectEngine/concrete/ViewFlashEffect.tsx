import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

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

  static SaveFile() {
    return new ViewFlashEffect(
      this.project.stageStyleManager.currentStyle.effects.windowFlash,
      new ProgressNumber(0, 10),
    );
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
      this.color.with({ a: this.timeProgress.rate }),
      Color.Transparent,
      0,
    );
  }
}
