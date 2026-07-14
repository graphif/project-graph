import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import KeyBind from "@/components/ui/key-bind";
import { Switch } from "@/components/ui/switch";
import { KeyBindsUI, type UIKeyBind } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { Settings, type Settings as SettingsType } from "@/core/service/Settings";
import { parseSingleEmacsKey } from "@/utils/emacs";
import { Grip, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const PREVIEW_RADIUS = 118;
type PieMenuConfig = SettingsType["pieMenuConfig"][number];

function normalizeTrigger(trigger: string) {
  return trigger.trim().replace(/\s+/g, " ").toLowerCase();
}

function validateTrigger(trigger: string, menuId: string, menus: PieMenuConfig[]): string | null {
  const normalized = normalizeTrigger(trigger);
  if (!normalized) return "请录入触发按键。";
  const last = parseSingleEmacsKey(normalized.split(" ").at(-1)!);
  if (last.key === "<mwu>" || last.key === "<mwd>") return "最后一个输入必须是可释放的键盘键或鼠标按键。";
  if (menus.some((menu) => menu.id !== menuId && normalizeTrigger(menu.trigger) === normalized)) {
    return "该触发按键已被另一个 Pie Menu 使用。";
  }
  if (KeyBindsUI.getAllUIKeyBinds().some((keyBind) => normalizeTrigger(keyBind.key) === normalized)) {
    return "该触发按键与现有快捷键冲突。";
  }
  return null;
}

function actionTitle(t: ReturnType<typeof useTranslation>["t"], action: UIKeyBind) {
  return t(`${action.id}.title`, { defaultValue: action.id });
}

export default function PieMenuPage() {
  const [menus, setMenus] = Settings.use("pieMenuConfig");
  const [selectedId, setSelectedId] = useState<string | null>(menus[0]?.id ?? null);
  const [actions, setActions] = useState<UIKeyBind[]>(() => KeyBindsUI.getAllUIKeyBinds());
  const [query, setQuery] = useState("");
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("keyBinds");
  const selected = menus.find((menu) => menu.id === selectedId) ?? null;

  useEffect(() => KeyBindsUI.onKeyBindListChange(setActions), []);
  useEffect(() => {
    if (selectedId && !menus.some((menu) => menu.id === selectedId)) setSelectedId(menus[0]?.id ?? null);
  }, [menus, selectedId]);

  const updateSelected = (updater: (menu: PieMenuConfig) => PieMenuConfig) => {
    if (!selectedId) return;
    setMenus(menus.map((menu) => (menu.id === selectedId ? updater(menu) : menu)));
  };

  const selectedActions = useMemo(
    () => selected?.items.map((id) => actions.find((action) => action.id === id)),
    [actions, selected],
  );
  const availableActions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedIds = new Set(selected?.items ?? []);
    return actions.filter((action) => {
      if (selectedIds.has(action.id)) return false;
      const title = actionTitle(t, action).toLowerCase();
      return !normalizedQuery || action.id.toLowerCase().includes(normalizedQuery) || title.includes(normalizedQuery);
    });
  }, [actions, query, selected?.items, t]);

  const createMenu = () => {
    const menu: PieMenuConfig = {
      id: crypto.randomUUID(),
      name: `Pie Menu ${menus.length + 1}`,
      enabled: true,
      trigger: "",
      items: [],
    };
    setMenus([...menus, menu]);
    setSelectedId(menu.id);
    setTriggerError(null);
  };

  const deleteMenu = async () => {
    if (
      !selected ||
      !(await Dialog.confirm("删除 Pie Menu？", `“${selected.name}”及其配置将被永久删除。`, { destructive: true }))
    )
      return;
    const nextMenus = menus.filter((menu) => menu.id !== selected.id);
    setMenus(nextMenus);
    setSelectedId(nextMenus[0]?.id ?? null);
  };

  const moveItem = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    updateSelected((menu) => {
      const nextItems = [...menu.items];
      const [item] = nextItems.splice(sourceIndex, 1);
      nextItems.splice(targetIndex, 0, item);
      return { ...menu, items: nextItems };
    });
  };

  const getTargetIndex = (clientX: number, clientY: number, itemCount: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || itemCount === 0) return null;
    const deltaX = clientX - (rect.left + rect.width / 2);
    const deltaY = clientY - (rect.top + rect.height / 2);
    const angle = (Math.atan2(deltaY, deltaX) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    return Math.round(angle / ((Math.PI * 2) / itemCount)) % itemCount;
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggedIndex === null || !selected) return;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    const targetIndex = getTargetIndex(event.clientX, event.clientY, selected.items.length);
    if (targetIndex === null || targetIndex === draggedIndex) return;
    moveItem(draggedIndex, targetIndex);
    setDraggedIndex(targetIndex);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggedIndex !== null && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggedIndex(null);
    setDragPosition(null);
  };

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <aside className="bg-card flex w-52 shrink-0 flex-col rounded-xl border p-2">
        <Button className="mb-2 justify-start" onClick={createMenu}>
          <Plus className="size-4" /> 新建 Pie Menu
        </Button>
        <div className="min-h-0 flex-1 space-y-1 overflow-auto">
          {menus.map((menu) => (
            <button
              key={menu.id}
              type="button"
              onClick={() => {
                setSelectedId(menu.id);
                setTriggerError(null);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedId === menu.id ? "bg-accent" : "hover:bg-accent/60"}`}
            >
              <span className="block truncate font-medium">{menu.name}</span>
              <span className="text-muted-foreground block truncate text-xs">{menu.trigger || "未设置触发按键"}</span>
            </button>
          ))}
        </div>
      </aside>

      {!selected ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-xl border border-dashed text-sm">
          创建一个 Pie Menu 开始配置。
        </div>
      ) : (
        <main className="min-w-0 flex-1 space-y-5 overflow-auto pr-1">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Pie Menu</h2>
              <p className="text-muted-foreground text-sm">
                按住触发键，移动到选项方向，释放最后一个主键或鼠标按钮执行。
              </p>
            </div>
            <Button variant="destructive" size="icon" onClick={deleteMenu} aria-label="删除 Pie Menu">
              <Trash2 className="size-4" />
            </Button>
          </header>

          <section className="bg-card grid gap-4 rounded-xl border p-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">名称</span>
              <Input
                value={selected.name}
                onChange={(event) => updateSelected((menu) => ({ ...menu, name: event.target.value }))}
              />
            </label>
            <div className="flex items-center justify-between rounded-lg border px-3">
              <div>
                <div className="text-sm font-medium">启用</div>
                <div className="text-muted-foreground text-xs">禁用后不会拦截触发按键。</div>
              </div>
              <Switch
                checked={selected.enabled}
                onCheckedChange={(enabled) => updateSelected((menu) => ({ ...menu, enabled }))}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <div className="text-sm font-medium">触发按键</div>
              <KeyBind
                key={selected.id}
                defaultValue={selected.trigger}
                onChange={(trigger) => {
                  const error = validateTrigger(trigger, selected.id, menus);
                  setTriggerError(error);
                  if (!error) updateSelected((menu) => ({ ...menu, trigger: trigger.trim() }));
                }}
              />
              {triggerError && <p className="text-destructive text-xs">{triggerError}</p>}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_320px]">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">环形选项</h3>
                <p className="text-muted-foreground text-xs">拖拽选项到其他方向进行重排，悬停选项可删除。</p>
              </div>
              <div
                ref={previewRef}
                className="bg-card relative mx-auto h-80 w-full max-w-xl touch-none overflow-hidden rounded-xl border select-none"
                onPointerMove={handleDragMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <div className="bg-muted text-muted-foreground absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border">
                  <Grip className="size-5" />
                </div>
                {selectedActions?.length === 0 && (
                  <div className="text-muted-foreground absolute inset-0 flex items-end justify-center pb-6 text-sm">
                    从右侧快捷键列表添加选项
                  </div>
                )}
                {selectedActions?.map((action, index) => {
                  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / selectedActions.length;
                  const id = selected.items[index];
                  const Icon = action?.icon;
                  const isDragged = draggedIndex === index;
                  return (
                    <div
                      key={`${id}-preview`}
                      className={`group bg-popover absolute flex h-12 w-28 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center gap-2 rounded-xl border px-3 text-xs shadow transition-[left,top,transform,opacity] active:cursor-grabbing ${isDragged ? "z-10 scale-105 opacity-90 shadow-xl transition-none" : "hover:border-primary/50 hover:scale-105"}`}
                      style={
                        isDragged && dragPosition
                          ? { left: dragPosition.x, top: dragPosition.y }
                          : {
                              left: `calc(50% + ${Math.cos(angle) * PREVIEW_RADIUS}px)`,
                              top: `calc(50% + ${Math.sin(angle) * PREVIEW_RADIUS}px)`,
                            }
                      }
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
                        const rect = previewRef.current?.getBoundingClientRect();
                        if (rect) setDragPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
                        setDraggedIndex(index);
                      }}
                    >
                      {Icon && <Icon className="size-4 shrink-0" />}
                      <span className="min-w-0 flex-1 truncate">
                        {action ? actionTitle(t, action) : `${id}（不可用）`}
                      </span>
                      <button
                        type="button"
                        className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 flex size-6 scale-75 items-center justify-center rounded-full opacity-0 shadow transition-[opacity,transform] group-hover:scale-100 group-hover:opacity-100 focus:scale-100 focus:opacity-100"
                        aria-label={`删除 ${action ? actionTitle(t, action) : id}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() =>
                          updateSelected((menu) => ({
                            ...menu,
                            items: menu.items.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card flex min-h-96 flex-col rounded-xl border p-3">
              <h3 className="mb-2 font-medium">添加快捷键动作</h3>
              <div className="relative mb-2">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  className="pl-8"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索动作"
                />
              </div>
              <div className="min-h-0 flex-1 space-y-1 overflow-auto">
                {availableActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={selected.items.length >= 32}
                      onClick={() => updateSelected((menu) => ({ ...menu, items: [...menu.items, action.id] }))}
                      className="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm disabled:opacity-50"
                    >
                      {Icon && <Icon className="size-4 shrink-0" />}
                      <span className="min-w-0 flex-1 truncate">{actionTitle(t, action)}</span>
                      <Plus className="size-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
