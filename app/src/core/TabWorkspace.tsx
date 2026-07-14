import { activeDockedTabAtom, activeResourceTabAtom, activeTabAtom, store, tabsAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { startTransition } from "react";
import { ComponentTab, ComponentTabOptions, isResourceTab, Tab } from "./Tab";

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

export namespace TabWorkspace {
  export function open<T extends Tab>(tab: T): T {
    tab.floatingRect = constrainRect(tab.floatingRect);
    tab.zIndex = maxZIndex() + 1;
    store.set(tabsAtom, [...store.get(tabsAtom), tab]);
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
    return open(new ComponentTab(options));
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
    if (tab.layout === "docked") store.set(activeDockedTabAtom, tab);
    if (isResourceTab(tab)) store.set(activeResourceTabAtom, tab);
    store.set(tabsAtom, [...store.get(tabsAtom)]);
  }

  export function dock(id: string, index?: number) {
    const tab = get(id);
    if (!tab?.canDock) return false;
    tab.layout = "docked";
    const tabs = store.get(tabsAtom).filter((candidate) => candidate !== tab);
    const targetIndex = index ?? tabs.length;
    tabs.splice(targetIndex, 0, tab);
    store.set(tabsAtom, tabs);
    focus(id);
    return true;
  }

  export function float(id: string, location?: Vector) {
    const tab = get(id);
    if (!tab) return;
    tab.layout = "floating";
    if (location) {
      tab.floatingRect = constrainRect(new Rectangle(location, tab.floatingRect.size));
    }
    store.set(tabsAtom, [...store.get(tabsAtom)]);
    focus(id);
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
}
