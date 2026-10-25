import { describe, expect, it, vi } from "vitest";

const mygo = vi.hoisted(() => ({ isMyGo: vi.fn(() => true), runtime: vi.fn() }));
vi.mock("mygo-runtime", () => mygo);

import { getVersion } from "./app";

describe("application version", () => {
  it("uses the linked MyGo version including its prerelease suffix", async () => {
    mygo.runtime.mockReturnValue({ version: "4.2.6-alpha1" });
    expect(await getVersion()).toBe("4.2.6-alpha1");
  });

  it.each(["", "0.0.0"])("rejects missing/placeholder version %s instead of reading npm", async (version) => {
    mygo.runtime.mockReturnValue({ version });
    await expect(getVersion()).rejects.toThrow("version is missing");
  });

  it("rejects when no desktop host is available", async () => {
    mygo.isMyGo.mockReturnValue(false);
    await expect(getVersion()).rejects.toThrow("Desktop host missing");
  });
});
