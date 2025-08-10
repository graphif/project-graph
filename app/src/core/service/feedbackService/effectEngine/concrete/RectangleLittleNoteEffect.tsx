import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color } from "@graphif/color";
import { ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 用于逻辑节点执行了一次效果
 * 附着在矩形上，从中心向外扩散
 */
export class RectangleLittleNoteEffect extends Effect {
  private currentRect: Rectangle;

  constructor(
    public override timeProgress: ProgressNumber,
    public targetRectangle: Rectangle,
    public strokeColor: Color,
  ) {
    super(timeProgress);
    this.currentRect = targetRectangle.clone();
  }

  static fromUtilsLittleNote(textNode: TextNode): RectangleLittleNoteEffect {
    return new RectangleLittleNoteEffect(new ProgressNumber(0, 15), textNode.collisionBox.getRectangle(), Color.Green);
  }

  override tick(project: Project) {
    super.tick(project);
    this.currentRect = this.currentRect.expandFromCenter(Random.randomFloat(1, 2));
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(this.currentRect),
      Color.Transparent,
      this.strokeColor.with({ a: this.timeProgress.rate }),
      2 * project.camera.currentScale,
      8 * project.camera.currentScale,
    );
  }
}
