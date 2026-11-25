import { Project, service } from "@/core/project";
import { DirtyLayer } from "@/core/render/canvas2d/dirty-layer";
import { Settings } from "@/core/service/settings";
import { Effect } from "@/core/service/feedback-service/effect-engine/effect-object";
import { NodeMoveShadowEffect } from "@/core/service/feedback-service/effect-engine/concrete/node-move-shadow-effect";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 特效机器
 *
 * 它将产生一个机器对象，并唯一附着在舞台上。
 * 如果有多页签多页面，则每个页面都有自己的唯一特效机器。
 */
@service("effects")
export class Effects {
  constructor(private readonly project: Project) {}

  private effects: Effect[] = [];
  private lastMoveShadowTime = -Infinity;

  public addMoveShadow(rectangle: Rectangle, delta: Vector) {
    const now = performance.now();
    if (delta.magnitude() < 1 || now - this.lastMoveShadowTime < 50) return;
    this.lastMoveShadowTime = now;
    this.addEffect(new NodeMoveShadowEffect(new ProgressNumber(0, 30), rectangle, delta));
  }

  public addEffect(effect: Effect) {
    if (!(Settings.effectsPerferences[effect.effectId] ?? true)) {
      return;
    }
    this.effects.push(effect);
    this.project.renderer?.markDirty(DirtyLayer.Overlay);
  }

  public get effectsCount() {
    return this.effects.length;
  }

  public addEffects(effects: Effect[]) {
    const filtered = effects.filter((effect) => Settings.effectsPerferences[effect.effectId] ?? true);
    if (filtered.length === 0) return;
    this.effects.push(...filtered);
    this.project.renderer?.markDirty(DirtyLayer.Overlay);
  }

  tick() {
    const hadEffects = this.effects.length > 0;
    // 清理过时特效
    this.effects = this.effects.filter((effect) => !effect.timeProgress.isFull);
    if (this.effects.length === 0) {
      if (hadEffects) {
        this.project.renderer?.markDirty(DirtyLayer.Overlay);
      }
      return;
    }
    this.project.canvas.withLayer("overlay", () => {
      for (const effect of this.effects) {
        effect.tick(this.project);
        effect.render(this.project);
      }
    });
    // 特效仍在播放，下一帧继续刷新覆盖层
    this.project.renderer?.markDirty(DirtyLayer.Overlay);
  }
}
