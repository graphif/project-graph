import { describe, expect, it, vi } from "vitest";

const files = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("mygo-runtime", () => ({ isMyGo: () => true }));
vi.mock("@/generated/mygo", () => ({ Files: files }));

import { decodeBytes, encodeBytes, readFile, writeFile } from "./files";

describe("Go byte binding boundary", () => {
  it.each([0, 1, 256, 200_000])("roundtrips %d binary bytes without string argument overflow", (size) => {
    const bytes = Uint8Array.from({ length: size }, (_, i) => i % 256);
    expect(decodeBytes(encodeBytes(bytes))).toEqual(bytes);
  });

  it("converts base64 only at the generated service boundary", async () => {
    files.read.mockResolvedValue("AAH/");
    expect(await readFile("C:/example.prg")).toEqual(new Uint8Array([0, 1, 255]));
    await writeFile("C:/example.prg", new Uint8Array([0, 1, 255]));
    expect(files.write).toHaveBeenCalledWith("C:/example.prg", "AAH/");
  });
});
