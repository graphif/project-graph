// @vitest-environment jsdom

import { createTabGroup, splitTabGroup } from "@/core/TabGroup";
import { store, tabGroupRootAtom } from "@/state";
import { Provider } from "jotai";
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/core/Project", () => ({ Project: class {}, ProjectState: {} }));
vi.mock("@/core/Tab", () => ({ isResourceTab: () => false }));
vi.mock("@/core/TabWorkspace", () => ({ TabWorkspace: {} }));
vi.mock("@/utils/platform", () => ({ isMac: false }));
vi.mock("@/ProjectTabs", () => ({
  ProjectTabs: () => (
    <div data-pg-tab-bar>
      <button data-pg-docked-tab-id="test-tab">Tab</button>
    </div>
  ),
}));

import DockedArea from "./docked-area";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let space: DOMRect;
let groupRects: Record<string, DOMRect>;
let updateLayout: () => void;
const disconnect = vi.fn();
const onTitleBarMouseDown = vi.fn();

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  space = new DOMRect(120, 8, 760, 40);
  groupRects = { main: new DOMRect(0, 0, 1000, 56) };
  store.set(tabGroupRootAtom, createTabGroup([], "main"));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        updateLayout = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute("data-pg-titlebar-tab-space")) return space;
    return groupRects[this.closest<HTMLElement>("[data-pg-tab-group-id]")?.dataset.pgTabGroupId ?? "main"];
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await React.act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function render() {
  await React.act(async () =>
    root.render(
      <Provider store={store}>
        <DockedArea
          onTabClick={vi.fn()}
          onTabClose={vi.fn()}
          onTitleBarMouseDown={onTitleBarMouseDown}
          isClassroomMode={false}
        />
        <div data-pg-titlebar-tab-space />
      </Provider>,
    ),
  );
}

it("reserves the menu and controls' actual bounds and updates when the titlebar resizes", async () => {
  await render();
  const bar = container.querySelector<HTMLElement>("[data-pg-window-top-tabs]")!;
  expect([bar.style.paddingLeft, bar.style.paddingRight]).toEqual(["120px", "120px"]);

  space = new DOMRect(150, 12, 670, 60);
  updateLayout();
  expect([bar.style.paddingLeft, bar.style.paddingRight]).toEqual(["150px", "180px"]);
  await React.act(async () => root.unmount());
  expect(disconnect).toHaveBeenCalledOnce();
});

it("only insets top groups and gives narrow splits their own row to keep tabs accessible", async () => {
  const horizontal = splitTabGroup(createTabGroup([], "main"), "main", createTabGroup([], "right"), "right");
  store.set(tabGroupRootAtom, splitTabGroup(horizontal, "right", createTabGroup([], "bottom"), "bottom"));
  groupRects = {
    main: new DOMRect(0, 0, 500, 56),
    right: new DOMRect(500, 0, 500, 56),
    bottom: new DOMRect(500, 400, 500, 32),
  };
  await render();
  const bars = container.querySelectorAll<HTMLElement>("[data-pg-window-top-tabs]");
  expect(bars).toHaveLength(2);
  expect([bars[0].style.paddingLeft, bars[0].style.paddingRight]).toEqual(["120px", "0px"]);
  expect([bars[1].style.paddingLeft, bars[1].style.paddingRight]).toEqual(["0px", "120px"]);

  space = new DOMRect(600, 8, 100, 40);
  updateLayout();
  expect(bars[0].hasAttribute("data-pg-tabs-separate-row")).toBe(true);
  expect([bars[0].style.paddingLeft, bars[0].style.paddingRight]).toEqual(["", ""]);
  expect([bars[1].style.paddingLeft, bars[1].style.paddingRight]).toEqual(["100px", "300px"]);

  space = new DOMRect(120, 8, 760, 40);
  updateLayout();
  expect(bars[0].hasAttribute("data-pg-tabs-separate-row")).toBe(false);
  expect(bars[0].style.paddingLeft).toBe("120px");
});

it("drags the window from titlebar space while leaving tab mouse events alone", async () => {
  await render();
  const bar = container.querySelector<HTMLElement>("[data-pg-window-top-tabs]")!;
  await React.act(async () =>
    bar.querySelector("button")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
  );
  expect(onTitleBarMouseDown).not.toHaveBeenCalled();
  await React.act(async () => bar.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  expect(onTitleBarMouseDown).toHaveBeenCalledOnce();
});
