import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Project } from "@/core/Project";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { allKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import { ColorManager } from "@/core/service/feedbackService/ColorManager";
import { Settings } from "@/core/service/Settings";
import { activeTabAtom } from "@/state";
import ColorPaletteWindow from "@/sub/ColorPaletteWindow";
import ColorWindow from "@/sub/ColorWindow";
import { Color } from "@graphif/data-structures";
import { useAtom } from "jotai";
import type { LucideProps } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import KeyTooltip from "./key-tooltip";
import { Button } from "./ui/button";

// 简化色盘：红绿各有低饱和度行 + 高饱和度行，其余色系各4个 + 黑白灰
// 排列：grid-cols-4，每行4个色块
const SIMPLE_PALETTE: (Color | null)[] = [
  // 红（低饱和度，亮→暗）
  new Color(235, 205, 205),
  new Color(200, 145, 145),
  new Color(155, 85, 85),
  new Color(100, 45, 45),
  // 红（高饱和度，亮→暗）
  new Color(240, 160, 155),
  new Color(210, 80, 75),
  new Color(150, 35, 30),
  new Color(47, 14, 15),
  // 橙
  new Color(235, 215, 195),
  new Color(210, 170, 130),
  new Color(165, 120, 80),
  new Color(110, 75, 45),
  // 黄
  new Color(235, 230, 190),
  new Color(210, 200, 120),
  new Color(165, 150, 60),
  new Color(110, 95, 30),
  // 绿（低饱和度，亮→暗）
  new Color(200, 225, 200),
  new Color(135, 185, 135),
  new Color(80, 140, 80),
  new Color(40, 85, 40),
  // 绿（高饱和度，亮→暗）
  new Color(155, 220, 140),
  new Color(90, 165, 75),
  new Color(65, 101, 57),
  new Color(30, 55, 25),
  // 青
  new Color(195, 225, 225),
  new Color(120, 180, 180),
  new Color(65, 130, 130),
  new Color(30, 80, 80),
  // 蓝
  new Color(200, 210, 235),
  new Color(130, 150, 200),
  new Color(70, 95, 160),
  new Color(35, 50, 105),
  // 紫
  new Color(220, 205, 235),
  new Color(170, 140, 205),
  new Color(115, 80, 160),
  new Color(65, 40, 105),
  // 消色
  new Color(255, 255, 255),
  new Color(180, 180, 180),
  new Color(90, 90, 90),
  new Color(0, 0, 0),
];

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
  const { t: tKeyBind } = useTranslation("keyBinds");
  const [config] = Settings.use("contextMenuConfig");

  // 加载用户自定义颜色
  const [userColorList, setUserColorList] = useState<Color[]>([]);
  useEffect(() => {
    ColorManager.getUserEntityFillColors().then(setUserColorList);
    const unsub = ColorManager.subscribe(() => {
      ColorManager.getUserEntityFillColors().then(setUserColorList);
    });
    return unsub;
  }, []);

  if (!p) return <></>;

  type ContextMenuConfigItem = (typeof Settings)["contextMenuConfig"][number];

  const getIcon = (itemId?: string, iconName?: string) => {
    if (iconName) {
      const IconComp = (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[iconName];
      if (IconComp) return <IconComp />;
    }
    if (itemId) {
      const kb = allKeyBinds.find((k) => k.id === itemId);
      if (kb?.icon) {
        const IconComp = kb.icon;
        return <IconComp />;
      }
    }
    return null;
  };

  const getItemTitle = (itemId: string, label?: string) =>
    label || tKeyBind(`${itemId}.title`, { defaultValue: t(itemId, { defaultValue: itemId }) });

  const checkVisible = (itemId: string) => {
    const kb = allKeyBinds.find((k) => k.id === itemId);
    if (kb && kb.when(p) === false) return false;
    return true;
  };

  const isConfigVisible = (it: ContextMenuConfigItem): boolean => {
    if (it.visible === false) return false;
    if (it.type === "separator") return true;
    if (it.type === "setColorForSelected") {
      return p.stageManager.getSelectedStageObjects().some((obj) => "color" in obj);
    }
    if (it.type === "group" || it.type === "sub") {
      return (it.children || []).some(isConfigVisible);
    }
    return checkVisible(it.id);
  };

  const renderButtonGroupChild = (it: ContextMenuConfigItem, isGrid: boolean = false) => {
    if (!isConfigVisible(it)) return null;
    if (it.type === "separator") return <div key={it.id} />;

    const uiKb = KeyBindsUI.getUIKeyBind(it.id);
    const keyBind = uiKb ?? allKeyBinds.find((k) => k.id === it.id);

    return (
      <KeyTooltip key={`tooltip-${it.id}`} keyId={it.id}>
        <Button
          variant="ghost"
          size="icon"
          className={isGrid ? "size-6" : ""}
          onClick={() => {
            keyBind?.onPress?.(p);
            if ((keyBind?.isContinuous || keyBind?.onRelease) && keyBind?.onRelease) {
              setTimeout(() => {
                keyBind.onRelease?.(p);
              }, 100);
            }
          }}
        >
          {getIcon(it.id, it.icon)}
        </Button>
      </KeyTooltip>
    );
  };

  const renderGridGroupContent = (groupConfig: ContextMenuConfigItem) => (
    <div
      key={groupConfig.id}
      className="grid gap-0"
      style={{
        gridTemplateColumns: `repeat(${groupConfig.cols || 3}, 1fr)`,
      }}
    >
      {groupConfig.children?.map((it: any) => renderButtonGroupChild(it, true))}
    </div>
  );

  const renderSetColorForSelected = (itemConfig: ContextMenuConfigItem) => {
    const hasColorableSelectedObject = p.stageManager.getSelectedStageObjects().some((it) => "color" in it);
    if (!hasColorableSelectedObject) return null;

    return (
      <Sub key={itemConfig.id}>
        <SubTrigger>
          {getIcon(itemConfig.id, itemConfig.icon)}
          {getItemTitle(itemConfig.id, itemConfig.label)}
        </SubTrigger>
        <SubContent>
          <Item onClick={() => p.stageObjectColorManager.setSelectedStageObjectColor(Color.Transparent)}>
            {getIcon("resetSelectedStageObjectColor", "Slash")}
            {t("resetColor")}
          </Item>

          <Item className="grid w-fit grid-cols-4 gap-0 bg-transparent!">
            {SIMPLE_PALETTE.map((color, index) =>
              color ? (
                <div
                  key={index}
                  className="hover:outline-accent-foreground size-4 -outline-offset-2 hover:outline-2"
                  style={{ backgroundColor: color.toString() }}
                  onMouseEnter={() => {
                    if (!Settings.colorPanelMouseEnterPreview) return;
                    p.controller.resetCountdownTimer();
                    p.stageObjectColorManager.setSelectedStageObjectColor(color, true);
                  }}
                  onClick={() => {
                    p.controller.resetCountdownTimer();
                    p.stageObjectColorManager.setSelectedStageObjectColor(color, false);
                  }}
                />
              ) : (
                <div key={index} className="size-4" />
              ),
            )}
          </Item>
          <Item onClick={() => p.stageObjectColorManager.setSelectedStageObjectColor(new Color(11, 45, 14, 0))}>
            改为强制特殊透明色
          </Item>
          <Item onClick={() => ColorWindow.open()}>打开调色板</Item>
          <Item onClick={() => ColorPaletteWindow.open()}>打开舞台颜色分布表</Item>
        </SubContent>
      </Sub>
    );
  };

  const renderSetPenStrokeColor = (itemConfig: ContextMenuConfigItem) => {
    return (
      <Sub key={itemConfig.id}>
        <SubTrigger>
          {getIcon(itemConfig.id, itemConfig.icon)}
          {getItemTitle(itemConfig.id, itemConfig.label)}
        </SubTrigger>
        <SubContent>
          <Item onClick={() => (Settings.autoFillPenStrokeColor = Color.Transparent.toArray())}>
            {getIcon("resetPenStrokeColor", "Slash")}
            {t("resetColor")}
          </Item>
          <Item className="grid w-fit grid-cols-4 gap-0 bg-transparent!">
            {SIMPLE_PALETTE.map((color, index) =>
              color ? (
                <div
                  key={index}
                  className="hover:outline-accent-foreground size-4 -outline-offset-2 hover:outline-2"
                  style={{ backgroundColor: color.toString() }}
                  onMouseEnter={() => {
                    if (!Settings.colorPanelMouseEnterPreview) return;
                    p.controller.resetCountdownTimer();
                    Settings.autoFillPenStrokeColor = color.toArray();
                  }}
                  onClick={() => {
                    p.controller.resetCountdownTimer();
                    Settings.autoFillPenStrokeColor = color.toArray();
                  }}
                />
              ) : (
                <div key={index} className="size-4" />
              ),
            )}
          </Item>
          <Item onClick={() => ColorWindow.open()}>打开调色板</Item>
        </SubContent>
      </Sub>
    );
  };

  const renderItem = (itemConfig: ContextMenuConfigItem): ReactNode => {
    if (!isConfigVisible(itemConfig)) return null;

    if (itemConfig.type === "separator") {
      return <div key={itemConfig.id} className="bg-border my-1 h-px" />;
    }

    if (itemConfig.type === "group" && itemConfig.layout === "row") {
      return (
        <Item key={itemConfig.id} className="gap-0 bg-transparent! p-0">
          {itemConfig.children?.map((it: any) => renderButtonGroupChild(it))}
        </Item>
      );
    }

    if (itemConfig.type === "group" && itemConfig.layout === "grid") {
      return (
        <Item key={itemConfig.id} className="gap-0 bg-transparent! p-0">
          {renderGridGroupContent(itemConfig)}
        </Item>
      );
    }

    if (itemConfig.type === "setColorForSelected") {
      return renderSetColorForSelected(itemConfig);
    }

    if (itemConfig.type === "setPenStrokeColor") {
      return renderSetPenStrokeColor(itemConfig);
    }

    if (itemConfig.type === "sub") {
      return (
        <Sub key={itemConfig.id}>
          <SubTrigger>
            {getIcon(itemConfig.id, itemConfig.icon)}
            {getItemTitle(itemConfig.id, itemConfig.label)}
          </SubTrigger>
          <SubContent>{renderItems(itemConfig.children || [])}</SubContent>
        </Sub>
      );
    }

    // Standard item
    if (!checkVisible(itemConfig.id)) return null;
    const uiKb = KeyBindsUI.getUIKeyBind(itemConfig.id);
    const keyBind = uiKb ?? allKeyBinds.find((k) => k.id === itemConfig.id);
    const action = keyBind?.onPress;
    const release = keyBind?.onRelease;
    const isContinuous = keyBind?.isContinuous;
    const shortcut = uiKb?.key;

    const handleClick = () => {
      action?.(p);
      if ((isContinuous || release) && release) {
        setTimeout(() => {
          release?.(p);
        }, 100);
      }
    };

    return (
      <Item key={itemConfig.id} onClick={handleClick} disabled={!action}>
        {getIcon(itemConfig.id, itemConfig.icon)}
        {getItemTitle(itemConfig.id, itemConfig.label)}
        {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
      </Item>
    );
  };

  const renderItems = (items: ContextMenuConfigItem[]) => {
    const rendered: ReactNode[] = [];

    const renderUserColorBar = () => {
      const hasColorableSelectedObject = p.stageManager.getSelectedStageObjects().some((it) => "color" in it);
      if (!hasColorableSelectedObject || userColorList.length === 0) return;

      rendered.push(
        <Item key="user-color-bar" className="bg-transparent! p-0">
          <div
            className="flex w-54 flex-row gap-0 overflow-x-hidden whitespace-nowrap"
            onWheelCapture={(e) => {
              e.stopPropagation();
              e.currentTarget.scrollLeft += e.deltaY;
            }}
          >
            {userColorList.map((color) => (
              <div
                key={color.toString()}
                className="hover:outline-accent-foreground size-3 shrink-0 -outline-offset-1 hover:outline-2"
                style={{ backgroundColor: `rgba(${color.r},${color.g},${color.b},${color.a})` }}
                onMouseEnter={() => {
                  if (!Settings.colorPanelMouseEnterPreview) return;
                  p.controller.resetCountdownTimer();
                  p.stageObjectColorManager.setSelectedStageObjectColor(color, true);
                }}
                onClick={() => {
                  p.controller.resetCountdownTimer();
                  p.stageObjectColorManager.setSelectedStageObjectColor(color, false);
                }}
              />
            ))}
          </div>
        </Item>,
      );
    };

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!isConfigVisible(item)) continue;

      if (item.type === "group" && item.layout === "grid") {
        const gridGroups = [item];
        while (
          index + 1 < items.length &&
          isConfigVisible(items[index + 1]) &&
          items[index + 1].type === "group" &&
          items[index + 1].layout === "grid"
        ) {
          gridGroups.push(items[index + 1]);
          index++;
        }

        rendered.push(
          <Item key={gridGroups.map((group) => group.id).join("-")} className="gap-0 bg-transparent! p-0">
            {gridGroups.map((group) => renderGridGroupContent(group))}
          </Item>,
        );
        continue;
      }

      if (item.type === "setColorForSelected") {
        renderUserColorBar();
      }
      rendered.push(renderItem(item));
    }

    return rendered;
  };

  return <Content>{renderItems(config)}</Content>;
}
