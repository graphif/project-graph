type EffectsContract = Pick<
  InstanceType<typeof import("@/core/service/feedbackService/effectEngine/effectMachine").Effects>,
  "addEffect" | "addEffects" | "addMoveShadow" | "effectsCount" | "tick"
>;

export class ClosedProjectEffects implements EffectsContract {
  static id = "effects";

  readonly effectsCount = 0;

  addEffect(): void {}

  addEffects(): void {}

  addMoveShadow(): void {}

  tick(): void {}
}
