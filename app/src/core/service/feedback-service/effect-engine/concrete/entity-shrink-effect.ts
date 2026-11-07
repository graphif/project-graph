import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 实体收缩消失特效
 */
export class EntityShrinkEffect extends Effect {
  constructor(
    public time: number,
    public rect: Rectangle,
    public color?: Color,
  ) {
    super(new ProgressNumber(0, time));
    this.originCenterLocation = rect.center;
  }
  private originCenterLocation = Vector.getZero();

  override tick(project: Project) {
    super.tick(project);
    this.rect.size = this.rect.size.multiply(0.95);

    const currentCenter = this.rect.center;
    this.rect.location = this.rect.location.add(this.originCenterLocation.subtract(currentCenter));
  }

  static fromEntity(entity: Entity): EntityShrinkEffect {
    return new EntityShrinkEffect(
      10,
      entity.collisionBox.getRectangle(),
      "color" in entity && entity.color !== Color.Transparent ? (entity.color as Color).clone() : undefined,
    );
  }

  render(project: Project) {
    const rectangleA = this.rect.clone();

    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(rectangleA),
      (this.color ?? project.stageStyleManager.currentStyle.Background.clone()).toNewAlpha(1 - this.timeProgress.rate),
      project.stageStyleManager.currentStyle.StageObjectBorder.toNewAlpha(1 - this.timeProgress.rate),
      2 * project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * project.camera.currentScale,
    );
  }
}
