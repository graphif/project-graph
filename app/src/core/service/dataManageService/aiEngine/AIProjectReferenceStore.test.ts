import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
import { AIProjectReferenceStore } from "./AIProjectReferenceStore";

const snapshot = {
  entries: [{ ref: "n1" as const, uuid: "11111111-1111-4111-8111-111111111111" }],
  nextNodeRef: 2,
  nextEdgeRef: 1,
};

describe("AI Project Reference Store", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("loads a Project snapshot through the cross-process Tauri store command", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(snapshot);

    await expect(AIProjectReferenceStore.load("file:///projects/graph.prg")).resolves.toEqual(snapshot);
    expect(invoke).toHaveBeenCalledWith("load_project_reference_snapshot", {
      projectUri: "file:///projects/graph.prg",
    });
  });

  it("keeps renderer writes ordered while delegating atomic updates to Tauri", async () => {
    let releaseFirst: (() => void) | undefined;
    vi.mocked(invoke)
      .mockReturnValueOnce(new Promise<void>((resolve) => (releaseFirst = resolve)))
      .mockResolvedValueOnce(undefined);

    const first = AIProjectReferenceStore.save("file:///projects/first.prg", snapshot);
    const second = AIProjectReferenceStore.save("file:///projects/second.prg", snapshot);

    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    releaseFirst?.();
    await Promise.all([first, second]);

    expect(invoke).toHaveBeenNthCalledWith(1, "save_project_reference_snapshot", {
      projectUri: "file:///projects/first.prg",
      references: snapshot,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "save_project_reference_snapshot", {
      projectUri: "file:///projects/second.prg",
      references: snapshot,
    });
  });

  it("rejects corrupt snapshots returned by Tauri", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ entries: [], nextNodeRef: 0, nextEdgeRef: 1 });

    await expect(AIProjectReferenceStore.load("file:///projects/graph.prg")).rejects.toThrow(
      "保存的 AI 项目引用格式无效",
    );
  });
});
