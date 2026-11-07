import { Color, mixColors, ProgressNumber, Vector } from "@graphif/data-structures";
import { Random } from "@/core/algorithm/random";
import { Project } from "@/core/Project";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { Direction } from "@/types/directions";

interface SparkParticle {
  location: Vector;
  velocity: Vector;
  size: number;
  life: number;
  maxLife: number;
  rotation: number; // 旋转角度
  rotationSpeed: number; // 旋转速度
  shape: "triangle" | "square"; // 形状类型
}

/**
 * 小火花迸出特效
 * 用于拖拽连线时，鼠标从节点矩形的一侧划出或划入时的特效
 * 小碎片从矩形边缘迸出，以抛物线形式坠落然后淡化消失
 */
export class SparkBurstEffect extends Effect {
  private particles: SparkParticle[] = [];
  private static readonly PARTICLE_COUNT = 10;
  private static readonly GRAVITY = 0.3;
  private static readonly SPREAD_ANGLE = Math.PI / 3; // 60度扩散角

  constructor(
    public override timeProgress: ProgressNumber,
    public originLocation: Vector,
    public direction: Direction,
    public color: Color,
  ) {
    super(timeProgress);
    this.initParticles();
  }

  private initParticles() {
    // 根据方向确定火花迸出的基础角度
    let baseAngle: number;
    switch (this.direction) {
      case Direction.Right:
        baseAngle = 0;
        break;
      case Direction.Left:
        baseAngle = Math.PI;
        break;
      case Direction.Down:
        baseAngle = Math.PI / 2;
        break;
      case Direction.Up:
        baseAngle = -Math.PI / 2;
        break;
    }

    for (let i = 0; i < SparkBurstEffect.PARTICLE_COUNT; i++) {
      // 在基础角度周围随机扩散
      const angle =
        baseAngle + Random.randomFloat(-SparkBurstEffect.SPREAD_ANGLE / 2, SparkBurstEffect.SPREAD_ANGLE / 2);
      const speed = Random.randomFloat(2, 6);

      this.particles.push({
        location: this.originLocation.clone(),
        velocity: new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed),
        size: Random.randomFloat(3, 6),
        life: 0,
        maxLife: Random.randomInt(15, 25),
        rotation: Random.randomFloat(0, Math.PI * 2),
        rotationSpeed: Random.randomFloat(-0.2, 0.2),
        shape: Random.randomBoolean() ? "triangle" : "square",
      });
    }
  }

  override tick(project: Project) {
    super.tick(project);

    for (const particle of this.particles) {
      // 更新位置
      particle.location = particle.location.add(particle.velocity);
      // 应用重力（向下加速）
      particle.velocity.y += SparkBurstEffect.GRAVITY;
      // 增加生命周期
      particle.life++;
      // 更新旋转
      particle.rotation += particle.rotationSpeed;
    }
  }

  render(project: Project) {
    if (this.timeProgress.isFull) {
      return;
    }

    const progressRate = this.timeProgress.rate;

    for (const particle of this.particles) {
      // 计算粒子的生命周期进度
      const lifeRate = particle.life / particle.maxLife;

      // 如果粒子已经死亡，跳过
      if (lifeRate >= 1) {
        continue;
      }

      // 计算透明度：随时间和生命周期双重衰减
      const fadeOut = (1 - lifeRate) * (1 - progressRate);
      const particleColor = mixColors(this.color, this.color.toTransparent(), 1 - fadeOut);

      // 转换到视图坐标
      const viewLocation = project.renderer.transformWorld2View(particle.location);
      const viewSize = particle.size * project.camera.currentScale;
      const strokeWidth = 1 * project.camera.currentScale;

      // 绘制小碎片（透明填充，细边框）
      if (particle.shape === "triangle") {
        project.shapeRenderer.renderTriangleFromCenter(
          viewLocation,
          viewSize,
          particle.rotation,
          particleColor.toNewAlpha(0.1),
          particleColor,
          strokeWidth,
        );
      } else {
        project.shapeRenderer.renderSquareFromCenter(
          viewLocation,
          viewSize,
          particle.rotation,
          particleColor.toNewAlpha(0.1),
          particleColor,
          strokeWidth,
        );
      }
    }
  }
}
