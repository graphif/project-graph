import { Project } from "@/core/Project";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { KeyBindsUI, type UIKeyBind } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { Settings } from "@/core/service/Settings";
import { activeTabAtom } from "@/state";
import { cn } from "@/utils/cn";
import { matchEmacsKeyPress, parseSingleEmacsKey, transformedKeys } from "@/utils/emacs";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const RADIUS = 112;
const DEAD_ZONE = 30;
const ITEM_WIDTH = 112;
const ITEM_HEIGHT = 52;
const VIEWPORT_PADDING = 12;

type PieMenuConfig = (typeof Settings)["pieMenuConfig"][number];
type ReleaseInput = { type: "keyboard"; key: string } | { type: "mouse"; button: number };
type OpenMenu = {
  config: PieMenuConfig;
  center: { x: number; y: number };
  release: ReleaseInput;
};

function normalizedKey(key: string) {
  const lowerKey = key.toLowerCase();
  return lowerKey in transformedKeys ? transformedKeys[lowerKey as keyof typeof transformedKeys] : lowerKey;
}

function getReleaseInput(trigger: string): ReleaseInput | null {
  const lastPart = trigger.trim().split(/\s+/).at(-1);
  if (!lastPart) return null;
  const parsed = parseSingleEmacsKey(lastPart);
  if (parsed.key === "<MWU>" || parsed.key === "<MWD>") return null;
  const mouseMatch = /^<(\d+)>$/.exec(parsed.key);
  if (mouseMatch) return { type: "mouse", button: Number(mouseMatch[1]) };
  return { type: "keyboard", key: parsed.key };
}

function clampCenter(x: number, y: number) {
  const horizontalMargin = RADIUS + ITEM_WIDTH / 2 + VIEWPORT_PADDING;
  const verticalMargin = RADIUS + ITEM_HEIGHT / 2 + VIEWPORT_PADDING;
  return {
    x: Math.min(Math.max(x, horizontalMargin), Math.max(horizontalMargin, window.innerWidth - horizontalMargin)),
    y: Math.min(Math.max(y, verticalMargin), Math.max(verticalMargin, window.innerHeight - verticalMargin)),
  };
}

function getSelectedIndex(center: { x: number; y: number }, x: number, y: number, count: number): number | null {
  if (count === 0) return null;
  const deltaX = x - center.x;
  const deltaY = y - center.y;
  if (Math.hypot(deltaX, deltaY) < DEAD_ZONE) return null;
  const step = (Math.PI * 2) / count;
  const normalizedAngle = (Math.atan2(deltaY, deltaX) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  return Math.round(normalizedAngle / step) % count;
}

export default function PieMenu() {
  const activeTab = useAtomValue(activeTabAtom);
  const activeProject = activeTab instanceof Project ? activeTab : undefined;
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
  const [enabledItems, setEnabledItems] = useState<boolean[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const openMenuRef = useRef<OpenMenu | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const enabledItemsRef = useRef<boolean[]>([]);
  const { t } = useTranslation("keyBinds");

  const close = useCallback(() => {
    openMenuRef.current = null;
    selectedIndexRef.current = null;
    enabledItemsRef.current = [];
    setOpenMenu(null);
    setSelectedIndex(null);
    setEnabledItems([]);
  }, []);

  const confirm = useCallback(async () => {
    const menu = openMenuRef.current;
    const index = selectedIndexRef.current;
    const enabled = index !== null && enabledItemsRef.current[index];
    close();
    if (menu && index !== null && enabled) {
      await KeyBindsUI.execute(menu.config.items[index], activeProject);
    }
  }, [activeProject, close]);

  useEffect(() => {
    openMenuRef.current = openMenu;
  }, [openMenu]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    enabledItemsRef.current = enabledItems;
  }, [enabledItems]);

  useEffect(() => {
    let availabilityGeneration = 0;
    const unregister = KeyBindsUI.registerInputInterceptor({
      onInput: async (event, sequence) => {
        if (openMenuRef.current) {
          if (event instanceof KeyboardEvent && event.key === "Escape") close();
          return true;
        }

        const matches = Settings.pieMenuConfig
          .filter((menu) => menu.enabled && menu.trigger.trim() && matchEmacsKeyPress(menu.trigger, [...sequence]))
          .sort((left, right) => right.trigger.trim().split(/\s+/).length - left.trigger.trim().split(/\s+/).length);
        const config = matches[0];
        if (!config) return false;
        const release = getReleaseInput(config.trigger);
        if (!release) return false;

        const location = event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : MouseLocation.vector();
        const nextOpenMenu = { config, center: clampCenter(location.x, location.y), release };
        const generation = ++availabilityGeneration;
        openMenuRef.current = nextOpenMenu;
        selectedIndexRef.current = null;
        enabledItemsRef.current = config.items.map(() => false);
        setOpenMenu(nextOpenMenu);
        setSelectedIndex(null);
        setEnabledItems(enabledItemsRef.current);

        const availability = await Promise.all(config.items.map((id) => KeyBindsUI.canExecute(id, activeProject)));
        if (generation === availabilityGeneration && openMenuRef.current?.config.id === config.id) {
          enabledItemsRef.current = availability;
          setEnabledItems(availability);
        }
        return true;
      },
      onKeyUp: async (event) => {
        const release = openMenuRef.current?.release;
        if (release?.type === "keyboard" && normalizedKey(event.key) === release.key) await confirm();
      },
      onMouseUp: async (event) => {
        const release = openMenuRef.current?.release;
        if (release?.type === "mouse" && event.button === release.button) await confirm();
      },
    });

    const onPointerMove = (event: PointerEvent) => {
      const menu = openMenuRef.current;
      if (!menu) return;
      const nextIndex = getSelectedIndex(menu.center, event.clientX, event.clientY, menu.config.items.length);
      selectedIndexRef.current = nextIndex;
      setSelectedIndex(nextIndex);
    };
    const onBlur = () => close();
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("blur", onBlur);
    return () => {
      availabilityGeneration += 1;
      unregister();
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [activeProject, close, confirm]);

  if (!openMenu) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-100" aria-label={openMenu.config.name} role="menu">
      <div
        className="bg-background/80 border-primary/30 absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-xl backdrop-blur-md"
        style={{ left: openMenu.center.x, top: openMenu.center.y }}
      />
      {openMenu.config.items.map((id, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / openMenu.config.items.length;
        const keyBind: UIKeyBind | undefined = KeyBindsUI.getUIKeyBind(id);
        const Icon = keyBind?.icon;
        const enabled = enabledItems[index] === true;
        const selected = selectedIndex === index;
        return (
          <div
            key={`${id}-${index}`}
            role="menuitem"
            aria-disabled={!enabled}
            className={cn(
              "bg-popover text-popover-foreground absolute flex h-13 w-28 -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border px-3 shadow-lg transition-[transform,opacity,background-color]",
              selected && enabled && "bg-primary text-primary-foreground scale-110",
              selected && !enabled && "border-destructive/60",
              !enabled && "opacity-45 grayscale",
            )}
            style={{
              left: openMenu.center.x + Math.cos(angle) * RADIUS,
              top: openMenu.center.y + Math.sin(angle) * RADIUS,
            }}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            <span className="truncate text-xs font-medium" title={t(`${id}.title`, { defaultValue: id })}>
              {t(`${id}.title`, { defaultValue: id })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
