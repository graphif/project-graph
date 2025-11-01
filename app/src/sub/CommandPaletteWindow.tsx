import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { RenderKey } from "@/components/ui/key-bind";
import { KeyBinds } from "@/core/service/controlService/shortcutKeysEngine/KeyBinds";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { parseEmacsKey } from "@/utils/emacs";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function CommandPaletteWindow({ winId = "" }: { winId?: string }) {
  const [entries, setEntries] = useState<[string, string][]>([]);
  const { t } = useTranslation("keyBinds");
  const [activeProject] = useAtom(activeProjectAtom);

  useEffect(() => {
    (async () => {
      const entries = await KeyBinds.entries();
      setEntries(entries);
    })();
  }, [t]);

  return (
    <Command>
      <CommandInput data-pg-drag-region placeholder="搜索快捷键..." autoFocus />
      <CommandList>
        <CommandEmpty>无结果</CommandEmpty>
        <CommandGroup>
          {entries.map(([k, v]) => (
            <CommandItem
              key={k}
              onSelect={() => {
                SubWindow.close(winId);
                for (const bind of KeyBinds.binds) {
                  if (bind.id === k) {
                    bind.onPress(activeProject!);
                    break;
                  }
                }
              }}
            >
              <span>{t(`${k}.title`, { defaultValue: "?" })}</span>
              <span className="opacity-50">{k}</span>
              <CommandShortcut>
                {parseEmacsKey(v).map((v, i) => (
                  <RenderKey key={i} data={v} />
                ))}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

CommandPaletteWindow.open = () => {
  SubWindow.create({
    children: <CommandPaletteWindow />,
    rect: Rectangle.inCenter(new Vector(innerWidth * 0.35, innerHeight * 0.4)),
    closeWhenClickOutside: true,
    titleBarOverlay: true,
  });
};
