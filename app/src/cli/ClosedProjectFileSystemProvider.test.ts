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

  it("removes an interrupted temporary write without replacing the Project", async () => {
    const cancellation = new DOMException("The operation was aborted", "AbortError");
    let rejectWrite: ((error: unknown) => void) | undefined;
    fileSystem.writeFile.mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectWrite = reject;
      }),
    );
    const provider = new FileSystemProviderFile();
    const projectUri = URI.file("/projects/graph.prg");
    const controller = new AbortController();

    const writing = provider.write(projectUri, new Uint8Array([1, 2, 3]), {
      abortSignal: controller.signal,
    } as never);
    controller.abort(cancellation);
    rejectWrite?.(cancellation);

    await expect(writing).rejects.toBe(cancellation);
    expect(fileSystem.writeFile).toHaveBeenCalledWith(
      expect.not.stringMatching(/\/projects\/graph\.prg$/),
      new Uint8Array([1, 2, 3]),
      { signal: controller.signal },
    );
    expect(fileSystem.rename).not.toHaveBeenCalled();
    expect(fileSystem.rm).toHaveBeenCalledWith(expect.any(String), { force: true });
  });
});
