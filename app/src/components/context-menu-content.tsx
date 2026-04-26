import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { Project } from "@/core/Project";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { Settings } from "@/core/service/Settings";
import { activeTabAtom } from "@/state";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import KeyTooltip from "./key-tooltip";
import { Button } from "./ui/button";

const Content = ContextMenuContent;
const Item = ContextMenuItem;
const Sub = ContextMenuSub;
const SubTrigger = ContextMenuSubTrigger;
const SubContent = ContextMenuSubContent;

/**
 * 右键菜单
 * @returns
 */
export default function MyContextMenuContent() {
  const [tab] = useAtom(activeTabAtom);
  const p = tab instanceof Project ? tab : undefined;
  const { t } = useTranslation("contextMenu");
  const [config] = Settings.use("contextMenuConfig");

  if (!p) return <></>;

  const renderItem = (itemConfig: (typeof Settings)["contextMenuConfig"][number]) => {
    if (!itemConfig.visible) return null;

    if (itemConfig.type === "separator") {
      return <div key={itemConfig.id} className="bg-border my-1 h-px" />;
    }

    if (itemConfig.type === "group" && itemConfig.layout === "row") {
      return (
        <Item className="bg-transparent! gap-0 p-0">
          {itemConfig.children?.map((it) => (
            <KeyTooltip key={`tooltip-${it.id}`} keyId={it.id}>
              <Button variant="ghost" size="icon" onClick={() => KeyBindsUI.getUIKeyBind(it.id)?.onPress?.(p)}>
                <DynamicIcon name={it.icon} />
              </Button>
            </KeyTooltip>
          ))}
        </Item>
      );
    }

    if (itemConfig.type === "group" && itemConfig.layout === "grid") {
      return (
        <Item
          className="bg-transparent! grid w-max gap-0 p-0"
          style={{
            gridTemplateColumns: `repeat(${itemConfig.cols || 3}, 1fr)`,
          }}
        >
          {itemConfig.children?.map((it) => (
            <KeyTooltip key={`tooltip-${it.id}`} keyId={it.id}>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => KeyBindsUI.getUIKeyBind(it.id)?.onPress?.(p)}
              >
                <DynamicIcon name={it.icon} />
              </Button>
            </KeyTooltip>
          ))}
        </Item>
      );
    }

    if (itemConfig.type === "sub") {
      return (
        <Sub key={itemConfig.id}>
          <SubTrigger>
            {itemConfig.icon && <DynamicIcon name={itemConfig.icon} className="mr-2 size-4" />}
            {itemConfig.label || t(itemConfig.id) || itemConfig.id}
          </SubTrigger>
          <SubContent>{itemConfig.children?.map((child: any) => renderItem(child))}</SubContent>
        </Sub>
      );
    }

    // Standard item
    const keyBind = KeyBindsUI.getUIKeyBind(itemConfig.id);
    const action = keyBind?.onPress;
    const shortcut = keyBind?.key;

    return (
      <Item key={itemConfig.id} onClick={() => action?.(p)} disabled={!action}>
        {itemConfig.icon && <DynamicIcon name={itemConfig.icon} />}
        {itemConfig.label || t(itemConfig.id) || itemConfig.id}
        {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
      </Item>
    );
  };

  return <Content>{config.map((item: any) => renderItem(item))}</Content>;
}
