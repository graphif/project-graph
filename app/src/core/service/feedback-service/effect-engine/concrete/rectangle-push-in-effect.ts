import { Color, ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";

/**
 * 用于某个节点进入了某个Section内部，四个角连向了父Section矩形的四个角
 */
export class RectanglePushInEffect extends Effect {
  constructor(
    public smallRectangle: Rectangle,
    public bigRectangle: Rectangle,
    public override timeProgress: ProgressNumber = new ProgressNumber(0, 50),
    private reversed = false,
  ) {
    super(timeProgress);
    if (this.reversed) {
      this.subEffects = [
        new LineCuttingEffect(timeProgress, bigRectangle.leftTop, smallRectangle.leftTop, Color.Red, Color.Red),
        new LineCuttingEffect(timeProgress, bigRectangle.rightTop, smallRectangle.rightTop, Color.Red, Color.Red),
        new LineCuttingEffect(timeProgress, bigRectangle.leftBottom, smallRectangle.leftBottom, Color.Red, Color.Red),
        new LineCuttingEffect(timeProgress, bigRectangle.rightBottom, smallRectangle.rightBottom, Color.Red, Color.Red),
      ];
    } else {
      this.subEffects = [
        new LineCuttingEffect(timeProgress, smallRectangle.leftTop, bigRectangle.leftTop, Color.Green, Color.Green),
        new LineCuttingEffect(timeProgress, smallRectangle.rightTop, bigRectangle.rightTop, Color.Green, Color.Green),
        new LineCuttingEffect(
          timeProgress,
          smallRectangle.leftBottom,
          bigRectangle.leftBottom,
          Color.Green,
          Color.Green,
        ),
        new LineCuttingEffect(
          timeProgress,
          smallRectangle.rightBottom,
          bigRectangle.rightBottom,
          Color.Green,
          Color.Green,
        ),
      ];
    }
  }

  static sectionGoInGoOut(entityRectangle: Rectangle, sectionRectangle: Rectangle, isGoOut = false) {
    const timeProgress = new ProgressNumber(0, 50);
    return new RectanglePushInEffect(entityRectangle, sectionRectangle, timeProgress, isGoOut);
  }

  protected subEffects: Effect[];

  render(project: Project) {
    for (const effect of this.subEffects) {
      effect.render(project);
    }
  }
}
