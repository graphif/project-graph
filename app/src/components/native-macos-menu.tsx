import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { allKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import { activeResourceTabAtom, store } from "@/state";
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { invoke } from "@tauri-apps/api/core";
import { nativeMenuIcon, type NativeMenuIconId } from "./native-menu-icon";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { PathString } from "@/utils/pathString";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

type ConfigItem = (typeof Settings.globalMenuConfig)[number];

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

function currentProject() {
  const tab = store.get(activeResourceTabAtom);
  return tab instanceof Project ? tab : undefined;
}

function command(id: string) {
  return KeyBindsUI.getUIKeyBind(id) ?? allKeyBinds.find((item) => item.id === id);
}

export default function NativeMacosMenu({ onReady }: { onReady: (ready: boolean) => void }) {
  const [config] = Settings.use("globalMenuConfig");
  const project = useAtomValue(activeResourceTabAtom);
  const { t, i18n } = useTranslation("keyBinds");
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const resources: { close: () => Promise<void> }[] = [];
    const iconStyles: { title: string; width: number }[] = [];
    const own = <T extends { close: () => Promise<void> }>(resource: T): T => {
      resources.push(resource);
      return resource;
    };
    const buildItem = async (item: ConfigItem): Promise<MenuItem | Submenu | PredefinedMenuItem | null> => {
      if (item.visible === false) return null;
      if (item.type === "separator") return own(await PredefinedMenuItem.new({ item: "Separator" }));
      const text = t(`${item.id}.title`, item.label ?? item.id);
      if (item.type === "sub" || item.type === "topMenu") {
        const items = [];
        for (const child of item.children ?? []) {
          if (child.type === "recentFiles" && child.visible !== false) {
            const recentFiles = (await RecentFileManager.getRecentFiles()).sort((a, b) => b.time - a.time).slice(0, 12);
            for (const file of recentFiles) {
              items.push(
                own(
                  await MenuItem.new({
                    text: PathString.absolute2file(decodeURI(file.uri.toString())),
                    action: () => {
                      void onOpenFile(file.uri, "NativeMenu最近打开的文件");
                    },
                  }),
                ),
              );
            }
            continue;
          }
          const built = await buildItem(child);
          if (built) items.push(built);
        }
        // macOS hides the title when an image is present, so include the label in the image.
        const hasIcon = item.type === "topMenu" && nativeMacosMenuIds.has(item.id);
        const rendered = hasIcon ? await nativeMenuIcon(item.id as NativeMenuIconId, text) : undefined;
        if (rendered) iconStyles.push({ title: text, width: rendered.width });
        return own(await Submenu.new({ text, items, icon: rendered ? own(rendered.image) : undefined }));
      }
      if (item.type !== "item") return null;
      const binding = command(item.id);
      return own(
        await MenuItem.new({
          text,
          enabled: !!binding?.onPress && (await binding.when?.(currentProject())) !== false,
          action: () => {
            void (async () => {
              const latest = command(item.id);
              const active = currentProject();
              if ((await latest?.when?.(active)) !== false) await latest?.onPress?.(active);
            })();
          },
        }),
      );
    };

    queue.current = queue.current.then(async () => {
      if (cancelled) return;
      try {
        const menu = own(await Menu.default());
        const defaults = await menu.items();
        defaults.forEach(own);
        for (const entry of defaults) {
          if (entry instanceof Submenu && ["File", "Edit", "View", "Help"].includes(await entry.text())) {
            await menu.remove(entry);
          }
        }
        const settings = config.find((item) => item.id === "settings" && item.type === "topMenu");
        const about = config.find((item) => item.id === "about" && item.type === "topMenu");
        const applicationMenu = defaults[0];
        if (!(applicationMenu instanceof Submenu)) throw new Error("Application menu is unavailable");
        const previousAbout = await applicationMenu.removeAt(0);
        if (previousAbout) own(previousAbout);
        const applicationItems: ConfigItem[] = [
          ...(settings ? [{ ...settings, type: "sub" as const }] : []),
          ...(about?.visible !== false ? (about?.children ?? []).filter((item) => item.id !== "openAboutWindow") : []),
        ];
        let applicationIndex = 0;
        for (const item of applicationItems) {
          const built = await buildItem(item);
          if (built) await applicationMenu.insert(built, applicationIndex++);
        }
        let windowMenu: Submenu | undefined;
        for (const id of nativeMacosMenuIds) {
          if (id === "settings" || id === "about") continue;
          const top = config.find((item) => item.id === id && item.type === "topMenu");
          if (!top || top.visible === false) continue;
          const built = await buildItem(top);
          if (!(built instanceof Submenu)) continue;
          if (top.id === "window") {
            windowMenu = built;
            // Tauri's default menu uses the English title, independently of the app locale.
            for (const entry of defaults) {
              if (entry instanceof Submenu && (await entry.text()) === "Window") {
                const systemItems = await entry.items();
                systemItems.forEach(own);
                await built.prepend(own(await PredefinedMenuItem.new({ item: "Separator" })));
                await built.prepend(systemItems);
                await menu.remove(entry);
                break;
              }
            }
          }
          await menu.append(built);
        }
        if (cancelled) return;
        const previous = await menu.setAsAppMenu();
        await invoke("style_macos_menu_icons", { icons: iconStyles });
        await windowMenu?.setAsWindowsMenuForNSApp();
        await previous?.close();
        onReady(true);
      } catch (error) {
        onReady(false);
        window.dispatchEvent(new ErrorEvent("error", { error, message: String(error) }));
      } finally {
        // The installed menu retains its items; release the JavaScript resource handles.
        for (const resource of resources.reverse()) await resource.close();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [config, project, t, i18n.resolvedLanguage, onReady]);

  return null;
}
