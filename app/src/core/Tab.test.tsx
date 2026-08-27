// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./service/Settings", () => ({ Settings: { maxFps: 60, maxFpsUnfocused: 60 } }));
vi.mock("./service/Telemetry", () => ({ Telemetry: { event: vi.fn() } }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: { buttons: vi.fn() } }));

import { Tab } from "./Tab";

class TestTab extends Tab {
  getComponent(): React.ComponentType {
    return () => null;
  }
}

describe("Tab cleanup", () => {
  it("releases every acquired service and listener before surfacing cleanup failures", async () => {
    const disposed = vi.fn();
    const tab = new TestTab({});
    const listener = vi.fn();
    tab.on("test-event", listener);
    tab.loadService(
      class SyncFailure {
        static id = "syncFailure";
        dispose() {
          throw new Error("sync cleanup failed");
        }
      },
    );
    tab.loadService(
      class AsyncFailure {
        static id = "asyncFailure";
        async dispose() {
          throw new Error("async cleanup failed");
        }
      },
    );
    tab.loadService(
      class SuccessfulCleanup {
        static id = "successfulCleanup";
        dispose() {
          disposed();
        }
      },
    );

    await expect(tab.dispose()).rejects.toMatchObject({
      name: "AggregateError",
      errors: [
        expect.objectContaining({ message: "sync cleanup failed" }),
        expect.objectContaining({ message: "async cleanup failed" }),
      ],
    });

    expect(disposed).toHaveBeenCalledOnce();
    expect(tab.getService("syncFailure" as never)).toBeUndefined();
    expect(tab.emit("test-event")).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });
});
