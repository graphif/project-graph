import { Color, ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 实体抖动特效
 * 在实体的外接矩形增加一个像“TickTock”Logo 一样的抖动特效
 * 可以用来表示提醒效果
 */
export class EntityShakeEffect extends Effect {
  constructor(
    public time: number,
    public rect: Rectangle,
  ) {
    super(new ProgressNumber(0, time));
  }

  private shakeOffsetA: Vector = Vector.getZero();
  private shakeOffsetB: Vector = Vector.getZero();

  override tick(project: Project) {
    super.tick(project);
    const alpha = 1 - this.timeProgress.rate;
    const maxOffsetDistance = 10;
    this.shakeOffsetA = Random.randomVectorOnNormalCircle().multiply(alpha * maxOffsetDistance);
    this.shakeOffsetB = Random.randomVectorOnNormalCircle().multiply(alpha * maxOffsetDistance);
  }

  static fromEntity(entity: Entity): EntityShakeEffect {
    return new EntityShakeEffect(30, entity.collisionBox.getRectangle());
  }

  render(project: Project) {
    const rectangleA = this.rect.clone();
    rectangleA.location = rectangleA.location.add(this.shakeOffsetA).add(Vector.same(-2));
    const rectangleB = this.rect.clone();
    rectangleB.location = rectangleB.location.add(this.shakeOffsetB).add(Vector.same(2));
    const fillAlpha = (1 - this.timeProgress.rate) / 2;
    project.shapeRenderer.renderRectWithShadow(
      project.renderer.transformWorld2View(rectangleA),
      new Color(255, 0, 0, fillAlpha),
      new Color(255, 0, 0, 0.2),
      2 * project.camera.currentScale,
      Color.Red,
      50 * project.camera.currentScale,
      0,
      0,
      Renderer.NODE_ROUNDED_RADIUS,
    );
    project.shapeRenderer.renderRectWithShadow(
      project.renderer.transformWorld2View(rectangleB),
      new Color(0, 0, 255, fillAlpha),
      new Color(0, 0, 255, 0.2),
      2 * project.camera.currentScale,
      Color.Blue,
      50 * project.camera.currentScale,
      0,
      0,
      Renderer.NODE_ROUNDED_RADIUS,
    );
  }
}
