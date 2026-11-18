import { activeClickThroughShortcutAtom, store } from "@/state";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setAlwaysOnTop: vi.fn(),
  setIgnoreCursorEvents: vi.fn(),
  data: new Map<string, unknown>(),
  register: vi.fn<(key: string, handler: (event: { state: string }) => Promise<void>) => Promise<void>>(),
  unregister: vi.fn(),
  isRegistered: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-global-shortcut", () => ({
  register: mocks.register,
  unregister: mocks.unregister,
  isRegistered: mocks.isRegistered,
}));

vi.mock("@/state", async () => {
  const { atom, createStore } = await import("jotai");
  return { activeClickThroughShortcutAtom: atom<string | null>(null), store: createStore() };
});
vi.mock("@/utils/platform", () => ({ isMac: false }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    setAlwaysOnTop: mocks.setAlwaysOnTop,
    setIgnoreCursorEvents: mocks.setIgnoreCursorEvents,
  }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/core/service/Settings", () => ({ Settings: {} }));
vi.mock("@/utils/store", () => ({
  createStore: vi.fn(async () => ({
    get: vi.fn(async (key: string) => mocks.data.get(key)),
    set: vi.fn(async (key: string, value: unknown) => mocks.data.set(key, value)),
    save: vi.fn(),
  })),
}));

import { GlobalShortcutManager } from "./GlobalShortcutManager";

describe("GlobalShortcutManager", () => {
  beforeEach(() => {
    mocks.setAlwaysOnTop.mockReset();
    mocks.setIgnoreCursorEvents.mockReset();
    store.set(activeClickThroughShortcutAtom, null);
    mocks.data.clear();
    mocks.register.mockReset();
    mocks.unregister.mockReset();
    mocks.isRegistered.mockReset().mockResolvedValue(true);
  });

  it("首次启动写入两个默认关闭的快捷键", async () => {
    const manager = new GlobalShortcutManager();

    await manager.init();

    expect(manager.getShortcuts()).toMatchObject([
      { id: "show-window", key: "Alt+Digit1", isEnabled: false },
      { id: "toggle-click-through", key: "Alt+Digit2", isEnabled: false },
    ]);
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.data.get("show-window")).toEqual({ key: "Alt+Digit1", isEnabled: false });
  });

  it("启用后注册，修改时替换系统注册并保存", async () => {
    const manager = new GlobalShortcutManager();
    await manager.init();

    await manager.setShortcutEnabled("show-window", true);
    await manager.setShortcutKey("show-window", "Control+KeyK");

    expect(mocks.register).toHaveBeenCalledTimes(2);
    expect(mocks.unregister).toHaveBeenCalledWith("Alt+Digit1");
    expect(mocks.data.get("show-window")).toEqual({ key: "Control+KeyK", isEnabled: true });
  });

  it("拒绝两个全局快捷键使用相同组合键", async () => {
    const manager = new GlobalShortcutManager();
    await manager.init();

    await expect(manager.setShortcutKey("show-window", "Alt+Digit2")).rejects.toThrow(
      "该组合键已被另一个全局快捷键使用",
    );
  });

  it("窗口穿透生效后提示当前的退出键并在退出后清除", async () => {
    const id = "toggle-click-through";
    mocks.data.set(id, { key: "Control+KeyJ", isEnabled: true });
    const manager = new GlobalShortcutManager();
    await manager.init();

    await mocks.register.mock.calls[0][1]({ state: "Pressed" });
    expect(mocks.setIgnoreCursorEvents).toHaveBeenLastCalledWith(true);
    expect(store.get(activeClickThroughShortcutAtom)).toBe("Control+KeyJ");
    await expect(manager.setShortcutEnabled(id, false)).rejects.toThrow("请先退出窗口穿透点击");

    await manager.setShortcutKey(id, "Control+KeyL");
    expect(store.get(activeClickThroughShortcutAtom)).toBe("Control+KeyL");
    await mocks.register.mock.calls[1][1]({ state: "Pressed" });
    expect(mocks.setIgnoreCursorEvents).toHaveBeenLastCalledWith(false);
    expect(store.get(activeClickThroughShortcutAtom)).toBeNull();
  });

  it("系统注册失败时保持关闭状态", async () => {
    const manager = new GlobalShortcutManager();
    await manager.init();
    mocks.register.mockRejectedValueOnce(new Error("occupied"));

    await expect(manager.setShortcutEnabled("show-window", true)).rejects.toThrow("occupied");

    expect(manager.getShortcuts()[0].isEnabled).toBe(false);
    expect(mocks.data.get("show-window")).toEqual({ key: "Alt+Digit1", isEnabled: false });
  });
});
