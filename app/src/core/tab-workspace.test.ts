// @vitest-environment jsdom

import {
  activeDockedTabAtom,
  activeGroupIdAtom,
  activeResourceTabAtom,
  activeTabAtom,
  store,
  tabGroupRootAtom,
  tabsAtom,
} from "@/state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { URI } from "vscode-uri";

vi.mock("./service/settings", () => ({ Settings: { maxFps: 60, maxFpsUnfocused: 60 } }));
vi.mock("./service/telemetry", () => ({ Telemetry: { event: vi.fn() } }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: { buttons: vi.fn() } }));

import { Tab } from "./tab";
import { createTabGroup, findTabGroupByTabId, FIXED_SIDE_GROUP_IDS } from "./tab-group";
import { TabWorkspace } from "./tab-workspace";

class TestTab extends Tab {
  getComponent() {
    return () => null;
  }
}

function openTestTab() {
  const tab = new TestTab({});
  const group = createTabGroup([tab.id], "test-group");
  store.set(tabsAtom, [tab]);
  store.set(activeTabAtom, tab);
  store.set(activeDockedTabAtom, tab);
  store.set(tabGroupRootAtom, group);
  store.set(activeGroupIdAtom, group.id);
  return tab;
}

describe("TabWorkspace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.set(tabsAtom, []);
    store.set(activeTabAtom, undefined);
    store.set(activeDockedTabAtom, undefined);
    store.set(activeResourceTabAtom, undefined);
    store.set(tabGroupRootAtom, null);
    store.set(activeGroupIdAtom, undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it.each(["horizontal", "vertical"] as const)(
    "accepts drops after compact tabs without changing edge splits in a %s layout",
    (direction) => {
      for (let i = 0; i < 2; i++) {
        const left = direction === "horizontal" ? i * 600 : 0;
        const top = direction === "vertical" ? i * 400 : 0;
        const group = document.createElement("section");
        group.dataset.pgTabGroupId = `group-${i}`;
        group.innerHTML = `
          <div data-pg-tab-bar-drop-zone>
            <div data-pg-tab-bar><button data-pg-docked-tab-id="tab-${i}">Tab</button></div>
          </div>
        `;
        document.body.append(group);
        vi.spyOn(group, "getBoundingClientRect").mockReturnValue(new DOMRect(left, top, 600, 400));
        vi.spyOn(group.querySelector("[data-pg-tab-bar-drop-zone]")!, "getBoundingClientRect").mockReturnValue(
          new DOMRect(left + 20, top + 24, 560, 32),
        );
        vi.spyOn(group.querySelector("[data-pg-tab-bar]")!, "getBoundingClientRect").mockReturnValue(
          new DOMRect(left + 20, top + 24, 160, 32),
        );
        vi.spyOn(group.querySelector("button")!, "getBoundingClientRect").mockReturnValue(
          new DOMRect(left + 32, top + 28, 136, 24),
        );
      }

      for (let i = 0; i < 2; i++) {
        const left = direction === "horizontal" ? i * 600 : 0;
        const top = direction === "vertical" ? i * 400 : 0;
        const groupId = `group-${i}`;
        expect(TabWorkspace.getDropTarget(left + 50, top + 40)).toEqual({ groupId, index: 0 });
        expect(TabWorkspace.getDropTarget(left + 400, top + 40)).toEqual({ groupId, index: 1 });
        expect(TabWorkspace.getDropTarget(left + 400, top + 40, true)).toEqual({ groupId, index: 1 });
        expect(TabWorkspace.getDropTarget(left + 300, top + 80)).toEqual({ groupId, edge: "top" });
        expect(TabWorkspace.getDropTarget(left + 300, top + 80, true)).toBeNull();
        expect(TabWorkspace.getDropTarget(left + 10, top + 200)).toEqual({ groupId, edge: "left" });
        expect(TabWorkspace.getDropTarget(left + 590, top + 200)).toEqual({ groupId, edge: "right" });
        expect(TabWorkspace.getDropTarget(left + 300, top + 390)).toEqual({ groupId, edge: "bottom" });
      }
    },
  );

  it.each(["left", "right", "top", "bottom"] as const)(
    "keeps the selected file when opening a %s panel",
    (splitEdge) => {
      const first = TabWorkspace.open(Object.assign(new TestTab({}), { uri: URI.file("/first.prg") }));
      const second = TabWorkspace.open(Object.assign(new TestTab({}), { uri: URI.file("/second.prg") }));
      TabWorkspace.focus(first.id);

      const panel = TabWorkspace.create({ layout: "docked", splitEdge });
      const root = store.get(tabGroupRootAtom);

      expect(findTabGroupByTabId(root, first.id)).toMatchObject({
        tabIds: [first.id, second.id],
        activeTabId: first.id,
      });
      expect(findTabGroupByTabId(root, panel.id)?.activeTabId).toBe(panel.id);
      expect(store.get(activeTabAtom)).toBe(panel);
      expect(store.get(activeResourceTabAtom)).toBe(first);
    },
  );

  it.each(["left", "right"] as const)("keeps the selected file when reusing the %s panel group", (splitEdge) => {
    const first = TabWorkspace.open(Object.assign(new TestTab({}), { uri: URI.file("/first.prg") }));
    const second = TabWorkspace.open(Object.assign(new TestTab({}), { uri: URI.file("/second.prg") }));
    const existingPanel = TabWorkspace.create({ layout: "docked", splitEdge });
    TabWorkspace.focus(first.id);

    const panel = TabWorkspace.create({ layout: "docked", splitEdge });
    const root = store.get(tabGroupRootAtom);

    expect(findTabGroupByTabId(root, first.id)).toMatchObject({
      tabIds: [first.id, second.id],
      activeTabId: first.id,
    });
    expect(findTabGroupByTabId(root, panel.id)).toMatchObject({
      id: FIXED_SIDE_GROUP_IDS[splitEdge],
      tabIds: [existingPanel.id, panel.id],
      activeTabId: panel.id,
    });
    expect(store.get(activeTabAtom)).toBe(panel);
    expect(store.get(activeResourceTabAtom)).toBe(first);
  });

  it("waits for disposal after removing the closing tab", async () => {
    const tab = openTestTab();
    let finishDisposal!: () => void;
    const dispose = vi.spyOn(tab, "dispose").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishDisposal = resolve;
        }),
    );
    let closed = false;

    const closePromise = TabWorkspace.close(tab.id).then(() => {
      closed = true;
    });
    await Promise.resolve();

    expect(closed).toBe(false);
    await vi.advanceTimersByTimeAsync(449);
    expect(dispose).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(dispose).toHaveBeenCalledOnce();
    expect(store.get(tabsAtom)).toContain(tab);

    await vi.advanceTimersByTimeAsync(50);
    expect(store.get(tabsAtom)).not.toContain(tab);
    expect(closed).toBe(false);

    finishDisposal();
    await closePromise;
    expect(closed).toBe(true);
  });

  it("waits for tab removal when disposal finishes first", async () => {
    const tab = openTestTab();
    const dispose = vi.spyOn(tab, "dispose").mockResolvedValue();
    let closed = false;

    const closePromise = TabWorkspace.close(tab.id).then(() => {
      closed = true;
    });
    await vi.advanceTimersByTimeAsync(450);

    expect(dispose).toHaveBeenCalledOnce();
    expect(closed).toBe(false);
    expect(store.get(tabsAtom)).toContain(tab);

    await vi.advanceTimersByTimeAsync(50);
    await closePromise;
    expect(closed).toBe(true);
    expect(store.get(tabsAtom)).not.toContain(tab);
  });

  it("returns the in-flight close task when the tab is already closing", async () => {
    const tab = openTestTab();
    let finishDisposal!: () => void;
    vi.spyOn(tab, "dispose").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishDisposal = resolve;
        }),
    );
    let duplicateClosed = false;

    const firstClose = TabWorkspace.close(tab.id);
    const duplicateClose = TabWorkspace.close(tab.id).then(() => {
      duplicateClosed = true;
    });
    await vi.advanceTimersByTimeAsync(500);

    expect(duplicateClosed).toBe(false);
    finishDisposal();
    await Promise.all([firstClose, duplicateClose]);
    expect(duplicateClosed).toBe(true);
  });

  it("removes the tab before reporting a disposal failure", async () => {
    const tab = openTestTab();
    const cleanupError = new Error("cleanup failed");
    vi.spyOn(tab, "dispose").mockRejectedValue(cleanupError);

    const closeResult = TabWorkspace.close(tab.id).then(
      () => undefined,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(500);

    await expect(closeResult).resolves.toBe(cleanupError);
    expect(store.get(tabsAtom)).not.toContain(tab);
  });
});
