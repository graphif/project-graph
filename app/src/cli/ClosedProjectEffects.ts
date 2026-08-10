type EffectsContract = Pick<
  InstanceType<typeof import("@/core/service/feedbackService/effectEngine/effectMachine").Effects>,
  "addEffect" | "addEffects" | "effectsCount" | "tick"
>;

export class ClosedProjectEffects implements EffectsContract {
  static id = "effects";

  readonly effectsCount = 0;

  addEffect(...args: Parameters<EffectsContract["addEffect"]>): void {
    void args;
  }

  addEffects(...args: Parameters<EffectsContract["addEffects"]>): void {
    void args;
  }

  tick(): void {}
}
