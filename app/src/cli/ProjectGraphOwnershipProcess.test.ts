import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { holdProjectOwnership, isProjectOwned, releaseProjectOwnership } from "./ProjectGraphOwnershipProcess";

const helperPath = fileURLToPath(
  new URL(
    `../../src-tauri/target/debug/project-graph-ownership-helper${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url,
  ),
);
const directories: string[] = [];

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "project-graph-lock-process-"));
  directories.push(directory);
  const projectPath = join(directory, "graph.prg");
  writeFileSync(projectPath, "");
  return { directory, projectPath };
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("portable ownership processes", () => {
  it.each([undefined, "tcp://127.0.0.1:43123"])("holds and releases ownership (%s)", async (endpoint) => {
    const { directory, projectPath } = fixture();
    expect(isProjectOwned(helperPath, projectPath, directory)).toBe(false);
    const holder = await holdProjectOwnership(helperPath, projectPath, directory, endpoint);
    try {
      expect(isProjectOwned(helperPath, projectPath, directory)).toBe(true);
    } finally {
      const exited = once(holder, "exit");
      holder.stdin.end();
      await exited;
    }
    expect(isProjectOwned(helperPath, projectPath, directory)).toBe(false);
  });

  it("reports a missing helper immediately for probes and holders", async () => {
    const { directory, projectPath } = fixture();
    const missingHelper = join(directory, "missing-helper");
    expect(() => isProjectOwned(missingHelper, projectPath, directory)).toThrow(/ENOENT/);
    await expect(holdProjectOwnership(missingHelper, projectPath, directory)).rejects.toThrow(/ENOENT/);
  });

  it("waits for a terminated holder to release its locks", async () => {
    const { directory, projectPath } = fixture();
    const holder = await holdProjectOwnership(helperPath, projectPath, directory);
    await releaseProjectOwnership(holder);
    expect(isProjectOwned(helperPath, projectPath, directory)).toBe(false);
    await releaseProjectOwnership(holder);
  });

  it("does not mistake an invalid project for contention", async () => {
    const { directory } = fixture();
    const missingProject = join(directory, "missing.prg");
    expect(() => isProjectOwned(helperPath, missingProject, directory)).toThrow(/PROJECT_NOT_FOUND/);
    await expect(holdProjectOwnership(helperPath, missingProject, directory)).rejects.toThrow(/PROJECT_NOT_FOUND/);
  });
});
