import { Color, ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import type { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

export class EntityCreateFlashEffect extends Effect {
  constructor(
    public override timeProgress: ProgressNumber,
    public rectangle: Rectangle,
    public radius: number,
  ) {
    super(timeProgress);
  }

  static fromRectangle(rectangle: Rectangle) {
    return new EntityCreateFlashEffect(new ProgressNumber(0, 12), rectangle, Renderer.NODE_ROUNDED_RADIUS);
  }

  static fromCreateEntity(entity: Entity) {
    return EntityCreateFlashEffect.fromRectangle(entity.collisionBox.getRectangle());
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    const progress = this.timeProgress.rate;
    const padding = 1 + 2 * (1 - progress) ** 3;
    const color = project.stageStyleManager.currentStyle.StageObjectBorder;
    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(this.rectangle).expandFromCenter(padding),
      Color.Transparent,
      color.toNewAlpha(color.a * 0.24 * Math.sin(Math.PI * progress)),
      1,
      this.radius * project.camera.currentScale + padding,
    );
  }
}
