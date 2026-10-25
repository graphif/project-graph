// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./service/Settings", () => ({ Settings: { maxFps: 60, maxFpsUnfocused: 60 } }));
vi.mock("./service/Telemetry", () => ({ Telemetry: { event: vi.fn() } }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: { buttons: vi.fn() } }));

import { Tab } from "./Tab";
import { Settings } from "./service/Settings";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

class TestTab extends Tab {
  getComponent(): React.ComponentType {
    return () => null;
  }
}

describe("Tab cleanup", () => {
  it("keeps the requested 120fps cadence on a 144Hz display", () => {
    Settings.maxFps = 120;
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    let frame: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    const tick = vi.fn();
    const tab = new TestTab({});
    tab.loadService(
      class {
        static id = "counter";
        tick = tick;
      },
    );
    tab.loop();
    for (let i = 0; i < 144; i++) frame!((i * 1000) / 144);
    expect(tick).toHaveBeenCalledTimes(120);
  });

  it("drops a long pause without catch-up bursts and responds immediately to focus", () => {
    Settings.maxFps = 120;
    Settings.maxFpsUnfocused = 30;
    const focus = vi.spyOn(document, "hasFocus").mockReturnValue(true);
    let frame: FrameRequestCallback;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    const tick = vi.fn();
    const tab = new TestTab({});
    tab.loadService(
      class {
        static id = "counter";
        tick = tick;
      },
    );
    tab.loop();
    frame!(0);
    frame!(10000);
    frame!(10001);
    expect(tick).toHaveBeenCalledTimes(2);
    focus.mockReturnValue(false);
    frame!(10002);
    frame!(10010);
    expect(tick).toHaveBeenCalledTimes(3);
    focus.mockReturnValue(true);
    frame!(10011);
    expect(tick).toHaveBeenCalledTimes(4);
  });

  it("does not schedule another frame when a service pauses its tab", () => {
    let frame: FrameRequestCallback;
    const raf = vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const tab = new TestTab({});
    tab.loadService(
      class {
        static id = "pauseService";
        tick() {
          tab.pause();
        }
      },
    );
    tab.loop();
    frame!(0);
    expect(raf).toHaveBeenCalledOnce();
  });

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
