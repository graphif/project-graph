import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";

/**
 * 粒子类
 */
export class EffectParticle {
  constructor(
    public location: Vector,
    public velocity: Vector,
    public acceleration: Vector,
    public color: Color,
    public size: number,
  ) {}

  tick() {
    this.location = this.location.add(this.velocity);
    this.velocity = this.velocity.add(this.acceleration);
  }
}
