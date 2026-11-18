import { afterEach, describe, expect, it, vi } from "vitest";

const mygo = vi.hoisted(() => ({ isMyGo: vi.fn(() => false), runtime: vi.fn() }));
vi.mock("mygo-runtime", () => mygo);

afterEach(() => vi.resetModules());

describe("host platform detection", () => {
  it("is importable by Node without window", async () => {
    mygo.isMyGo.mockReturnValue(false);
    const platform = await import("@/utils/platform");
    expect(platform.isMac).toBe(false);
    expect(platform.isWindows).toBe(false);
  });

  it.each(["darwin", "win32", "linux"])("maps MyGo %s", async (name) => {
    mygo.isMyGo.mockReturnValue(true);
    mygo.runtime.mockReturnValue({ platform: name });
    const platform = await import("@/utils/platform");
    expect(platform.isMac).toBe(name === "darwin");
    expect(platform.isWindows).toBe(name === "win32");
    expect(platform.isLinux).toBe(name === "linux");
    expect(platform.family()).toBe(name === "win32" ? "windows" : "unix");
  });
});
