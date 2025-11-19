import { Color, mixColors, ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";

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
    public strokeWidth: number = 2,
  ) {
    super(timeProgress);
    this.currentRect = targetRectangle.clone();
  }

  static fromUtilsLittleNote(stageObject: StageObject): RectangleLittleNoteEffect {
    return new RectangleLittleNoteEffect(
      new ProgressNumber(0, 15),
      stageObject.collisionBox.getRectangle(),
      Color.Green,
    );
  }

  static fromUtilsSlowNote(stageObject: StageObject): RectangleLittleNoteEffect {
    return new RectangleLittleNoteEffect(
      new ProgressNumber(0, 100),
      stageObject.collisionBox.getRectangle(),
      Color.Green,
    );
  }

  static fromSearchNode(stageObject: StageObject): RectangleLittleNoteEffect {
    return new RectangleLittleNoteEffect(
      new ProgressNumber(0, 30),
      stageObject.collisionBox.getRectangle(),
      Color.Magenta,
      30,
    );
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
      mixColors(Color.Transparent, this.strokeColor, 1 - this.timeProgress.rate),
      this.strokeWidth * project.camera.currentScale,
      8 * project.camera.currentScale,
    );
  }
}
