import { Color, mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 屏幕边缘闪颜色效果
 */
export class ViewOutlineFlashEffect extends Effect {
  constructor(
    public color: Color,
    public override timeProgress: ProgressNumber = new ProgressNumber(0, 100),
  ) {
    super(timeProgress);
  }

  static normal(color: Color): ViewOutlineFlashEffect {
    return new ViewOutlineFlashEffect(color);
  }

  static short(color: Color): ViewOutlineFlashEffect {
    return new ViewOutlineFlashEffect(color, new ProgressNumber(0, 5));
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    const viewRect = project.renderer.getCoverWorldRectangle();

    const currentColor = mixColors(this.color, new Color(0, 0, 0, 0), this.timeProgress.rate);
    // 左侧边缘

    project.shapeRenderer.renderRectWithShadow(
      project.renderer.transformWorld2View(new Rectangle(viewRect.leftTop, new Vector(20, viewRect.size.y))),
      currentColor,
      Color.Transparent,
      0,
      currentColor,
      200,
    );
    // 右侧边缘
    project.shapeRenderer.renderRectWithShadow(
      project.renderer.transformWorld2View(
        new Rectangle(new Vector(viewRect.left + viewRect.size.x - 20, viewRect.top), new Vector(20, viewRect.size.y)),
      ),
      currentColor,
      Color.Transparent,
      0,
      currentColor,
      50,
    );
    // 上侧边缘
    project.shapeRenderer.renderRectWithShadow(
      project.renderer.transformWorld2View(new Rectangle(viewRect.leftTop, new Vector(viewRect.size.x, 20))),
      currentColor,
      Color.Transparent,
      0,
      currentColor,
      50,
    );
    // 下侧边缘
    project.shapeRenderer.renderRectWithShadow(
      project.renderer.transformWorld2View(
        new Rectangle(new Vector(viewRect.left, viewRect.top + viewRect.size.y - 20), new Vector(viewRect.size.x, 20)),
      ),
      currentColor,
      Color.Transparent,
      0,
      currentColor,
      50,
    );
  }
}
