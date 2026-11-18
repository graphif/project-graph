import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAlwaysOnTop: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  setIgnoreCursorEvents: vi.fn(),
  data: new Map<string, unknown>(),
  register: vi.fn(),
  unregister: vi.fn(),
  isRegistered: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-global-shortcut", () => ({
  register: mocks.register,
  unregister: mocks.unregister,
  isRegistered: mocks.isRegistered,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    isAlwaysOnTop: mocks.isAlwaysOnTop,
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
    mocks.isAlwaysOnTop.mockReset();
    mocks.setAlwaysOnTop.mockReset();
    mocks.setIgnoreCursorEvents.mockReset();
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

  it("系统注册失败时保持关闭状态", async () => {
    const manager = new GlobalShortcutManager();
    await manager.init();
    mocks.register.mockRejectedValueOnce(new Error("occupied"));

    await expect(manager.setShortcutEnabled("show-window", true)).rejects.toThrow("occupied");

    expect(manager.getShortcuts()[0].isEnabled).toBe(false);
    expect(mocks.data.get("show-window")).toEqual({ key: "Alt+Digit1", isEnabled: false });
  });

  it.each([true, false])("退出窗口穿透时恢复进入前的置顶状态 %s", async (wasAlwaysOnTop) => {
    mocks.isAlwaysOnTop.mockResolvedValue(wasAlwaysOnTop);
    const manager = new GlobalShortcutManager();
    await manager.setShortcutEnabled("toggle-click-through", true);
    const [, handler] = mocks.register.mock.calls[0];

    await handler({ state: "Pressed" });
    await handler({ state: "Pressed" });

    expect(mocks.setAlwaysOnTop.mock.calls).toEqual([[true], [wasAlwaysOnTop]]);
    expect(mocks.setIgnoreCursorEvents.mock.calls).toEqual([[true], [false]]);
  });

  it("开启穿透失败时恢复原置顶状态并允许重试", async () => {
    mocks.isAlwaysOnTop.mockResolvedValue(false);
    mocks.setIgnoreCursorEvents.mockRejectedValueOnce(new Error("unavailable"));
    const manager = new GlobalShortcutManager();
    await manager.setShortcutEnabled("toggle-click-through", true);
    const [, handler] = mocks.register.mock.calls[0];

    await expect(handler({ state: "Pressed" })).rejects.toThrow("unavailable");
    await handler({ state: "Pressed" });

    expect(mocks.setAlwaysOnTop.mock.calls).toEqual([[true], [false], [true]]);
    expect(mocks.setIgnoreCursorEvents.mock.calls).toEqual([[true], [true]]);
  });
});
