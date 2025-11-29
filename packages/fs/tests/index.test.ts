import { describe, expect, it, vi } from "vitest";
import { URI } from "vscode-uri";
import { createFs } from "../src/index";
import type { FsProvider } from "../src/interfaces";

class MockProvider implements FsProvider {
  static schemes = ["mock"] as const;

  read = vi.fn<FsProvider["read"]>();
  readDir = vi.fn<FsProvider["readDir"]>();
  write = vi.fn<FsProvider["write"]>();
  remove = vi.fn<FsProvider["remove"]>();
  exists = vi.fn<FsProvider["exists"]>();
  mkdir = vi.fn<FsProvider["mkdir"]>();
  rename = vi.fn<FsProvider["rename"]>();
  stat = vi.fn<FsProvider["stat"]>();
}

class MockProvider2 implements FsProvider {
  static schemes = ["mock2"] as const;

  read = vi.fn<FsProvider["read"]>();
  readDir = vi.fn<FsProvider["readDir"]>();
  write = vi.fn<FsProvider["write"]>();
  remove = vi.fn<FsProvider["remove"]>();
  exists = vi.fn<FsProvider["exists"]>();
  mkdir = vi.fn<FsProvider["mkdir"]>();
  rename = vi.fn<FsProvider["rename"]>();
  stat = vi.fn<FsProvider["stat"]>();
}

describe("Fs", () => {
  it("createFs returns an Fs instance", () => {
    const fs = createFs();
    expect(fs).toHaveProperty("use");
    expect(fs).toHaveProperty("read");
    expect(typeof fs.read).toBe("function");
  });

  it("use adds provider for schemes", () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock");
    expect(provider).toBeInstanceOf(MockProvider);
  });

  it("getProvider returns undefined for unknown scheme", () => {
    const fs = createFs();
    expect(fs.getProvider("unknown")).toBeUndefined();
  });

  it("getProviderOrThrow throws for unknown scheme", () => {
    const fs = createFs();
    expect(() => fs.getProviderOrThrow("unknown")).toThrow("No provider for scheme: unknown");
  });

  it("read delegates to provider", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const uri = URI.parse("mock://test");
    const expected = new Uint8Array([1, 2, 3]);
    provider.read.mockResolvedValue(expected);
    const result = await fs.read(uri);
    expect(result).toBe(expected);
    expect(provider.read).toHaveBeenCalledWith(uri);
  });

  it("readDir delegates to provider", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const uri = URI.parse("mock://test");
    const expected = [{ name: "file", isDirectory: false, isFile: true, isSymlink: false }];
    provider.readDir.mockResolvedValue(expected);
    const result = await fs.readDir(uri);
    expect(result).toBe(expected);
    expect(provider.readDir).toHaveBeenCalledWith(uri);
  });

  it("write delegates to provider", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const uri = URI.parse("mock://test");
    const content = new Uint8Array([1, 2, 3]);
    provider.write.mockResolvedValue(undefined);
    const result = await fs.write(uri, content);
    expect(result).toBeUndefined();
    expect(provider.write).toHaveBeenCalledWith(uri, content);
  });

  it("remove delegates to provider", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const uri = URI.parse("mock://test");
    provider.remove.mockResolvedValue(undefined);
    await fs.remove(uri);
    expect(provider.remove).toHaveBeenCalledWith(uri);
  });

  it("exists delegates to provider", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const uri = URI.parse("mock://test");
    provider.exists.mockResolvedValue(true);
    const result = await fs.exists(uri);
    expect(result).toBe(true);
    expect(provider.exists).toHaveBeenCalledWith(uri);
  });

  it("mkdir delegates to provider", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const uri = URI.parse("mock://test");
    provider.mkdir.mockResolvedValue(undefined);
    await fs.mkdir(uri);
    expect(provider.mkdir).toHaveBeenCalledWith(uri);
  });

  it("stat delegates to provider", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const uri = URI.parse("mock://test");
    const expected = { isFile: true, isDirectory: false, isSymlink: false, size: 0, readonly: false };
    provider.stat.mockResolvedValue(expected);
    const result = await fs.stat(uri);
    expect(result).toBe(expected);
    expect(provider.stat).toHaveBeenCalledWith(uri);
  });

  it("rename delegates to provider when same scheme", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    const provider = fs.getProvider("mock") as MockProvider;
    const oldUri = URI.parse("mock://old");
    const newUri = URI.parse("mock://new");
    provider.rename.mockResolvedValue(undefined);
    await fs.rename(oldUri, newUri);
    expect(provider.rename).toHaveBeenCalledWith(oldUri, newUri);
  });

  it("rename copies and removes when different schemes", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    fs.use(MockProvider2);
    const provider1 = fs.getProvider("mock") as MockProvider;
    const provider2 = fs.getProvider("mock2") as MockProvider2;
    const oldUri = URI.parse("mock://old");
    const newUri = URI.parse("mock2://new");
    const content = new Uint8Array([1, 2, 3]);
    provider1.read.mockResolvedValue(content);
    provider2.write.mockResolvedValue(undefined);
    provider1.remove.mockResolvedValue(undefined);
    await fs.rename(oldUri, newUri);
    expect(provider1.read).toHaveBeenCalledWith(oldUri);
    expect(provider2.write).toHaveBeenCalledWith(newUri, content);
    expect(provider1.remove).toHaveBeenCalledWith(oldUri);
  });

  it("rename warns when write returns different URI", async () => {
    const fs = createFs();
    fs.use(MockProvider);
    fs.use(MockProvider2);
    const provider1 = fs.getProvider("mock") as MockProvider;
    const provider2 = fs.getProvider("mock2") as MockProvider2;
    const oldUri = URI.parse("mock://old");
    const newUri = URI.parse("mock2://new");
    const returnedUri = URI.parse("mock2://different");
    const content = new Uint8Array([1, 2, 3]);
    provider1.read.mockResolvedValue(content);
    provider2.write.mockResolvedValue(returnedUri);
    provider1.remove.mockResolvedValue(undefined);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await fs.rename(oldUri, newUri);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      `Warning: Renamed URI differs from target URI: ${returnedUri.toString()} vs ${newUri.toString()}`,
    );
    consoleWarnSpy.mockRestore();
  });
});
