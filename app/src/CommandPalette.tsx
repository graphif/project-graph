import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { formatKeyBindSequenceToString } from "@/utils/keyDisplay";
import { PathString } from "@/utils/pathString";
import { useAtom } from "jotai";
import { File } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./components/ui/command";
import { Project } from "./core/Project";
import { activeResourceTabAtom, commandPaletteVisibleAtom } from "./state";

export default function CommandPalette({ zoomStyle }: { zoomStyle?: React.CSSProperties }) {
  const [commandPaletteVisible, setCommandPaletteVisible] = useAtom(commandPaletteVisibleAtom);
  const [tab] = useAtom(activeResourceTabAtom);
  const { t } = useTranslation("keyBinds");
  const uiKeyBinds = KeyBindsUI.use();
  const [recentFiles, setRecentFiles] = useState<RecentFileManager.RecentFile[]>([]);

  useEffect(() => {
    if (!commandPaletteVisible) return;
    void (async () => {
      await RecentFileManager.sortTimeRecentFiles();
      setRecentFiles(await RecentFileManager.getRecentFiles());
    })();
  }, [commandPaletteVisible]);

  return (
    <CommandDialog open={commandPaletteVisible} onOpenChange={setCommandPaletteVisible} contentStyle={zoomStyle}>
      <Command shouldFilter>
        <CommandInput placeholder="搜索命令、快捷键或最近文件..." />
        <CommandList>
          <CommandEmpty>没有找到匹配的命令或文件。</CommandEmpty>
          {recentFiles.length > 0 && (
            <CommandGroup heading="最近文件">
              {recentFiles.map((file) => {
                const uriString = decodeURI(file.uri.toString());
                const fileName = PathString.absolute2file(uriString);
                return (
                  <CommandItem
                    key={file.uri.toString()}
                    value={`recent-file ${fileName} ${uriString}`}
                    keywords={[fileName, uriString]}
                    onSelect={() => {
                      void onOpenFile(file.uri, "CommandPalette最近文件");
                      setCommandPaletteVisible(false);
                    }}
                  >
                    <File />
                    <span className="truncate">{fileName}</span>
                    <CommandShortcut className="max-w-[40%] truncate tracking-normal normal-case">
                      {uriString}
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          <CommandGroup heading="命令">
            {uiKeyBinds.map((kb) => {
              const i18n = t(kb.id, { returnObjects: true }) as { title?: string; description?: string } | undefined;
              const title = i18n?.title ?? kb.id;
              const description = i18n?.description ?? "";
              const shortcut = kb.key ? formatKeyBindSequenceToString(kb.key, "+", ", ") : "";
              return (
                <CommandItem
                  key={kb.id}
                  value={`command ${kb.id} ${title} ${description} ${shortcut}`}
                  keywords={[kb.id, title, description, shortcut]}
                  onSelect={() => {
                    kb.onPress(tab as Project);
                    setCommandPaletteVisible(false);
                  }}
                >
                  {kb.icon && <kb.icon />}
                  <span>{title}</span>
                  {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
