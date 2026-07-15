import {
  activeDockedTabAtom,
  activeGroupIdAtom,
  activeResourceTabAtom,
  activeTabAtom,
  store,
  tabDropTargetAtom,
  tabGroupRootAtom,
  tabsAtom,
  type TabDropTarget,
} from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { startTransition } from "react";
import { ComponentTab, ComponentTabOptions, isResourceTab, Tab } from "./Tab";
import {
  createTabGroup,
  findTabGroup,
  findTabGroupByTabId,
  getTabGroups,
  insertTabIntoGroup,
  removeTabFromGroups,
  splitTabGroup,
  updateTabGroup,
  updateTabSplitSizes,
  type TabDropEdge,
} from "./TabGroup";

const outsideListeners = new Map<string, (event: PointerEvent) => void>();
const closeTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

function maxZIndex() {
  return store.get(tabsAtom).reduce((maximum, tab) => Math.max(maximum, tab.zIndex), 0);
}

function constrainRect(rect: Rectangle) {
  const result = rect.clone();
  if (result.width >= 0 && result.left + result.width > innerWidth) {
    result.location.x = Math.max(0, innerWidth - result.width);
  }
  if (result.height >= 0 && result.top + result.height > innerHeight) {
    result.location.y = Math.max(0, innerHeight - result.height);
  }
  result.location.x = Math.max(0, result.location.x);
  result.location.y = Math.max(0, result.location.y);
  return result;
}

function firstAvailableDockedTab() {
  const tabs = store.get(tabsAtom);
  for (const group of getTabGroups(store.get(tabGroupRootAtom))) {
    const tab =
      tabs.find((candidate) => candidate.id === group.activeTabId) ??
      tabs.find((candidate) => group.tabIds.includes(candidate.id));
    if (tab) return tab;
  }
}

function removeFromGroup(tabId: string) {
  const result = removeTabFromGroups(store.get(tabGroupRootAtom), tabId);
  store.set(tabGroupRootAtom, result.root);
  const groups = getTabGroups(result.root);
  if (!groups.some((group) => group.id === store.get(activeGroupIdAtom))) {
    store.set(activeGroupIdAtom, groups[0]?.id);
  }
  return result;
}

export namespace TabWorkspace {
  export function synchronizeGroups() {
    const dockedTabs = store.get(tabsAtom).filter((tab) => tab.layout === "docked" && !tab.closing);
    let root = store.get(tabGroupRootAtom);
    const knownIds = new Set(getTabGroups(root).flatMap((group) => group.tabIds));
    const missing = dockedTabs.filter((tab) => !knownIds.has(tab.id));
    if (missing.length === 0) return;
    const target = findTabGroup(root, store.get(activeGroupIdAtom) ?? "") ?? getTabGroups(root)[0];
    if (!target) {
      const group = createTabGroup(missing.map((tab) => tab.id));
      store.set(tabGroupRootAtom, group);
      store.set(activeGroupIdAtom, group.id);
      return;
    }
    for (const tab of missing) root = insertTabIntoGroup(root, target.id, tab.id);
    store.set(tabGroupRootAtom, root);
  }

  export function open<T extends Tab>(tab: T): T {
    tab.floatingRect = constrainRect(tab.floatingRect);
    tab.zIndex = maxZIndex() + 1;
    store.set(tabsAtom, [...store.get(tabsAtom), tab]);
    if (tab.layout === "docked") {
      const root = store.get(tabGroupRootAtom);
      const target = findTabGroup(root, store.get(activeGroupIdAtom) ?? "") ?? getTabGroups(root)[0];
      if (target) {
        store.set(tabGroupRootAtom, insertTabIntoGroup(root, target.id, tab.id));
      } else {
        const group = createTabGroup([tab.id]);
        store.set(tabGroupRootAtom, group);
        store.set(activeGroupIdAtom, group.id);
      }
    }
    focus(tab.id);

    if (tab.closeWhenClickOutside) {
      const listener = (event: PointerEvent) => {
        if (event.target instanceof HTMLElement && event.target.closest(`[data-pg-tab-id="${tab.id}"]`)) return;
        void close(tab.id);
      };
      outsideListeners.set(tab.id, listener);
      queueMicrotask(() => document.addEventListener("pointerdown", listener));
    }
    return tab;
  }

  export function create(options: ComponentTabOptions): ComponentTab {
    return open(
      new ComponentTab({
        ...options,
        contextResourceTab:
          options.contextResourceTab ??
          (options.contextTarget === "activeResourceTab" ? store.get(activeResourceTabAtom) : undefined),
      }),
    );
  }

