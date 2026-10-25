import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  config: [] as any[],
  project: undefined as unknown,
  bindings: new Map<string, any>(),
  installed: [] as any[],
  cleanup: undefined as (() => void) | undefined,
  listener: undefined as ((id: string) => void) | undefined,
  errors: vi.fn(),
  setMenu: vi.fn(),
  openFile: vi.fn(),
}));
vi.mock("@/platform/desktop", () => ({
  Native: { setMenu: state.setMenu },
  events: {
    menuCommand: {
      on: (listener: (id: string) => void) => {
        state.listener = listener;
        return vi.fn();
      },
    },
  },
}));
vi.mock("@/core/service/GlobalMenu", () => ({ onOpenFile: state.openFile }));
vi.mock("@/core/service/dataFileService/RecentFileManager", () => ({
  RecentFileManager: { getRecentFiles: async () => [{ uri: { toString: () => "/test/recent.prg" }, time: 1 }] },
}));
vi.mock("@/utils/pathString", () => ({ PathString: { absolute2file: (path: string) => path.split("/").at(-1) } }));
vi.mock("@/core/Project", () => ({ Project: class {} }));
vi.mock("@/core/service/Settings", () => ({ Settings: { use: () => [state.config] } }));
vi.mock("@/core/service/controlService/shortcutKeysEngine/KeyBindsUI", () => ({
  KeyBindsUI: { getUIKeyBind: (id: string) => state.bindings.get(id) },
}));
vi.mock("@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister", () => ({ allKeyBinds: [] }));
vi.mock("@/state", () => ({ activeResourceTabAtom: {}, store: { get: () => state.project } }));
vi.mock("jotai", () => ({ useAtomValue: () => state.project }));
vi.mock("react", () => ({
  useEffect: (effect: () => () => void) => {
    state.cleanup = effect();
  },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { resolvedLanguage: "en" } }),
}));

import NativeMacosMenu from "./native-macos-menu";
import { Project } from "@/core/Project";

beforeEach(() => {
  state.cleanup?.();
  vi.clearAllMocks();
  state.project = undefined;
  state.bindings.clear();
  state.config = [
    { type: "topMenu", id: "settings", children: [{ type: "item", id: "openSettings" }] },
    { type: "topMenu", id: "ai", children: [{ type: "item", id: "openAI" }] },
    { type: "topMenu", id: "file", children: [{ type: "recentFiles", id: "recent" }] },
    { type: "topMenu", id: "hidden", visible: false },
  ];
  state.bindings.set("openSettings", { onPress: vi.fn() });
  state.setMenu.mockImplementation(async (entries) => {
    state.installed = entries;
  });
  vi.stubGlobal("window", { dispatchEvent: state.errors });
  vi.stubGlobal(
    "ErrorEvent",
    class {
      constructor(
        public type: string,
        public options: unknown,
      ) {}
    },
  );
});

describe("MyGo native menu", () => {
  it("installs configured menus, excludes hidden entries and opens recent files", async () => {
    const ready = vi.fn();
    NativeMacosMenu({ onReady: ready });
    await vi.waitFor(() => expect(ready).toHaveBeenCalledWith(true));
    expect(state.installed.map((entry) => entry.id)).toEqual(["settings", "ai", "file"]);
    expect(state.installed[0].children[0].disabled).toBe(false);
    const recent = state.installed[2].children[0];
    expect(recent.label).toBe("recent.prg");
    state.listener?.(recent.id);
    await vi.waitFor(() => expect(state.openFile).toHaveBeenCalledOnce());
    state.listener?.("openSettings");
    await vi.waitFor(() => expect(state.bindings.get("openSettings").onPress).toHaveBeenCalledOnce());
  });

  it("rechecks the current project and command condition at click time", async () => {
    const run = vi.fn();
    const when = vi.fn(() => true);
    state.bindings.set("openAI", { onPress: run, when });
    const ready = vi.fn();
    NativeMacosMenu({ onReady: ready });
    await vi.waitFor(() => expect(ready).toHaveBeenCalledWith(true));
    state.project = Object.create(Project.prototype);
    state.listener?.("openAI");
    await vi.waitFor(() => expect(run).toHaveBeenCalledWith(state.project));
    when.mockReturnValue(false);
    state.listener?.("openAI");
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("keeps in-window menus available and reports native errors", async () => {
    state.setMenu.mockRejectedValueOnce(new Error("menu unavailable"));
    const ready = vi.fn();
    NativeMacosMenu({ onReady: ready });
    await vi.waitFor(() => expect(ready).toHaveBeenCalledWith(false));
    expect(state.errors).toHaveBeenCalledOnce();
  });
});
