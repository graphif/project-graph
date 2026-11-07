import { z } from "zod";
import type { Store } from "@/platform/store";

export const onboardingVersion = 2;
export const onboardingDraftSchema = z.object({
  language: z.enum(["en", "zh_CN", "zh_TW", "zh_TWC", "id"]),
  theme: z.string().min(1).max(128),
  uiScalePercent: z.number().min(25).max(200),
});
export const onboardingStateSchema = z.object({
  version: z.literal(onboardingVersion),
  step: z.number().int().min(0).max(3),
  draft: onboardingDraftSchema,
  completedAt: z.iso.datetime().nullable(),
  migration: z.object({ imported: z.number().int().nonnegative(), completedAt: z.iso.datetime() }).optional(),
});
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;

export async function loadOnboarding(storage: Store, defaults: OnboardingDraft): Promise<OnboardingState> {
  const saved = await storage.get<unknown>("state");
  if (saved !== undefined) {
    const legacy = z
      .object({
        version: z.literal(1),
        step: z.number().int().min(0).max(4),
        draft: z.object({
          language: z.enum(["en", "zh_CN", "zh_TW", "zh_TWC", "id"]),
          theme: z.string().min(1).max(128),
          uiScalePercent: z.number().min(25).max(200),
          inputPreset: z.enum(["mouse", "trackpad"]),
        }),
        completedAt: z.iso.datetime().nullable(),
      })
      .safeParse(saved);
    if (legacy.success) {
      return {
        version: onboardingVersion,
        step: Math.min(legacy.data.step, 3),
        draft: {
          language: legacy.data.draft.language,
          theme: legacy.data.draft.theme,
          uiScalePercent: legacy.data.draft.uiScalePercent,
        },
        completedAt: legacy.data.completedAt,
      };
    }
    return onboardingStateSchema.parse(saved);
  }
  return { version: onboardingVersion, step: 0, draft: onboardingDraftSchema.parse(defaults), completedAt: null };
}

export async function saveOnboarding(storage: Store, state: OnboardingState): Promise<void> {
  await storage.set("state", onboardingStateSchema.parse(state));
}

export async function completeOnboarding(
  storage: Store,
  state: OnboardingState,
  persistSettings: (draft: OnboardingDraft) => Promise<void>,
): Promise<void> {
  const checked = onboardingStateSchema.parse(state);
  if (checked.step !== 3 || checked.completedAt) throw new Error("Onboarding is not ready to complete");
  // A failed settings write must never leave a completion marker behind.
  await persistSettings(checked.draft);
  await saveOnboarding(storage, { ...checked, completedAt: new Date().toISOString() });
}
