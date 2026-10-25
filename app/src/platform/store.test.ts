import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isMyGo: vi.fn(() => true),
  read: vi.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>(),
  set: vi.fn<(...args: unknown[]) => Promise<void>>(),
  delete: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("mygo-runtime", () => ({ isMyGo: mocks.isMyGo }));
vi.mock("@/generated/mygo", () => ({ Stores: mocks }));

import { createStore, DesktopStore, LazyStore } from "./store";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isMyGo.mockReturnValue(true);
  mocks.read.mockResolvedValue({});
  mocks.set.mockResolvedValue();
});

describe("MyGo stores", () => {
  it("uses the typed Go service for lazy stores without initializing on import", async () => {
    const store = new LazyStore("settings.json");
    expect(mocks.read).not.toHaveBeenCalled();
    await store.init();
    await store.set("theme", "dark");
    expect(mocks.set).toHaveBeenCalledWith("settings.json", "theme", "dark");
    mocks.read.mockResolvedValue({ theme: "dark", nullable: null });
    expect(await store.get("theme")).toBe("dark");
    expect(await store.get("nullable")).toBeNull();
    expect(await store.get("missing")).toBeUndefined();
    expect(await store.get("toString")).toBeUndefined();
    expect(await store.entries()).toEqual([
      ["theme", "dark"],
      ["nullable", null],
    ]);
  });

  it("preserves operation order and waits for durable writes on save", async () => {
    const store = new DesktopStore("settings.json");
    let finish!: () => void;
    mocks.set.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const first = store.set("theme", "light");
    const second = store.set("theme", "dark");
    const saved = store.save();
    await vi.waitFor(() => expect(mocks.set).toHaveBeenCalledTimes(1));
    finish();
    await Promise.all([first, second, saved]);
    expect(mocks.set.mock.calls).toEqual([
      ["settings.json", "theme", "light"],
      ["settings.json", "theme", "dark"],
    ]);
  });

  it("propagates persistence failures and permits explicit retry", async () => {
    const store = new DesktopStore("settings.json");
    mocks.set.mockRejectedValueOnce(new Error("disk full"));
    await expect(store.set("theme", "dark")).rejects.toThrow("disk full");
    await expect(store.save()).rejects.toThrow("disk full");
    await expect(store.set("theme", "dark")).resolves.toBeUndefined();
    await expect(store.save()).resolves.toBeUndefined();
  });

  it("does not fall back to browser localStorage or old application data", async () => {
    mocks.isMyGo.mockReturnValue(false);
    await expect(createStore("settings.json")).rejects.toThrow("Desktop host missing");
  });
});
