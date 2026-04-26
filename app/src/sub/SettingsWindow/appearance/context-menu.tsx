import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, settingsSchema } from "@/core/service/Settings";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { allKeyBinds as staticKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  CornerUpLeft,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  MinusSquare,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function ContextMenuPage() {
  const [config, setConfig] = Settings.use("contextMenuConfig");
  const [searchTerm, setSearchTerm] = useState("");
  // Now tracks path instead of duplicating item. path is sufficient to find the item in the tree.
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fallback to static keybinds if dynamic ones aren't populated yet
  const [allKeyBinds, setAllKeyBinds] = useState(() => {
    const dynamic = KeyBindsUI.getAllUIKeyBinds();
    return dynamic.length > 0 ? dynamic : staticKeyBinds.map((kb) => ({ id: kb.id, key: kb.defaultKey }));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const dynamic = KeyBindsUI.getAllUIKeyBinds();
      if (dynamic.length > 0) {
        setAllKeyBinds(dynamic);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const filteredKeyBinds = useMemo(() => {
    return allKeyBinds.filter((kb) => kb.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allKeyBinds, searchTerm]);

  const saveConfig = (newConfig: any) => {
    setConfig([...newConfig] as any);
  };

  const findItemPath = (items: any[], id: string, currentPath: number[] = []): { path: number[]; item: any } | null => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) return { path: [...currentPath, i], item: items[i] };
      if (items[i].children) {
        const found = findItemPath(items[i].children, id, [...currentPath, i]);
        if (found) return found;
      }
    }
    return null;
  };

  const getItemByPath = (path: number[]) => {
    if (!path || path.length === 0) return null;
    let current: any = config;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].children;
      if (!current) return null;
    }
    return current[path[path.length - 1]];
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newConfig = JSON.parse(JSON.stringify(config));
    const activeData = findItemPath(newConfig, active.id as string);
    const overData = findItemPath(newConfig, over.id as string);

    if (!activeData || !overData) return;

    // Remove from old position
    let currentList = newConfig;
    for (let i = 0; i < activeData.path.length - 1; i++) {
      currentList = currentList[activeData.path[i]].children;
    }
    const [movedItem] = currentList.splice(activeData.path[activeData.path.length - 1], 1);

    // Insert into new position
    if (overData.item.type === "group") {
      overData.item.children = overData.item.children || [];
      overData.item.children.push(movedItem);
    } else {
      let targetList = newConfig;
      for (let i = 0; i < overData.path.length - 1; i++) {
        targetList = targetList[overData.path[i]].children;
      }
      targetList.splice(overData.path[overData.path.length - 1], 0, movedItem);
    }

    saveConfig(newConfig);
    // Reset selection if moving messes up path (for simplicity)
    setSelectedPath(null);
  };

  const moveItem = (path: number[], direction: "up" | "down") => {
    const newConfig = JSON.parse(JSON.stringify(config));
    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);

    let targetList = newConfig;
    for (const p of parentPath) {
      targetList = targetList[p].children;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= targetList.length) return;

    [targetList[index], targetList[newIndex]] = [targetList[newIndex], targetList[index]];
    saveConfig(newConfig);
    // Update selected path to new position
    setSelectedPath([...parentPath, newIndex]);
  };

  const moveOutFromGroup = (path: number[]) => {
    if (!path || path.length <= 1) return;
    const newConfig = JSON.parse(JSON.stringify(config));

    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    const parentIndex = parentPath[parentPath.length - 1];
    const grandParentPath = parentPath.slice(0, -1);

    // Find grandparent list
    let grandParentList = newConfig;
    for (const p of grandParentPath) {
      grandParentList = grandParentList[p].children;
    }

    // Find parent list
    const parentList = grandParentList[parentIndex].children;

    // Remove from parent list
    const [item] = parentList.splice(index, 1);

    // Insert into grandparent list immediately after the parent group
    grandParentList.splice(parentIndex + 1, 0, item);

    saveConfig(newConfig);
    // Update selected path to new position outside
    setSelectedPath([...grandParentPath, parentIndex + 1]);
  };

  const deleteItem = (path: number[]) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);

    let targetList = newConfig;
    for (const p of parentPath) {
      targetList = targetList[p].children;
    }

    targetList.splice(index, 1);
    saveConfig(newConfig);
    setSelectedPath(null);
  };

  const addItem = (id: string) => {
    const newItem = { type: "item", id, visible: true, icon: "Circle" };
    saveConfig([...config, newItem]);
    toast.success(`已添加: ${id}`);
  };

  const addGroup = () => {
    const newGroup = {
      type: "group",
      id: "group-" + Date.now(),
      layout: "row",
      visible: true,
      children: [],
    };
    saveConfig([...config, newGroup]);
  };

  const addSeparator = () => {
    const newItem = { type: "separator", id: "sep-" + Date.now(), visible: true };
    saveConfig([...config, newItem]);
  };

  const resetToDefault = () => {
    const defaultVal = settingsSchema.shape.contextMenuConfig.parse(undefined);
    saveConfig(defaultVal);
    setSelectedPath(null);
    toast.success("已重置为默认布局");
  };

  const updateItemProperty = (path: number[], updates: any) => {
    if (!path) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    let current = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].children;
    }
    current[path[path.length - 1]] = { ...current[path[path.length - 1]], ...updates };
    saveConfig(newConfig);
  };

  const selectedItem = selectedPath ? getItemByPath(selectedPath) : null;

  const renderMenuItems = (items: any[], path: number[] = []) => {
    const itemIds = items.map((item) => item.id);
    return (
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5 p-1">
          {items.map((item, index) => {
            const currentPath = [...path, index];
            const isSelected = selectedPath && JSON.stringify(selectedPath) === JSON.stringify(currentPath);
            return (
              <MenuEditorItem
                key={item.id}
                item={item}
                path={currentPath}
                isSelected={isSelected}
                onMove={moveItem}
                onDelete={deleteItem}
                onSelect={() => setSelectedPath(currentPath)}
                onToggleVisible={() => updateItemProperty(currentPath, { visible: !item.visible })}
              >
                {item.type === "group" && item.children && (
                  <div className="border-primary/20 bg-muted/20 ml-6 mt-1.5 rounded-md border-l-2 pb-1 pl-3">
                    {renderMenuItems(item.children, currentPath)}
                    {item.children.length === 0 && (
                      <div className="border-muted-foreground/30 text-muted-foreground mt-1 rounded border border-dashed py-2 text-center text-[10px] italic">
                        拖拽功能到此分组
                      </div>
                    )}
                  </div>
                )}
              </MenuEditorItem>
            );
          })}
        </div>
      </SortableContext>
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">右键菜单配置</h2>
          <p className="text-muted-foreground">配置全局右键菜单。支持跨层级拖拽，选中项可在右侧面板编辑属性和层级。</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetToDefault} variant="outline">
            <RotateCcw className="mr-2 size-4" />
            重置默认
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4 overflow-hidden pb-4">
        {/* Left Column: Toolbox */}
        <div className="bg-card col-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="shrink-0 border-b p-3">
            <h3 className="flex items-center font-semibold">
              <Plus className="mr-2 size-4" />
              功能池
            </h3>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
              <Input
                placeholder="搜索功能..."
                className="pl-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={addGroup}>
                <FolderPlus className="mr-1 size-3" />
                分组
              </Button>
              <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={addSeparator}>
                <MinusSquare className="mr-1 size-3" />
                分割线
              </Button>
            </div>
          </div>
          <ScrollArea className="h-0 flex-1">
            <div className="flex flex-col gap-1 p-2">
              {filteredKeyBinds.map((kb) => (
                <div
                  key={kb.id}
                  className="hover:bg-muted group flex cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-1.5"
                  onClick={() => addItem(kb.id)}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-xs font-medium">{kb.id}</span>
                    <span className="text-muted-foreground text-[10px]">{kb.key}</span>
                  </div>
                  <Plus className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Middle Column: Visual Editor */}
        <div className="bg-muted/10 col-span-6 flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="bg-card shrink-0 border-b p-3">
            <h3 className="font-semibold">菜单预览区</h3>
          </div>
          <ScrollArea className="h-0 flex-1 p-4">
            <div className="bg-popover text-popover-foreground mx-auto w-full max-w-sm rounded-lg border shadow-md">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {renderMenuItems(config)}
              </DndContext>
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Properties */}
        <div className="bg-card col-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="shrink-0 border-b p-3">
            <h3 className="font-semibold">属性设置</h3>
          </div>
          <ScrollArea className="h-0 flex-1">
            <div className="p-4">
              {selectedItem ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-muted-foreground text-xs">ID / 类型</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedItem.type}</Badge>
                      <span className="truncate text-sm font-medium">{selectedItem.id}</span>
                    </div>
                  </div>

                  {selectedItem.type !== "separator" && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label>显示名称</Label>
                        <Input
                          value={selectedItem.label || ""}
                          placeholder={selectedItem.id}
                          onChange={(e) => updateItemProperty(selectedPath!, { label: e.target.value })}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label>图标 (Lucide)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={selectedItem.icon || ""}
                            placeholder="例如: Copy"
                            onChange={(e) => updateItemProperty(selectedPath!, { icon: e.target.value })}
                          />
                          {selectedItem.icon && (
                            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
                              <DynamicIcon name={selectedItem.icon} className="size-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedItem.type === "group" && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label>布局方式</Label>
                        <Select
                          value={selectedItem.layout}
                          onValueChange={(val) => updateItemProperty(selectedPath!, { layout: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="row">行排列 (Row)</SelectItem>
                            <SelectItem value="grid">网格排列 (Grid)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedItem.layout === "grid" && (
                        <div className="flex flex-col gap-1.5">
                          <Label>列数</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={selectedItem.cols || 3}
                            onChange={(e) => updateItemProperty(selectedPath!, { cols: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <Separator className="my-2" />

                  <div className="flex flex-col gap-2">
                    <Label className="text-muted-foreground text-xs">层级与排序</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => moveItem(selectedPath!, "up")}
                      >
                        <ArrowUp className="mr-1 size-3" />
                        上移
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => moveItem(selectedPath!, "down")}
                      >
                        <ArrowDown className="mr-1 size-3" />
                        下移
                      </Button>
                    </div>
                    {selectedPath!.length > 1 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() => moveOutFromGroup(selectedPath!)}
                      >
                        <CornerUpLeft className="mr-1 size-3" />
                        移出当前分组
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground flex h-40 flex-col items-center justify-center text-center">
                  <Settings2 className="mb-2 size-8 opacity-20" />
                  <p className="text-sm">
                    在中间菜单树中点击项目
                    <br />
                    即可在此编辑属性
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function MenuEditorItem({ item, path, isSelected, onDelete, onSelect, onToggleVisible, children }: any) {
  const isSeparator = item.type === "separator";
  const isGroup = item.type === "group";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col">
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`group flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-all ${
          isDragging
            ? "bg-accent ring-primary/50 scale-[1.02] shadow-xl ring-2"
            : isSelected
              ? "bg-accent text-accent-foreground border-border"
              : "hover:bg-muted/50"
        } ${!item.visible ? "opacity-50" : ""}`}
      >
        <div
          className="text-muted-foreground/50 hover:text-foreground flex cursor-grab items-center justify-center active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {isSeparator ? (
            <div className="bg-border h-px flex-1" />
          ) : (
            <>
              <div className="flex size-5 items-center justify-center">
                {item.icon ? (
                  <DynamicIcon name={item.icon} className="size-3.5" />
                ) : (
                  <Type className="text-muted-foreground/50 size-3.5" />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between overflow-hidden">
                <span className="truncate text-sm">{item.label || item.id}</span>
                {isGroup && (
                  <span className="text-muted-foreground text-[10px] uppercase opacity-70">{item.layout}</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible();
            }}
          >
            {item.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-destructive/10 hover:text-destructive size-6 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(path);
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
