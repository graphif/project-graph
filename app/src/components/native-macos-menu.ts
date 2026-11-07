import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { allKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import { activeResourceTabAtom, store } from "@/state";
import { Native, events } from "@/platform/desktop";
import type { MenuEntry } from "@/generated/mygo";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { PathString } from "@/utils/pathString";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type ConfigItem = (typeof Settings.globalMenuConfig)[number];
let menuUpdate = Promise.resolve();
export const nativeMacosMenuIds = new Set([
  "file",
  "actions",
  "view",
  "ai",
  "extensions",
  "window",
  "settings",
  "about",
]);
const command = (id: string) => KeyBindsUI.getUIKeyBind(id) ?? allKeyBinds.find((item) => item.id === id);
const currentProject = () => {
  const tab = store.get(activeResourceTabAtom);
  return tab instanceof Project ? tab : undefined;
};

export default function NativeMacosMenu({ onReady }: { onReady: (ready: boolean) => void }) {
  const [config] = Settings.use("globalMenuConfig");
  const project = useAtomValue(activeResourceTabAtom);
  const { t, i18n } = useTranslation("keyBinds");
  useEffect(() => {
    let cancelled = false;
    const actions = new Map<string, () => Promise<unknown>>();
    const report = (error: unknown) => window.dispatchEvent(new ErrorEvent("error", { error, message: String(error) }));
    const build = async (items: ConfigItem[]): Promise<MenuEntry[]> => {
      const entries: MenuEntry[] = [];
      for (const item of items) {
        if (item.visible === false) continue;
        if (item.type === "recentFiles") {
          const files = (await RecentFileManager.getRecentFiles()).sort((a, b) => b.time - a.time).slice(0, 12);
          for (const file of files) {
            const id = `recent:${file.uri.toString()}`;
            actions.set(id, () => onOpenFile(file.uri, "NativeMenu"));
            entries.push({
              id,
              label: PathString.absolute2file(decodeURI(file.uri.toString())),
              separator: false,
              disabled: false,
              children: [],
            });
          }
          continue;
        }
        const binding = command(item.id);
        const children = await build(item.children ?? []);
        const submenu = item.type === "sub" || item.type === "topMenu";
        if (!submenu && item.type !== "separator")
          actions.set(item.id, async () => {
            const latest = command(item.id);
            const active = currentProject();
            if ((await latest?.when?.(active)) !== false) await latest?.onPress?.(active);
          });
        entries.push({
          id: item.id,
          label: t(`${item.id}.title`, item.label ?? item.id),
          separator: item.type === "separator",
          children,
          disabled:
            !submenu &&
            item.type !== "separator" &&
            (!binding?.onPress || (await binding.when?.(currentProject())) === false),
        });
      }
      return entries;
    };
    const stop = events.menuCommand.on((id) => {
      void Promise.resolve()
        .then(() => actions.get(id)?.())
        .catch(report);
    });
    const failed = (error: unknown) => {
      if (!cancelled) onReady(false);
      report(error);
    };
    void build(config)
      .then((entries) => {
        menuUpdate = menuUpdate
          .then(async () => {
            if (cancelled) return;
            await Native.setMenu(entries);
            if (!cancelled) onReady(true);
          })
          .catch(failed);
      })
      .catch(failed);
    return () => {
      cancelled = true;
      stop();
    };
  }, [config, project, t, i18n.resolvedLanguage, onReady]);
  return null;
}
