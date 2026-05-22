import { settingsSchema } from "@/core/service/Settings";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, ChevronRight } from "lucide-react";
import { categories, categoryIcons } from "../settings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * 设置类型标签
 */
function SettingTypeBadge({ type }: { type: QuickSettingsManager.SettingType }) {
  if (type === "boolean") {
    return <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">开关</span>;
  }
  if (type === "enum") {
    return <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">下拉</span>;
  }
  if (type === "number") {
    return <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-xs text-orange-400">数值</span>;
  }
  return null;
}

/**
 * 构建 settingKey -> { category, group } 的映射
 */
function buildSettingGroupMap(): Record<string, { category: string; group: string }> {
  const map: Record<string, { category: string; group: string }> = {};
  for (const [category, groups] of Object.entries(categories)) {
    for (const [group, keys] of Object.entries(groups)) {
      for (const key of keys) {
        map[key] = { category, group };
      }
    }
  }
  return map;
}

/**
 * 快捷设置项管理页面
 */
export default function QuickSettingsTab() {
  const { t } = useTranslation("settings");
  const [quickSettings, setQuickSettings] = useState<QuickSettingsManager.QuickSettingItem[]>([]);
  const [availableSettings, setAvailableSettings] = useState<Array<keyof typeof settingsSchema.shape>>([]);

  const settingGroupMap = useMemo(() => buildSettingGroupMap(), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const items = await QuickSettingsManager.getQuickSettings();
    setQuickSettings(items);

    const allSettings = QuickSettingsManager.getAllAvailableSettings();
    const currentKeys = new Set(items.map((it) => it.settingKey));
    const available = allSettings.filter((key) => !currentKeys.has(key));
    setAvailableSettings(available);
  };

  const handleAdd = async (settingKey: keyof typeof settingsSchema.shape) => {
    await QuickSettingsManager.addQuickSetting({ settingKey });
    await loadData();
  };

  const handleRemove = async (settingKey: keyof typeof settingsSchema.shape) => {
    await QuickSettingsManager.removeQuickSetting(settingKey);
    await loadData();
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...quickSettings];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await QuickSettingsManager.reorderQuickSettings(newOrder);
    await loadData();
  };

  const handleMoveDown = async (index: number) => {
    if (index === quickSettings.length - 1) return;
    const newOrder = [...quickSettings];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await QuickSettingsManager.reorderQuickSettings(newOrder);
    await loadData();
  };

  // 按 settings 分组整理可添加项
  const availableByGroup = useMemo(() => {
    const grouped: Record<string, Record<string, Array<keyof typeof settingsSchema.shape>>> = {};
    for (const settingKey of availableSettings) {
      const info = settingGroupMap[settingKey as string];
      if (!info) continue;
      const { category, group } = info;
      if (!grouped[category]) grouped[category] = {};
      if (!grouped[category][group]) grouped[category][group] = [];
      grouped[category][group].push(settingKey);
    }
    return grouped;
  }, [availableSettings, settingGroupMap]);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">快捷设置项管理</h2>
        <p className="text-muted-foreground text-sm">
          管理右侧工具栏中显示的快捷设置项。支持开关、下拉菜单、数值三种类型，鼠标悬停工具栏时展开控件。
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {/* 当前已添加的快捷设置项 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">当前快捷设置项</h3>
          {quickSettings.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无快捷设置项</p>
          ) : (
            <div className="space-y-1.5">
              {quickSettings.map((item, index) => {
                const settingKey = item.settingKey;
                const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
                const title = t(`${settingKey as string}.title` as string);
                const type = QuickSettingsManager.getSettingType(settingKey as string);

                return (
                  <div key={settingKey as string} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <GripVertical className="text-muted-foreground h-4 w-4 flex-shrink-0 cursor-move" />
                    {Icon !== Fragment ? (
                      <Icon className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-sm">{title}</span>
                    <SettingTypeBadge type={type} />
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === quickSettings.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-7 w-7"
                        onClick={() => handleRemove(settingKey)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 可添加的设置项，按设置分组展示（与设置页面一致） */}
        {Object.keys(availableByGroup).length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium">可添加的设置项</h3>

            {Object.entries(availableByGroup).map(([category, groups]) => {
              // @ts-expect-error fuck ts
              const CategoryIcon = categoryIcons[category]?.icon;
              return (
                <Collapsible key={category} defaultOpen className="group/collapsible">
                  <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-sm font-medium">
                    {CategoryIcon && <CategoryIcon className="h-4 w-4" />}
                    <span>{t(`categories.${category}.title`)}</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-3 pl-2">
                    {Object.entries(groups).map(([group, items]) => {
                      // @ts-expect-error fuck ts
                      const GroupIcon = categoryIcons[category]?.[group];
                      return (
                        <div key={group} className="space-y-1">
                          <div className="flex items-center gap-1.5 px-1 py-0.5">
                            {GroupIcon && <GroupIcon className="text-muted-foreground h-3.5 w-3.5" />}
                            <span className="text-muted-foreground text-xs">
                              {t(`categories.${category}.${group}`)}
                            </span>
                          </div>
                          <div className="space-y-1 pl-1">
                            {items.map((settingKey) => {
                              const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
                              const title = t(`${settingKey as string}.title` as string);
                              const type = QuickSettingsManager.getSettingType(settingKey as string);
                              return (
                                <div
                                  key={settingKey as string}
                                  className="flex items-center gap-2 rounded-lg border p-2.5"
                                >
                                  {Icon !== Fragment ? (
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                  ) : (
                                    <div className="h-4 w-4 flex-shrink-0" />
                                  )}
                                  <span className="flex-1 text-sm">{title}</span>
                                  <SettingTypeBadge type={type} />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleAdd(settingKey)}
                                  >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    添加
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
