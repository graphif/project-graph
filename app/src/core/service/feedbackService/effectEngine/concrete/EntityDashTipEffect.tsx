import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { EffectParticle } from "@/core/service/feedbackService/effectEngine/effectElements/effectParticle";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

export class EntityDashTipEffect extends Effect {
  constructor(
    public time: number,
    public rect: Rectangle,
  ) {
    super(new ProgressNumber(0, time));
    // 在矩形的每个边生成一些像素点，随机位置
    const countPreLine = 100;
    const initSpeedSize = 5;
    const initAccelerationSize = 0.5;
    // 顶边缘
    for (let i = 0; i < countPreLine; i++) {
      const pointLocation = new Vector(Random.randomFloat(rect.left, rect.right), rect.top);
      this.dashPoints.push(
        new EffectParticle(
          pointLocation,
          pointLocation.subtract(rect.center).normalize().multiply(Random.randomFloat(0, initSpeedSize)),
          rect.center.subtract(pointLocation).normalize().multiply(initAccelerationSize),
          this.project.stageStyleManager.currentStyle.effects.dash,
          1,
        ),
      );
    }
    // 右边缘
    for (let i = 0; i < countPreLine; i++) {
      const pointLocation = new Vector(rect.right, Random.randomFloat(rect.top, rect.bottom));
      this.dashPoints.push(
        new EffectParticle(
          pointLocation,
          pointLocation.subtract(rect.center).normalize().multiply(Random.randomFloat(0, initSpeedSize)),
          rect.center.subtract(pointLocation).normalize().multiply(initAccelerationSize),
          this.project.stageStyleManager.currentStyle.effects.dash,
          1,
        ),
      );
    }
    // 底边缘
    for (let i = 0; i < countPreLine; i++) {
      const pointLocation = new Vector(Random.randomFloat(rect.left, rect.right), rect.bottom);
      this.dashPoints.push(
        new EffectParticle(
          pointLocation,
          pointLocation.subtract(rect.center).normalize().multiply(Random.randomFloat(0, initSpeedSize)),
          rect.center.subtract(pointLocation).normalize().multiply(initAccelerationSize),
          this.project.stageStyleManager.currentStyle.effects.dash,
          1,
        ),
      );
    }
    // 左边缘
    for (let i = 0; i < countPreLine; i++) {
      const pointLocation = new Vector(rect.left, Random.randomFloat(rect.top, rect.bottom));
      this.dashPoints.push(
        new EffectParticle(
          pointLocation,
          pointLocation.subtract(rect.center).normalize().multiply(Random.randomFloat(0, initSpeedSize)),
          rect.center.subtract(pointLocation).normalize().multiply(initAccelerationSize),
          this.project.stageStyleManager.currentStyle.effects.dash,
          1,
        ),
      );
    }
  }

  private dashPoints: EffectParticle[] = [];

  override tick(project: Project) {
    super.tick(project);
    for (const point of this.dashPoints) {
      point.tick();
      // 粒子和矩形边缘碰撞
      if (this.rect.isPointIn(point.location)) {
        point.velocity = point.location.subtract(this.rect.center).normalize().multiply(Random.randomFloat(0, 5));
      }
    }
  }

  render(project: Project) {
    for (const point of this.dashPoints) {
      project.renderUtils.renderPixel(
        project.renderer.transformWorld2View(point.location),
        point.color.with({ a: this.timeProgress.rate }),
      );
    }
  }
}
