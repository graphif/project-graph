import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { URI } from "vscode-uri";
import { loadProjectReferences, saveProjectReferences } from "./OwnershipHelper";

const ownershipHelperPath = fileURLToPath(
  new URL(
    `../../src-tauri/target/debug/project-graph-ownership-helper${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url,
  ),
);
const temporaryDirectories: string[] = [];
const project = { uri: URI.parse("file:///graph.prg") };

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
  delete process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH;
  delete process.env.PROJECT_GRAPH_REFERENCE_STORE_PATH;
});

describe("Project Object Reference helper adapter", () => {
  it("loads and saves through the one-shot native helper protocol", async () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-reference-helper-"));
    temporaryDirectories.push(directory);
    process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH = ownershipHelperPath;
    process.env.PROJECT_GRAPH_REFERENCE_STORE_PATH = join(directory, "ai-project-references.json");
    const snapshot = {
      entries: [{ ref: "n1" as const, uuid: "node-1" }],
      nextNodeRef: 2,
      nextEdgeRef: 1,
    };

    await expect(loadProjectReferences(project)).resolves.toBeNull();
    await expect(saveProjectReferences(project, snapshot)).resolves.toBeUndefined();
    await expect(loadProjectReferences(project)).resolves.toEqual(snapshot);
  });

  it("keeps helper availability and transport failures in the existing public taxonomy", async () => {
    process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH = join(tmpdir(), "missing-project-graph-helper");
    await expect(loadProjectReferences(project)).rejects.toMatchObject({
      cliError: {
        code: "OWNERSHIP_HELPER_UNAVAILABLE",
        message: "Project ownership helper is unavailable.",
      },
    });

    process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH = process.execPath;
    await expect(loadProjectReferences(project)).rejects.toMatchObject({
      cliError: {
        code: "OWNERSHIP_HELPER_INVALID_RESPONSE",
        message: "Project ownership helper returned an invalid response.",
      },
    });
  });
});