  export function get(id: string) {
    return store.get(tabsAtom).find((tab) => tab.id === id);
  }

  export function update(id: string, options: Partial<Omit<ComponentTabOptions, "rect">> & { rect?: Rectangle }) {
    const tab = get(id);
    if (!tab) return;
    if (options.children !== undefined && tab instanceof ComponentTab) tab.children = options.children;
    if (options.layout !== undefined) tab.layout = options.layout;
    if (options.rect !== undefined) tab.floatingRect = constrainRect(options.rect);
    if (options.canDock !== undefined) tab.canDock = options.canDock;
    if (options.closable !== undefined) tab.closable = options.closable;
    if (options.closeOnEscape !== undefined) tab.closeOnEscape = options.closeOnEscape;
    if (options.closeWhenClickInside !== undefined) tab.closeWhenClickInside = options.closeWhenClickInside;
    if (options.titleBarOverlay !== undefined) tab.titleBarOverlay = options.titleBarOverlay;
    store.set(tabsAtom, [...store.get(tabsAtom)]);
  }

  export function focus(id: string) {
    const tab = get(id);
    if (!tab) return;
    tab.zIndex = maxZIndex() + 1;
    store.set(activeTabAtom, tab);
    if (tab.layout === "docked") {
      const group = findTabGroupByTabId(store.get(tabGroupRootAtom), id);
      if (group) {
        store.set(
          tabGroupRootAtom,
          updateTabGroup(store.get(tabGroupRootAtom), group.id, (candidate) => ({
            ...candidate,
            activeTabId: id,
          })),
        );
        store.set(activeGroupIdAtom, group.id);
      }
      store.set(activeDockedTabAtom, tab);
    }
    if (isResourceTab(tab)) store.set(activeResourceTabAtom, tab);
    store.set(tabsAtom, [...store.get(tabsAtom)]);
  }

  export function dock(id: string, index?: number, groupId?: string) {
    const tab = get(id);
    if (!tab?.canDock) return false;
    removeFromGroup(id);
    tab.layout = "docked";
    let root = store.get(tabGroupRootAtom);
    const target = findTabGroup(root, groupId ?? store.get(activeGroupIdAtom) ?? "") ?? getTabGroups(root)[0];
    if (target) {
      root = insertTabIntoGroup(root, target.id, id, index);
    } else {
      const group = createTabGroup([id]);
      root = group;
      store.set(activeGroupIdAtom, group.id);
    }
    store.set(tabGroupRootAtom, root);
    store.set(tabsAtom, [...store.get(tabsAtom)]);
    focus(id);
    return true;
  }

  export function moveTab(id: string, target: TabDropTarget) {
    const tab = get(id);
    if (!tab?.canDock) return false;
    const originalRoot = store.get(tabGroupRootAtom);
    const source = findTabGroupByTabId(originalRoot, id);
    const targetGroup = findTabGroup(originalRoot, target.groupId);
    if (!targetGroup) return false;
    if (target.edge && source?.id === targetGroup.id && source.tabIds.length === 1) return false;

    const adjustedIndex =
      !target.edge && source?.id === target.groupId && target.index !== undefined
        ? target.index - (source.tabIds.indexOf(id) < target.index ? 1 : 0)
        : target.index;
    removeFromGroup(id);
    tab.layout = "docked";
    let root = store.get(tabGroupRootAtom);
    if (target.edge) {
      if (!findTabGroup(root, target.groupId)) {
        store.set(tabGroupRootAtom, originalRoot);
        return false;
      }
      const group = createTabGroup([id]);
      root = splitTabGroup(root, target.groupId, group, target.edge);
      store.set(activeGroupIdAtom, group.id);
    } else {
      root = insertTabIntoGroup(root, target.groupId, id, adjustedIndex);
    }
    store.set(tabGroupRootAtom, root);
    store.set(tabsAtom, [...store.get(tabsAtom)]);
    focus(id);
    return true;
  }

  export function split(id: string, edge: TabDropEdge) {
    const group = findTabGroupByTabId(store.get(tabGroupRootAtom), id);
    if (!group) return false;
    return moveTab(id, { groupId: group.id, edge });
  }

  export function resizeSplit(id: string, sizes: [number, number]) {
    store.set(tabGroupRootAtom, updateTabSplitSizes(store.get(tabGroupRootAtom), id, sizes));
  }

