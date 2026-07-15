import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tab } from "@/core/Tab";
import { TabWorkspace } from "@/core/TabWorkspace";
import { AppWindowMac, Columns2, Dock, Rows2, X } from "lucide-react";
import React from "react";

export default function TabContextMenu({
  tab,
  children,
  onClose,
}: {
  tab: Tab;
  children: React.ReactElement;
  onClose?: (tab: Tab) => void | Promise<void>;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {tab.layout === "docked" ? (
          <>
            <ContextMenuItem onSelect={() => TabWorkspace.split(tab.id, "right")}>
              <Columns2 />
              向右拆分
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => TabWorkspace.split(tab.id, "bottom")}>
              <Rows2 />
              向下拆分
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => TabWorkspace.float(tab.id)}>
              <AppWindowMac />
              浮动
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem disabled={!tab.canDock} onSelect={() => TabWorkspace.dock(tab.id)}>
            <Dock />
            停靠
          </ContextMenuItem>
        )}
        {tab.closable && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={() => void (onClose?.(tab) ?? TabWorkspace.close(tab.id))}>
              <X />
              关闭
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
