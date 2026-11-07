import { Settings } from "@/core/service/Settings";
import {
  DEFAULT_SUB_WINDOW_OPEN_MODES,
  type SubWindowId,
  type SubWindowOpenMode,
  type SubWindowOpenModes,
} from "@/core/subWindowOpenModes";
import { ComponentTab, ComponentTabOptions } from "@/core/Tab";
import { TabWorkspace } from "@/core/TabWorkspace";

export {
  DEFAULT_SUB_WINDOW_OPEN_MODES,
  SUB_WINDOW_IDS,
  SUB_WINDOW_OPEN_MODES,
  subWindowOpenModeSchema,
  subWindowOpenModesSchema,
  type SubWindowId,
  type SubWindowOpenMode,
  type SubWindowOpenModes,
} from "@/core/subWindowOpenModes";

export function getSubWindowOpenMode(windowId: SubWindowId): SubWindowOpenMode {
  const modes = Settings.subWindowOpenModes as Partial<SubWindowOpenModes> | undefined;
  return modes?.[windowId] ?? DEFAULT_SUB_WINDOW_OPEN_MODES[windowId];
}

export function resolveSubWindowOpenOptions(windowId: SubWindowId): Pick<ComponentTabOptions, "layout" | "splitEdge"> {
  const mode = getSubWindowOpenMode(windowId);
  switch (mode) {
    case "docked":
      return { layout: "docked" };
    case "dockedLeft":
      return { layout: "docked", splitEdge: "left" };
    case "dockedRight":
      return { layout: "docked", splitEdge: "right" };
    case "floating":
    default:
      return { layout: "floating" };
  }
}

/**
 * Create a component tab using the user's configured open mode for this window.
 * Docked modes force canDock and disable outside/inside auto-close.
 */
export function createSubWindow(windowId: SubWindowId, options: ComponentTabOptions): ComponentTab {
  const openOptions = resolveSubWindowOpenOptions(windowId);
  const docked = openOptions.layout === "docked";
  return TabWorkspace.create({
    ...options,
    ...openOptions,
    canDock: docked ? true : options.canDock,
    closeWhenClickOutside: docked ? false : options.closeWhenClickOutside,
    closeWhenClickInside: docked ? false : options.closeWhenClickInside,
  });
}

export function setSubWindowOpenMode(windowId: SubWindowId, mode: SubWindowOpenMode) {
  Settings.subWindowOpenModes = {
    ...DEFAULT_SUB_WINDOW_OPEN_MODES,
    ...(Settings.subWindowOpenModes as SubWindowOpenModes),
    [windowId]: mode,
  };
}

export function resetSubWindowOpenModes() {
  Settings.subWindowOpenModes = { ...DEFAULT_SUB_WINDOW_OPEN_MODES };
}

export function resetSubWindowOpenMode(windowId: SubWindowId) {
  setSubWindowOpenMode(windowId, DEFAULT_SUB_WINDOW_OPEN_MODES[windowId]);
}

export function getAllSubWindowOpenModes(): SubWindowOpenModes {
  return {
    ...DEFAULT_SUB_WINDOW_OPEN_MODES,
    ...(Settings.subWindowOpenModes as Partial<SubWindowOpenModes>),
  };
}
