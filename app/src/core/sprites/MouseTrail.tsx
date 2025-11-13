import { Project } from "@/core/Project";
import { Container, Graphics, Point } from "pixi.js";

/* ════════════════════════════════════════════════════════════
   单个拖尾粒子的数据结构
   简洁设计：只存储必要的状态
   ════════════════════════════════════════════════════════════ */
class TrailParticle {
  graphics: Graphics;
  life: number = 1;
  velocity: Point;
  position: Point;

  constructor(position: Point, radius: number = 3, color: number = 0xffffff) {
    this.position = position.clone();
    this.graphics = new Graphics();
    this.graphics.circle(0, 0, radius);
    this.graphics.fill(color);
    this.graphics.position = position;
    this.graphics.visible = false;

    /* 轻微的随机速度，制造有机感 */
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.3;
    this.velocity = new Point(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  /* ────────────────────────────────────────────
     更新粒子状态：位置、透明度
     返回是否还活跃（life > 0）
     ──────────────────────────────────────────── */
  update(deltaTime: number = 1): boolean {
    this.life = Math.max(0, this.life - 0.08 * deltaTime);
    this.graphics.alpha = this.life;
    return this.life > 0;
  }

  destroy() {
    this.graphics.destroy();
  }
}

/* ════════════════════════════════════════════════════════════
   鼠标拖尾管理器
   作为独立的 Sprite 加载到场景中
   用单一 Graphics 绘制所有线段，确保拼接平滑
   ════════════════════════════════════════════════════════════ */
export class MouseTrail extends Container {
  private particles: TrailParticle[] = [];
  private trailGraphics: Graphics;
  private lastEmitPos = new Point();
  private currentMousePos = new Point();
  private emitDistance = 8;
  private enabled = true;

  constructor(private readonly project: Project) {
    super();
    this.trailGraphics = new Graphics();
    this.addChild(this.trailGraphics);
    this.setupEventListeners();
  }

  /* ────────────────────────────────────────────
     初始化事件监听
     在 ticker 中主动轮询鼠标位置
     这样可以捕捉快速移动的所有子事件
     ──────────────────────────────────────────── */
  private setupEventListeners() {
    /* 监听鼠标移动以更新当前位置 */
    this.project.viewport.on("pointermove", (e) => {
      this.currentMousePos = this.project.viewport.toWorld(e.client);
    });

    /* 每帧在 ticker 中轮询检查鼠标位置变化 */
    this.project.pixi.ticker.add(this.updateTrail, this);
  }

  /* ────────────────────────────────────────────
     每帧轮询鼠标位置变化并生成拖尾
     这样即使鼠标快速移动也不会丢失任何点
     ──────────────────────────────────────────── */
  private updateTrail = () => {
    /* 当缩放比例小于 0.5 时禁用拖尾 */
    if (this.project.viewport.scaled < 0.5) {
      this.clear();
      return;
    }

    /* 检查鼠标是否有移动 */
    const dx = this.currentMousePos.x - this.lastEmitPos.x;
    const dy = this.currentMousePos.y - this.lastEmitPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= this.emitDistance && this.enabled) {
      /* 计算中间点数量，确保在快速移动时也能覆盖 */
      const steps = Math.ceil(distance / this.emitDistance);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const interpX = this.lastEmitPos.x + dx * t;
        const interpY = this.lastEmitPos.y + dy * t;
        this.emitParticle(new Point(interpX, interpY));
      }

      this.lastEmitPos = this.currentMousePos.clone();
    }

    /* 更新所有活跃粒子并重新绘制轨迹 */
    this.updateParticles();
  };

  /* ────────────────────────────────────────────
     发射单个粒子
     ────────────────────────────────────────────── */
  private emitParticle(position: Point) {
    const particle = new TrailParticle(position, 3, 0xffffff);
    this.addChild(particle.graphics);
    this.particles.push(particle);
  }

  /* ────────────────────────────────────────────
     更新所有活跃粒子并绘制连贯的轨迹线
     ──────────────────────────────────────────── */
  private updateParticles() {
    /* 更新粒子 */
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.update()) {
        particle.destroy();
        this.removeChild(particle.graphics);
        this.particles.splice(i, 1);
      }
    }

    /* 重新绘制整条轨迹线 */
    this.redrawTrail();
  }

  /* ────────────────────────────────────────────
     用单一 Graphics 绘制所有线段
     实现渐出效果：从末端开始逐渐透明
     ────────────────────────────────────────────── */
  private redrawTrail() {
    this.trailGraphics.clear();

    if (this.particles.length < 2) return;

    /* 绘制每条线段，根据距离末端的位置设置透明度 */
    const count = this.particles.length;
    for (let i = 0; i < count - 1; i++) {
      const startParticle = this.particles[i];
      const endParticle = this.particles[i + 1];

      /* 计算这条线段的透明度梯度：离末端越近，越不透明 */
      const distanceFromEnd = count - 1 - i;
      const alpha = 1 - (distanceFromEnd / count) * 0.8; /* 0.2 ~ 1.0 的范围 */

      this.trailGraphics.moveTo(startParticle.position.x, startParticle.position.y);
      this.trailGraphics.lineTo(endParticle.position.x, endParticle.position.y);
      this.trailGraphics.stroke({ width: 3.5, color: 0xffffff, alpha });
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  clear() {
    for (const particle of this.particles) {
      particle.destroy();
      this.removeChild(particle.graphics);
    }
    this.particles = [];
    this.trailGraphics.clear();
  }

  override destroy() {
    this.project.pixi.ticker.remove(this.updateTrail, this);
    this.project.viewport.off("pointermove");
    this.clear();
    this.trailGraphics.destroy();
    super.destroy();
  }
}
