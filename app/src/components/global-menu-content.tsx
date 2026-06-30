import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Project } from "@/core/Project";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { allKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { Settings } from "@/core/service/Settings";
import { activeTabAtom } from "@/state";
import { formatKeyBindSequenceToString } from "@/utils/keyDisplay";
import { PathString } from "@/utils/pathString";
import { useAtom } from "jotai";
import type { LucideProps } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type GlobalMenuConfigItem = (typeof Settings)["globalMenuConfig"][number];

const Content = MenubarContent;
const Item = MenubarItem;
const Menu = MenubarMenu;
const Separator = MenubarSeparator;
const Sub = MenubarSub;
const SubContent = MenubarSubContent;
const SubTrigger = MenubarSubTrigger;
const Trigger = MenubarTrigger;

function resolveIcon(itemId: string, iconName?: string): ReactNode {
  if (iconName) {
    const Comp = (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[iconName];
    if (Comp) return <Comp />;
  }
  const kb = allKeyBinds.find((k) => k.id === itemId);
  if (kb?.icon) {
    const Comp = kb.icon;
    return <Comp />;
  }
  return null;
}

// ----------------- 特殊节点 -----------------

function RecentFilesSection() {
  const [recentFiles, setRecentFiles] = useState<RecentFileManager.RecentFile[]>([]);
  const refresh = async () => {
    await RecentFileManager.sortTimeRecentFiles();
    setRecentFiles(await RecentFileManager.getRecentFiles());
  };
  useEffect(() => {
    refresh();
  }, []);
  return (
    <>
      {recentFiles.slice(0, 12).map((file) => (
        <Item
          key={file.uri.toString()}
          onClick={async () => {
            await onOpenFile(file.uri, "GlobalMenu最近打开的文件");
            await refresh();
          }}
        >
          <LucideIcons.File />
          {PathString.absolute2file(decodeURI(file.uri.toString()))}
        </Item>
      ))}
      {recentFiles.length > 12 && (
        <>
          <Separator />
          <span className="p-2 text-sm opacity-50">注：此处仅显示12个</span>
        </>
      )}
    </>
  );
}

// ----------------- 主组件 -----------------

export default function GlobalMenuContent() {
  const [tab] = useAtom(activeTabAtom);
  const activeProject = tab instanceof Project ? tab : undefined;
  const [config] = Settings.use("globalMenuConfig");
  const { t } = useTranslation("keyBinds");

  const isVisible = (item: GlobalMenuConfigItem): boolean => {
    if (item.visible === false) return false;
    return true;
  };

  const renderItem = (item: GlobalMenuConfigItem): ReactNode => {
    if (!isVisible(item)) return null;

    if (item.type === "separator") {
      return <Separator key={item.id} />;
    }

    if (item.type === "recentFiles") {
      return <RecentFilesSection key={item.id} />;
    }

    if (item.type === "sub") {
      const uiKb = KeyBindsUI.getUIKeyBind(item.id);
      const staticKb = allKeyBinds.find((k) => k.id === item.id);
      const whenFn = uiKb?.when ?? staticKb?.when;
      const whenOk = whenFn ? whenFn(activeProject) : true;
      const enabled = whenOk !== false;
      return (
        <Sub key={item.id}>
          <SubTrigger disabled={!enabled}>
            {resolveIcon(item.id, item.icon)}
            {t(`${item.id}.title`, item.label ?? item.id)}
          </SubTrigger>
          <SubContent>{(item.children || []).map(renderItem)}</SubContent>
        </Sub>
      );
    }

    if (item.type === "item") {
      const uiKb = KeyBindsUI.getUIKeyBind(item.id);
      const staticKb = allKeyBinds.find((k) => k.id === item.id);
      const onClick = uiKb?.onPress ?? staticKb?.onPress;
      const shortcut = uiKb?.key ? formatKeyBindSequenceToString(uiKb.key, "+", ",") : undefined;
      const whenFn = uiKb?.when ?? staticKb?.when;
      // when 异步时简单处理：true 为可用，Promise 视为可用
      const whenOk = whenFn ? whenFn(activeProject) : true;
      const enabled = !!onClick && whenOk !== false;
      return (
        <Item key={item.id} disabled={!enabled} onClick={() => onClick?.(activeProject)}>
          {resolveIcon(item.id, item.icon)}
          {t(`${item.id}.title`, item.label ?? item.id)}
          {shortcut && <MenubarShortcut>{shortcut}</MenubarShortcut>}
        </Item>
      );
    }

    return null;
  };

  const renderTopMenu = (top: GlobalMenuConfigItem): ReactNode => {
    if (top.type !== "topMenu") return null;
    if (!isVisible(top)) return null;
    const uiKb = KeyBindsUI.getUIKeyBind(top.id);
    const staticKb = allKeyBinds.find((k) => k.id === top.id);
    const whenFn = uiKb?.when ?? staticKb?.when;
    const whenOk = whenFn ? whenFn(activeProject) : true;
    const enabled = whenOk !== false;
    return (
      <Menu key={top.id}>
        <Trigger disabled={!enabled}>
          {resolveIcon(top.id, top.icon)}
          <span className="hidden sm:inline">{t(`${top.id}.title`, top.label ?? top.id)}</span>
        </Trigger>
        <Content>{(top.children || []).map(renderItem)}</Content>
      </Menu>
    );
  };

  return <Menubar className="shrink-0">{config.map(renderTopMenu)}</Menubar>;
}
