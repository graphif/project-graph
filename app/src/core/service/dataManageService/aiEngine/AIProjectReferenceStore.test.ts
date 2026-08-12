import { beforeEach, describe, expect, it, vi } from "vitest";
import { URI } from "vscode-uri";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
import { AIProjectReferenceStore } from "./AIProjectReferenceStore";

const snapshot = {
  entries: [{ ref: "n1" as const, uuid: "11111111-1111-4111-8111-111111111111" }],
  nextNodeRef: 2,
  nextEdgeRef: 1,
};

function project(path: string, canonicalPath?: string) {
  return { uri: URI.file(path), canonicalProjectPath: canonicalPath };
}

describe("AI Project Reference Store", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("loads a Project snapshot through the cross-process Tauri store command", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(snapshot);

    await expect(AIProjectReferenceStore.load(project("/projects/graph.prg"))).resolves.toEqual(snapshot);
    expect(invoke).toHaveBeenCalledWith("load_project_reference_snapshot", {
      projectUri: "file:///projects/graph.prg",
    });
  });

  it("keeps renderer writes ordered while delegating atomic updates to Tauri", async () => {
    let releaseFirst: (() => void) | undefined;
    vi.mocked(invoke)
      .mockReturnValueOnce(new Promise<void>((resolve) => (releaseFirst = resolve)))
      .mockResolvedValueOnce(undefined);

    const graph = project("/projects/graph.prg");
    const first = AIProjectReferenceStore.save(graph, snapshot);
    const second = AIProjectReferenceStore.save(graph, snapshot);

    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    releaseFirst?.();
    await Promise.all([first, second]);

    expect(invoke).toHaveBeenNthCalledWith(1, "save_project_reference_snapshot", {
      projectUri: "file:///projects/graph.prg",
      references: snapshot,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "save_project_reference_snapshot", {
      projectUri: "file:///projects/graph.prg",
      references: snapshot,
    });
  });

  it("does not serialize writes for unrelated Projects", async () => {
    const releaseWrites: Array<() => void> = [];
    vi.mocked(invoke).mockImplementation(
      () => new Promise<void>((resolve) => releaseWrites.push(resolve)) as Promise<never>,
    );

    const writes = [
      AIProjectReferenceStore.save(project("/projects/first.prg"), snapshot),
      AIProjectReferenceStore.save(project("/projects/second.prg"), snapshot),
    ];

    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    for (const release of releaseWrites) release();
    await Promise.all(writes);
  });

  it("delegates the legacy Project identity fallback to the native store", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(snapshot);

    await expect(AIProjectReferenceStore.load(project("/legacy/graph.prg", "/canonical/graph.prg"))).resolves.toEqual(
      snapshot,
    );
    expect(invoke).toHaveBeenCalledWith("load_project_reference_snapshot", {
      projectUri: "file:///canonical/graph.prg",
      legacyProjectUri: "file:///legacy/graph.prg",
    });
  });

  it("resolves the current canonical identity when each write starts", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const graph = project("/projects/draft.prg");

    await AIProjectReferenceStore.save(graph, snapshot);
    graph.canonicalProjectPath = "/projects/saved-as.prg";
    await AIProjectReferenceStore.save(graph, snapshot);

    expect(invoke).toHaveBeenNthCalledWith(1, "save_project_reference_snapshot", {
      projectUri: "file:///projects/draft.prg",
      references: snapshot,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "save_project_reference_snapshot", {
      projectUri: "file:///projects/saved-as.prg",
      references: snapshot,
    });
  });
});
