import { ProgressNumber } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { EffectColors } from "@/core/service/feedbackService/stageStyle/stageStyle";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";

/**
 * 实体创建时闪光特效
 */
export class EntityCreateFlashEffect extends Effect {
  constructor(
    /**
     * 一开始为0，每tick + 1
     */
    public override timeProgress: ProgressNumber,
    public rectangle: Rectangle,
    public radius: number,
    public color: keyof EffectColors = "flash",
    public startBlurSize = 50,
  ) {
    super(timeProgress);
  }

  /**
   * 常用的默认效果
   * @param rectangle
   * @returns
   */
  static fromRectangle(rectangle: Rectangle) {
    return new EntityCreateFlashEffect(new ProgressNumber(0, 50), rectangle, Renderer.NODE_ROUNDED_RADIUS, "flash");
  }

  static fromCreateEntity(entity: Entity) {
    const result = new EntityCreateFlashEffect(
      new ProgressNumber(0, 15),
      entity.collisionBox.getRectangle(),
      Renderer.NODE_ROUNDED_RADIUS,
      "flash",
      100,
    );
    result.subEffects = [
      new EntityCreateFlashEffect(
        new ProgressNumber(0, 30),
        entity.collisionBox.getRectangle(),
        Renderer.NODE_ROUNDED_RADIUS,
        "successShadow",
        50,
      ),
      new EntityCreateFlashEffect(
        new ProgressNumber(0, 45),
        entity.collisionBox.getRectangle(),
        Renderer.NODE_ROUNDED_RADIUS,
        "successShadow",
        25,
      ),
    ];
    return result;
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    project.worldRenderUtils.renderRectangleFlash(
      project.renderer.transformWorld2View(this.rectangle),
      project.stageStyleManager.currentStyle.effects[this.color],
      this.startBlurSize * project.camera.currentScale * (1 - this.timeProgress.rate),
      this.radius * project.camera.currentScale,
    );
    for (const subEffect of this.subEffects) {
      subEffect.render(project);
    }
  }
}
