import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Settings, settingsSchema } from "@/core/service/Settings";
import { KeyBindsUI } from "@/core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { allKeyBinds as staticKeyBinds } from "@/core/service/controlService/shortcutKeysEngine/shortcutKeysRegister";
import {
  ArrowDown,
  ArrowLeftFromLine,
  ArrowUp,
  Eye,
  EyeOff,
  FilePlus,
  FolderPlus,
  MinusSquare,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type MenuNodeType =
  | "topMenu"
  | "item"
  | "separator"
  | "sub"
  | "recentFiles"
  | "versionInfo"
  | "unstableVersionBanner"
  | "devMenu"
  | "featureFlagsList";

type MenuNode = {
  type: MenuNodeType;
  id: string;
  label?: string;
  icon?: string;
  visible?: boolean;
  children?: MenuNode[];
};

type FlatRow = {
  item: MenuNode;
  path: number[];
  depth: number;
};

const CHILD_NODE_TYPES: MenuNodeType[] = [
  "item",
  "separator",
  "sub",
  "recentFiles",
  "versionInfo",
  "unstableVersionBanner",
  "devMenu",
  "featureFlagsList",
];

const specialNodes: Array<Pick<MenuNode, "type" | "id" | "label" | "icon">> = [
  { type: "recentFiles", id: "recentFilesEntries", label: "最近打开文件列表", icon: "FileClock" },
  { type: "versionInfo", id: "versionInfo", label: "版本信息", icon: "Info" },
  {
    type: "unstableVersionBanner",
    id: "unstableVersionBanner",
    label: "不稳定版本提示",
    icon: "TriangleAlert",
  },
  { type: "devMenu", id: "dynamicEntries", label: "开发者动态菜单", icon: "Code" },
  { type: "featureFlagsList", id: "featureFlagsList", label: "功能开关列表", icon: "ListChecks" },
];

function cloneConfig(config: unknown): MenuNode[] {
  return JSON.parse(JSON.stringify(config ?? []));
}

function pathKey(path: number[] | null | undefined) {
  return path?.join("/") ?? "";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isContainer(item: MenuNode | null | undefined): item is MenuNode {
  return item?.type === "topMenu" || item?.type === "sub";
}

function isEditableLabel(item: MenuNode) {
  return item.type !== "separator";
}

function normalizeNode(node: MenuNode): MenuNode | null {
  const normalized: MenuNode = { ...node };
  if (normalized.visible === undefined) normalized.visible = true;

  if (normalized.type === "topMenu" || normalized.type === "sub") {
    normalized.children = (normalized.children ?? [])
      .map((child) => normalizeNode(child))
      .filter(Boolean) as MenuNode[];
  } else {
    delete normalized.children;
  }

  return normalized;
}

function normalizeConfig(config: MenuNode[]) {
  return config.map((item) => normalizeNode(item)).filter(Boolean) as MenuNode[];
}

function flattenTree(items: MenuNode[], path: number[] = [], depth = 0): FlatRow[] {
  return items.flatMap((item, index) => {
    const currentPath = [...path, index];
    const current = { item, path: currentPath, depth };
    return [current, ...flattenTree(item.children ?? [], currentPath, depth + 1)];
  });
}

function getListByParentPath(draft: MenuNode[], parentPath: number[]) {
  let list = draft;
  for (const index of parentPath) {
    const parent = list[index];
    if (!isContainer(parent)) return null;
    parent.children ??= [];
    list = parent.children;
  }
  return list;
}

function getItemByPath(config: MenuNode[], path: number[] | null) {
  if (!path?.length) return null;
  const list = getListByParentPath(config, path.slice(0, -1));
  return list?.[path[path.length - 1]] ?? null;
}

function getContainerPath(config: MenuNode[], selectedPath: number[] | null): number[] | null {
  const firstTopMenuIndex = config.findIndex((item) => item.type === "topMenu");
  if (firstTopMenuIndex === -1) return null;
  const selected = getItemByPath(config, selectedPath);
  if (isContainer(selected)) return selectedPath;
  if (selectedPath && selectedPath.length > 1) return selectedPath.slice(0, -1);
  return [firstTopMenuIndex];
}

function pathExists(config: MenuNode[], path: number[] | null) {
  return !!getItemByPath(config, path);
}

export default function GlobalMenuPage() {
  const [rawConfig, setConfig] = Settings.use("globalMenuConfig");
  const config = useMemo(() => normalizeConfig(rawConfig as MenuNode[]), [rawConfig]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null);
  const { t } = useTranslation("keyBinds");

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

  useEffect(() => {
    if (selectedPath && !pathExists(config, selectedPath)) setSelectedPath(null);
  }, [config, selectedPath]);

  const getTitle = useCallback((id: string, label?: string) => label || t(`${id}.title`, { defaultValue: id }), [t]);

  const saveConfig = useCallback(
    (newConfig: MenuNode[]) => {
      setConfig(normalizeConfig(newConfig) as any);
    },
    [setConfig],
  );

  const selectedItem = getItemByPath(config, selectedPath);
  const targetContainerPath = getContainerPath(config, selectedPath);
  const targetContainer = getItemByPath(config, targetContainerPath);

  const filteredKeyBinds = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    return allKeyBinds.filter((kb) => {
      const title = getTitle(kb.id).toLowerCase();
      return kb.id.toLowerCase().includes(text) || title.includes(text);
    });
  }, [allKeyBinds, getTitle, searchTerm]);

  const rows = useMemo(() => flattenTree(config), [config]);

  const updateItem = (path: number[], updates: Partial<MenuNode>) => {
    const draft = cloneConfig(config);
    const list = getListByParentPath(draft, path.slice(0, -1));
    if (!list?.[path[path.length - 1]]) return;
    list[path[path.length - 1]] = { ...list[path[path.length - 1]], ...updates };
    saveConfig(draft);
  };

  const addTopMenu = () => {
    const draft = cloneConfig(config);
    draft.push({ type: "topMenu", id: createId("top"), label: "新菜单", visible: true, children: [] });
    saveConfig(draft);
    setSelectedPath([draft.length - 1]);
    toast.success("已添加顶层菜单");
  };

  const appendToTargetContainer = (node: MenuNode) => {
    const containerPath = getContainerPath(config, selectedPath);
    if (!containerPath) {
      toast.error("请先创建一个顶层菜单");
      return;
    }
    const draft = cloneConfig(config);
    const list = getListByParentPath(draft, containerPath);
    if (!list) return;
    list.push({ ...node, visible: node.visible ?? true });
    saveConfig(draft);
    setSelectedPath([...containerPath, list.length - 1]);
    toast.success("已添加到菜单容器");
  };

  const deleteItem = (path: number[]) => {
    const draft = cloneConfig(config);
    const list = getListByParentPath(draft, path.slice(0, -1));
    if (!list) return;
    list.splice(path[path.length - 1], 1);
    saveConfig(draft);
    setSelectedPath(null);
  };

  const moveItem = (path: number[], direction: "up" | "down") => {
    const draft = cloneConfig(config);
    const list = getListByParentPath(draft, path.slice(0, -1));
    if (!list) return;
    const index = path[path.length - 1];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    saveConfig(draft);
    setSelectedPath([...path.slice(0, -1), target]);
  };

  const moveOut = (path: number[]) => {
    if (path.length <= 2) return;
    const draft = cloneConfig(config);
    const parentPath = path.slice(0, -1);
    const grandParentPath = parentPath.slice(0, -1);
    const parentIndex = parentPath[parentPath.length - 1];
    const parentList = getListByParentPath(draft, parentPath);
    const grandParentList = getListByParentPath(draft, grandParentPath);
    if (!parentList || !grandParentList) return;
    const [item] = parentList.splice(path[path.length - 1], 1);
    grandParentList.splice(parentIndex + 1, 0, item);
    saveConfig(draft);
    setSelectedPath([...grandParentPath, parentIndex + 1]);
  };

  const resetToDefault = () => {
    const defaultVal = settingsSchema.shape.globalMenuConfig.parse(undefined) as MenuNode[];
    saveConfig(defaultVal);
    setSelectedPath(null);
    toast.success("已重置为默认菜单栏");
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">菜单栏配置</h2>
          <p className="text-muted-foreground">
            根节点只能是顶层菜单；功能项、子菜单和特殊节点只会添加到当前选中容器中。
          </p>
        </div>
        <Button onClick={resetToDefault} variant="outline">
          <RotateCcw className="mr-2 size-4" />
          重置默认
        </Button>
      </div>

      <Separator />

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4 overflow-hidden pb-4">
        <div className="bg-card col-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="shrink-0 border-b p-3">
            <h3 className="flex items-center font-semibold">
              <Plus className="mr-2 size-4" />
              功能池
            </h3>
            <div className="text-muted-foreground bg-muted/60 mt-2 rounded-md p-2 text-xs">
              当前插入到：{targetContainer ? getTitle(targetContainer.id, targetContainer.label) : "未创建顶层菜单"}
            </div>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                placeholder="搜索功能..."
                className="pl-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" className="text-xs" onClick={addTopMenu}>
                <FilePlus className="mr-1 size-3" />
                顶层
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() =>
                  appendToTargetContainer({
                    type: "sub",
                    id: createId("sub"),
                    label: "子菜单",
                    visible: true,
                    children: [],
                  })
                }
              >
                <FolderPlus className="mr-1 size-3" />
                子菜单
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() => appendToTargetContainer({ type: "separator", id: createId("sep"), visible: true })}
              >
                <MinusSquare className="mr-1 size-3" />
                分割线
              </Button>
            </div>
          </div>
          <ScrollArea className="h-0 flex-1">
            <div className="flex flex-col gap-1 p-2">
              {specialNodes.map((node) => (
                <ToolboxRow
                  key={node.id}
                  title={node.label || node.id}
                  subtitle={node.type}
                  onClick={() => appendToTargetContainer({ ...node, visible: true })}
                />
              ))}
              <Separator className="my-2" />
              {filteredKeyBinds.map((kb) => (
                <ToolboxRow
                  key={kb.id}
                  title={getTitle(kb.id)}
                  subtitle={kb.key || kb.id}
                  onClick={() => appendToTargetContainer({ type: "item", id: kb.id, visible: true })}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="bg-muted/10 col-span-6 flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="bg-card shrink-0 border-b p-3">
            <h3 className="font-semibold">菜单树</h3>
          </div>
          <ScrollArea className="h-0 flex-1 p-4">
            <div className="space-y-1">
              {rows.length === 0 ? (
                <div className="text-muted-foreground flex h-40 flex-col items-center justify-center rounded-lg border border-dashed text-sm">
                  还没有顶层菜单，请先从左侧添加。
                </div>
              ) : (
                rows.map(({ item, path, depth }) => (
                  <MenuTreeRow
                    key={pathKey(path)}
                    item={item}
                    path={path}
                    depth={depth}
                    selected={pathKey(selectedPath) === pathKey(path)}
                    getTitle={getTitle}
                    onSelect={() => setSelectedPath(path)}
                    onToggleVisible={() => updateItem(path, { visible: item.visible === false })}
                    onDelete={() => deleteItem(path)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="bg-card col-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="shrink-0 border-b p-3">
            <h3 className="font-semibold">属性设置</h3>
          </div>
          <ScrollArea className="h-0 flex-1">
            <div className="p-4">
              {selectedItem && selectedPath ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-muted-foreground text-xs">标题 / 类型</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedItem.type}</Badge>
                      <span className="truncate text-sm font-medium">
                        {selectedItem.type === "separator" ? "分割线" : getTitle(selectedItem.id, selectedItem.label)}
                      </span>
                    </div>
                  </div>

                  {isEditableLabel(selectedItem) && (
                    <div className="flex flex-col gap-1.5">
                      <Label>显示名称</Label>
                      <Input
                        value={selectedItem.label || ""}
                        placeholder={getTitle(selectedItem.id)}
                        onChange={(e) => updateItem(selectedPath, { label: e.target.value || undefined })}
                      />
                    </div>
                  )}

                  {selectedItem.type !== "separator" && (
                    <div className="flex flex-col gap-1.5">
                      <Label>图标名（Lucide）</Label>
                      <Input
                        value={selectedItem.icon || ""}
                        placeholder="File / Settings / FolderOpen"
                        onChange={(e) => updateItem(selectedPath, { icon: e.target.value || undefined })}
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="flex flex-col gap-2">
                    <Label className="text-muted-foreground text-xs">排序与层级</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => moveItem(selectedPath, "up")}
                      >
                        <ArrowUp className="mr-1 size-3" />
                        上移
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => moveItem(selectedPath, "down")}
                      >
                        <ArrowDown className="mr-1 size-3" />
                        下移
                      </Button>
                    </div>
                    {selectedPath.length > 2 && (
                      <Button size="sm" variant="secondary" onClick={() => moveOut(selectedPath)}>
                        <ArrowLeftFromLine className="mr-1 size-3" />
                        移出当前子菜单
                      </Button>
                    )}
                  </div>

                  {selectedItem.type === "topMenu" && (
                    <div className="text-muted-foreground bg-muted/60 rounded-md p-2 text-xs">
                      顶层菜单只能位于根级。选择它后，左侧新增功能会作为它的子项插入。
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-40 flex-col items-center justify-center text-center">
                  <Settings2 className="mb-2 size-8 opacity-20" />
                  <p className="text-sm">点击中间菜单树中的项目来编辑属性</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function ToolboxRow({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <div
      className="hover:bg-muted group flex cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-1.5"
      onClick={onClick}
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{title}</span>
        <span className="text-muted-foreground truncate text-[10px]">{subtitle}</span>
      </div>
      <Plus className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function MenuTreeRow({
  item,
  depth,
  selected,
  onSelect,
  getTitle,
  onToggleVisible,
  onDelete,
}: {
  item: MenuNode;
  path: number[];
  depth: number;
  selected: boolean;
  onSelect: () => void;
  getTitle: (id: string, label?: string) => string;
  onToggleVisible: () => void;
  onDelete: () => void;
}) {
  const canHaveChildren = isContainer(item);
  const isValidChildType = depth === 0 ? item.type === "topMenu" : CHILD_NODE_TYPES.includes(item.type);

  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
        selected ? "bg-accent border-border" : "hover:bg-muted/50 border-transparent"
      } ${item.visible === false ? "opacity-50" : ""} ${!isValidChildType ? "border-destructive/50" : ""}`}
      style={{ paddingLeft: 8 + depth * 18 }}
      onClick={onSelect}
    >
      <Type className="text-muted-foreground size-3.5 shrink-0" />
      <Badge variant="outline" className="text-[10px]">
        {item.type}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-sm">
        {item.type === "separator" ? "分割线" : getTitle(item.id, item.label)}
      </span>
      {canHaveChildren && <span className="text-muted-foreground text-[10px]">{item.children?.length || 0}</span>}
      <Button
        variant="ghost"
        size="icon"
        className="size-6 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
      >
        {item.visible === false ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-destructive/10 hover:text-destructive size-6 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}
