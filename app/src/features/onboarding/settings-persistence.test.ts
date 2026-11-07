import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  entries: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockResolvedValue(undefined),
  setMany: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  init: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/platform/store", () => ({
  LazyStore: class {
    entries = mocks.entries;
    set = mocks.set;
    setMany = mocks.setMany;
    save = mocks.save;
    init = mocks.init;
  },
}));
vi.mock("@/utils/platform", () => ({ isMac: false }));

import { Settings, persistSettings, refreshSettings } from "@/core/service/settings";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.setMany.mockResolvedValue(undefined);
  mocks.entries.mockResolvedValue([]);
});

describe("durable settings used by onboarding", () => {
  it("writes only the explicit keys, never the defaults of unrelated settings", async () => {
    await persistSettings({ language: "en" });
    expect(mocks.setMany).toHaveBeenCalledExactlyOnceWith({ language: "en" });
    expect(Settings.language).toBe("en");
  });
  it("does not update memory or notify subscribers on failure", async () => {
    const previous = Settings.uiScalePercent;
    const listener = vi.fn();
    const unsubscribe = Settings.watch("uiScalePercent", listener);
    listener.mockClear();
    mocks.setMany.mockRejectedValueOnce(new Error("disk full"));
    await expect(persistSettings({ uiScalePercent: 125 })).rejects.toThrow("disk full");
    expect(Settings.uiScalePercent).toBe(previous);
    expect(listener).not.toHaveBeenCalled();
    await persistSettings({ uiScalePercent: 125 });
    expect(listener).toHaveBeenCalledWith(125);
    unsubscribe();
  });
  it("rejects invalid values before touching storage", async () => {
    await expect(persistSettings({ uiScalePercent: 0 })).rejects.toThrow();
    expect(mocks.setMany).not.toHaveBeenCalled();
  });
  it("refreshes imported settings without persisting metadata or writing again", async () => {
    mocks.entries.mockResolvedValue([
      ["language", "zh_CN"],
      ["legacyMigration", { imported: 1 }],
    ]);
    await refreshSettings();
    expect(Settings.language).toBe("zh_CN");
    expect(mocks.setMany).not.toHaveBeenCalled();
    expect(Settings).not.toHaveProperty("legacyMigration");
  });
  it("keeps valid imported settings when an old setting is incompatible", async () => {
    mocks.entries.mockResolvedValue([
      ["language", "en"],
      ["uiScalePercent", 150],
      ["mouseWheelMode", "removed-mode"],
      ["mouseLeftMode", "connect"],
    ]);
    await refreshSettings();
    expect(Settings.language).toBe("en");
    expect(Settings.uiScalePercent).toBe(150);
    expect(Settings.mouseWheelMode).toBe("zoom");
    expect(Settings.mouseLeftMode).toBe("selectAndMove");
    expect(mocks.setMany).not.toHaveBeenCalled();
  });
});
