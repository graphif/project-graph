import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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

vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: vi.fn() }));
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
});
