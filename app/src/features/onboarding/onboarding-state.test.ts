import { describe, expect, it, vi } from "vitest";
import type { Store } from "@/platform/store";
import { completeOnboarding, loadOnboarding, saveOnboarding, type OnboardingState } from "./onboarding-state";

const draft = {
  language: "en" as const,
  theme: "catppuccin-mocha",
  uiScalePercent: 100,
};
const state: OnboardingState = { version: 2, step: 3, draft, completedAt: null };
function storage(value?: unknown) {
  return { get: vi.fn().mockResolvedValue(value), set: vi.fn().mockResolvedValue(undefined) } as unknown as Store;
}

describe("onboarding persistence", () => {
  it("starts only in the new store and restores the saved draft and step", async () => {
    expect(await loadOnboarding(storage(), draft)).toEqual({ ...state, step: 0 });
    const interrupted = { ...state, step: 2, draft: { ...draft, uiScalePercent: 125 } };
    expect(await loadOnboarding(storage(interrupted), draft)).toEqual(interrupted);
  });
  it("does not treat corrupt or future state as completed", async () => {
    await expect(loadOnboarding(storage({ ...state, version: 3 }), draft)).rejects.toThrow();
    await expect(loadOnboarding(storage({ ...state, completedAt: "invalid" }), draft)).rejects.toThrow();
  });
  it("restores a completed transfer without completing setup", async () => {
    const transferred = { ...state, step: 1, migration: { imported: 12, completedAt: "2026-11-07T00:00:00Z" } };
    expect(await loadOnboarding(storage(transferred), draft)).toEqual(transferred);
  });
  it("persists all settings before writing the completion marker", async () => {
    const store = storage();
    const persist = vi.fn().mockResolvedValue(undefined);
    await completeOnboarding(store, state, persist);
    expect(persist).toHaveBeenCalledWith(draft);
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(store.set).mock.invocationCallOrder[0]);
    expect(store.set).toHaveBeenCalledWith("state", { ...state, completedAt: expect.any(String) });
  });
  it("leaves onboarding incomplete on settings or marker failure and supports retry", async () => {
    const store = storage();
    await expect(
      completeOnboarding(store, state, async () => {
        throw new Error("disk full");
      }),
    ).rejects.toThrow("disk full");
    expect(store.set).not.toHaveBeenCalled();
    vi.mocked(store.set).mockRejectedValueOnce(new Error("marker failed"));
    await expect(completeOnboarding(store, state, async () => {})).rejects.toThrow("marker failed");
    await expect(completeOnboarding(store, state, async () => {})).resolves.toBeUndefined();
  });
  it("rejects premature completion and invalid drafts before writing", async () => {
    const store = storage();
    const persist = vi.fn();
    await expect(completeOnboarding(store, { ...state, step: 1 }, persist)).rejects.toThrow("not ready");
    await expect(saveOnboarding(store, { ...state, draft: { ...draft, uiScalePercent: 0 } })).rejects.toThrow();
    expect(persist).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });
  it("migrates the previous five-step draft without retaining input preferences", async () => {
    const legacy = { version: 1, step: 3, draft: { ...draft, inputPreset: "trackpad" }, completedAt: null };
    await expect(loadOnboarding(storage(legacy), draft)).resolves.toEqual({ ...state, step: 3 });
  });
});
