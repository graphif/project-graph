import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Effect } from "@/core/service/feedbackService/effectEngine/effectObject";
import { NodeMoveShadowEffect } from "@/core/service/feedbackService/effectEngine/concrete/NodeMoveShadowEffect";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { getOriginalNameOf } from "virtual:original-class-name";

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
    if (!(Settings.effectsPerferences[getOriginalNameOf(effect.constructor)] ?? true)) {
      return;
    }
    this.effects.push(effect);
  }

  public get effectsCount() {
    return this.effects.length;
  }

  public addEffects(effects: Effect[]) {
    this.effects.push(
      ...effects.filter((effect) => Settings.effectsPerferences[getOriginalNameOf(effect.constructor)] ?? true),
    );
  }

  tick() {
    // 清理过时特效
    this.effects = this.effects.filter((effect) => !effect.timeProgress.isFull);
    for (const effect of this.effects) {
      effect.tick(this.project);
      effect.render(this.project);
    }
  }
}
