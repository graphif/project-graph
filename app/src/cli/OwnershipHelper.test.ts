import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { URI } from "vscode-uri";
import { acquireProjectOwnership, loadProjectReferences, saveProjectReferences } from "./OwnershipHelper";

const ownershipHelperPath = fileURLToPath(new URL("../../cmd/project-graph-ownership-helper/main.go", import.meta.url));
const temporaryDirectories: string[] = [];
const project = { uri: URI.parse("file:///graph.prg") };

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
  delete process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH;
  delete process.env.PROJECT_GRAPH_REFERENCE_STORE_PATH;
  delete process.env.PROJECT_GRAPH_OWNERSHIP_DIRECTORY;
});

describe("Project Object Reference helper adapter", () => {
  it("terminates the development helper without orphaning its native lock owner", async () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-terminate-helper-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "graph.prg");
    writeFileSync(path, "fixture");
    process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH = ownershipHelperPath;
    process.env.PROJECT_GRAPH_OWNERSHIP_DIRECTORY = join(directory, "locks");
    const ownership = await acquireProjectOwnership(realpathSync.native(path));
    if (ownership.status !== "acquired") throw new Error("Fixture project was already owned");
    ownership.lease.terminate();
    await expect(ownership.lease.exit).resolves.toEqual({ code: 0, signal: null });
    const next = await acquireProjectOwnership(realpathSync.native(path));
    if (next.status !== "acquired") throw new Error("Terminated helper retained the project lock");
    await next.lease.release();
  }, 30_000);

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
  }, 30_000);

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