  export function float(id: string, location?: Vector) {
    const tab = get(id);
    if (!tab) return;
    const wasDocked = tab.layout === "docked";
    if (wasDocked) removeFromGroup(id);
    tab.layout = "floating";
    if (location) {
      tab.floatingRect = constrainRect(new Rectangle(location, tab.floatingRect.size));
    }
    store.set(tabsAtom, [...store.get(tabsAtom)]);
    focus(id);
    if (wasDocked && !store.get(activeDockedTabAtom)) {
      const next = firstAvailableDockedTab();
      if (next) focus(next.id);
      focus(id);
    }
  }

  export async function close(id: string) {
    const tab = get(id);
    if (!tab || tab.closing) return;
    const listener = outsideListeners.get(id);
    if (listener) {
      document.removeEventListener("pointerdown", listener);
      outsideListeners.delete(id);
    }
    tab.closing = true;
    if (tab.layout === "docked") {
      const result = removeFromGroup(id);
      if (store.get(activeTabAtom) === tab) {
        const next = (result.nextActiveTabId && get(result.nextActiveTabId)) ?? firstAvailableDockedTab();
        if (next) focus(next.id);
      }
    }
    store.set(tabsAtom, [...store.get(tabsAtom)]);

    const disposeTimer = setTimeout(() => void tab.dispose(), 450);
    const removeTimer = setTimeout(() => {
      startTransition(() => {
        const remaining = store.get(tabsAtom).filter((candidate) => candidate !== tab);
        store.set(tabsAtom, remaining);
        if (store.get(activeTabAtom) === tab) {
          const next = remaining.reduce<Tab | undefined>(
            (highest, candidate) => (!highest || candidate.zIndex > highest.zIndex ? candidate : highest),
            undefined,
          );
          store.set(activeTabAtom, next);
          if (next && isResourceTab(next)) store.set(activeResourceTabAtom, next);
        }
        const docked = firstAvailableDockedTab();
        if (docked) store.set(activeDockedTabAtom, docked);
      });
      closeTimers.delete(id);
    }, 500);
    closeTimers.set(id, [disposeTimer, removeTimer]);
  }

  export function closeAllFloating() {
    for (const tab of store.get(tabsAtom)) {
      if (tab.layout === "floating" && tab.closeOnEscape) void close(tab.id);
    }
  }

  export function hasOpenFloatingTabs() {
    return store.get(tabsAtom).some((tab) => tab.layout === "floating" && !tab.closing);
  }

  export function getDropTarget(clientX: number, clientY: number, tabBarOnly = false): TabDropTarget | null {
    const containsPoint = (rect: DOMRect) =>
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    const container = Array.from(document.querySelectorAll<HTMLElement>("[data-pg-tab-group-id]"))
      .filter((candidate) => containsPoint(candidate.getBoundingClientRect()))
      .sort((first, second) => {
        const firstRect = first.getBoundingClientRect();
        const secondRect = second.getBoundingClientRect();
        return firstRect.width * firstRect.height - secondRect.width * secondRect.height;
      })[0];
    if (!container) return null;
    const groupId = container.dataset.pgTabGroupId;
    if (!groupId) return null;
    const rect = container.getBoundingClientRect();
    const tabBar = container.querySelector<HTMLElement>("[data-pg-tab-bar]");
    const overTabBar = tabBar ? containsPoint(tabBar.getBoundingClientRect()) : false;
    if (tabBarOnly && !overTabBar) return null;
    const edgeWidth = Math.min(rect.width * 0.25, 100);
    const edgeHeight = Math.min(rect.height * 0.25, 100);
    let edge: TabDropEdge | undefined;
    if (!overTabBar) {
      if (clientX < rect.left + edgeWidth) edge = "left";
      else if (clientX > rect.right - edgeWidth) edge = "right";
      else if (clientY < rect.top + edgeHeight) edge = "top";
      else if (clientY > rect.bottom - edgeHeight) edge = "bottom";
    }
    if (edge) return { groupId, edge };

    const tabs = Array.from(tabBar?.querySelectorAll<HTMLElement>("[data-pg-docked-tab-id]") ?? []);
    const index = tabs.findIndex((candidate) => {
      const tabRect = candidate.getBoundingClientRect();
      return clientX < tabRect.left + tabRect.width / 2;
    });
    return { groupId, index: index === -1 ? tabs.length : index };
  }

  export function previewDrop(clientX: number, clientY: number, tabBarOnly = false) {
    const target = getDropTarget(clientX, clientY, tabBarOnly);
    store.set(tabDropTargetAtom, target);
    return target;
  }

  export function clearDropPreview() {
    store.set(tabDropTargetAtom, null);
  }
}
