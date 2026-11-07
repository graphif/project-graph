import { Vector } from "@graphif/data-structures";
import { EffectColors } from "../../stageStyle/stageStyle";

/**
 * 粒子类
 */
export class EffectParticle {
  constructor(
    public location: Vector,
    public velocity: Vector,
    public acceleration: Vector,
    public color: keyof EffectColors,
    public size: number,
  ) {}

  tick() {
    this.location = this.location.add(this.velocity);
    this.velocity = this.velocity.add(this.acceleration);
  }
}
