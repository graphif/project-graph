import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { formatKeyBindSequenceToString } from "@/utils/keyDisplay";
import { useAtom } from "jotai";
import type React from "react";
import { useTranslation } from "react-i18next";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./components/ui/command";
import { Project } from "./core/Project";
import { activeTabAtom, commandPaletteVisibleAtom } from "./state";

export default function CommandPalette({ zoomStyle }: { zoomStyle?: React.CSSProperties }) {
  const [commandPaletteVisible, setCommandPaletteVisible] = useAtom(commandPaletteVisibleAtom);
  const [tab] = useAtom(activeTabAtom);
  const { t } = useTranslation("keyBinds");
  const uiKeyBinds = KeyBindsUI.use();

  return (
    <CommandDialog open={commandPaletteVisible} onOpenChange={setCommandPaletteVisible} contentStyle={zoomStyle}>
      <Command shouldFilter>
        <CommandInput placeholder="搜索命令或快捷键..." />
        <CommandList>
          <CommandEmpty>没有找到匹配的命令。</CommandEmpty>
          {uiKeyBinds.map((kb) => {
            const i18n = t(kb.id, { returnObjects: true }) as { title?: string; description?: string } | undefined;
            const title = i18n?.title ?? kb.id;
            const description = i18n?.description ?? "";
            const shortcut = kb.key ? formatKeyBindSequenceToString(kb.key, "+", ", ") : "";
            return (
              <CommandItem
                key={kb.id}
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
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
