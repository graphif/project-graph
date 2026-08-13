import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({
  unwatch: vi.fn(),
  watch: vi.fn(),
}));

vi.mock("@/core/Project", () => ({
  Project: class Project {},
  ProjectState: { Saved: "saved", Unsaved: "unsaved" },
  service: (id: string) => (target: { id?: string }) => {
    target.id = id;
    return target;
  },
}));
vi.mock("@/core/service/Settings", () => ({
  Settings: {
    historyManagerMode: "memoryEfficient",
    historySize: 100,
    showDebug: false,
    watch: settings.watch,
  },
}));
vi.mock("@graphif/serializer", () => ({ serialize: () => [], deserialize: () => [] }));

import { HistoryManager } from "./StageHistoryManager";

describe("HistoryManager cleanup", () => {
  beforeEach(() => {
    settings.unwatch.mockReset();
    settings.watch.mockReset().mockImplementation((_key, callback) => {
      callback("memoryEfficient");
      return settings.unwatch;
    });
  });

  it("unsubscribes from Settings when the acquired service is disposed", () => {
    const manager = new HistoryManager({ stage: [], emit: vi.fn(), projectState: "saved" } as never);
    const dispose = (manager as unknown as { dispose?: () => void }).dispose;

    expect(dispose).toBeTypeOf("function");
    dispose?.call(manager);
    expect(settings.unwatch).toHaveBeenCalledOnce();
  });
});
