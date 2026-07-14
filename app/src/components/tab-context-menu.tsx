import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tab } from "@/core/Tab";
import { TabWorkspace } from "@/core/TabWorkspace";
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
          <ContextMenuItem onSelect={() => TabWorkspace.float(tab.id)}>浮动标签页</ContextMenuItem>
        ) : (
          <ContextMenuItem disabled={!tab.canDock} onSelect={() => TabWorkspace.dock(tab.id)}>
            停靠到标签页栏
          </ContextMenuItem>
        )}
        {tab.closable && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={() => void (onClose?.(tab) ?? TabWorkspace.close(tab.id))}>
              关闭标签页
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
