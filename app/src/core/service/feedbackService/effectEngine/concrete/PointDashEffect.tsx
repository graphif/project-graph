import { Project } from "@/core/Project";
import { EffectParticle } from "@/core/service/feedbackService/effectEngine/effectElements/effectParticle";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Color } from "@graphif/color";
import { ProgressNumber, Vector } from "@graphif/data-structures";

/**
 * 在一个点迸发一些粒子效果
 */
export class PointDashEffect extends Effect {
  public particleList: EffectParticle[] = [];

  constructor(
    public override timeProgress: ProgressNumber,
    public location: Vector,
    public particleCount: number,
  ) {
    super(timeProgress);
    for (let i = 0; i < particleCount; i++) {
      this.particleList.push(
        // 随机粒子
        new EffectParticle(
          this.location.clone(),
          Vector.fromDegrees(Math.random() * 360).multiply(Math.random() * 1),
          Vector.getZero(),
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          1,
        ),
      );
    }
  }

  override tick(project: Project) {
    super.tick(project);
    for (const particle of this.particleList) {
      // 让粒子的加速度为一些节点
      let acceleration = Vector.getZero();

      let isCollideWithEntity = false;

      for (const connectEntity of project.stageManager.getConnectableEntity()) {
        const connectEntityCenter = connectEntity.collisionBox.getRectangle().center;
        const distance = connectEntityCenter.subtract(particle.location);
        const normalizedDistance = distance.normalize().multiply(20 / distance.magnitude() ** 1.2);
        acceleration = acceleration.add(normalizedDistance);

        if (connectEntity.collisionBox.isContainsPoint(particle.location)) {
          // 粒子碰到实体
          isCollideWithEntity = true;
        }
      }
      if (isCollideWithEntity) {
        particle.color = Color.Green;
      } else {
        particle.color = project.stageStyleManager.currentStyle.StageObjectBorder.with({ a: this.timeProgress.rate });
      }
      particle.acceleration = acceleration;

      particle.tick();
    }
  }

  static fromMouseEffect(mouseWorldLocation: Vector, count: number): PointDashEffect {
    return new PointDashEffect(new ProgressNumber(0, 50), mouseWorldLocation, count);
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }
    for (const p of this.particleList) {
      const viewLocation = project.renderer.transformWorld2View(p.location);
      // const color = mixColors(
      //   p.color,
      //   p.color.toTransparent(),
      //   this.timeProgress.rate,
      // );

      project.renderUtils.renderPixel(viewLocation, p.color);
    }
  }
}
