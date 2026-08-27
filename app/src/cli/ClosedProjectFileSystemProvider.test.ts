import { beforeEach, describe, expect, it, vi } from "vitest";
import { URI } from "vscode-uri";

const fileSystem = vi.hoisted(() => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => fileSystem);

import { FileSystemProviderFile } from "./ClosedProjectFileSystemProvider";

describe("Closed Project file persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileSystem.rm.mockResolvedValue(undefined);
    fileSystem.rename.mockResolvedValue(undefined);
  });

  it("removes a failed temporary write without replacing the Project", async () => {
    const writeError = new Error("write failed");
    fileSystem.writeFile.mockRejectedValue(writeError);
    const provider = new FileSystemProviderFile();
    const projectUri = URI.file("/projects/graph.prg");

    await expect(provider.write(projectUri, new Uint8Array([1, 2, 3]))).rejects.toBe(writeError);
    expect(fileSystem.writeFile).toHaveBeenCalledWith(
      expect.not.stringMatching(/\/projects\/graph\.prg$/),
      new Uint8Array([1, 2, 3]),
      { signal: undefined },
    );
    expect(fileSystem.rename).not.toHaveBeenCalled();
    expect(fileSystem.rm).toHaveBeenCalledWith(expect.any(String), { force: true });
  });
});
