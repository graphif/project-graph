import { settingsSchema } from "@/core/service/Settings";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Fragment } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";

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
 * 快捷设置项管理页面
 */
export default function QuickSettingsTab() {
  const { t } = useTranslation("settings");
  const [quickSettings, setQuickSettings] = useState<QuickSettingsManager.QuickSettingItem[]>([]);
  const [availableSettings, setAvailableSettings] = useState<Array<keyof ReturnType<typeof settingsSchema._def.shape>>>(
    [],
  );

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

  const handleAdd = async (settingKey: keyof ReturnType<typeof settingsSchema._def.shape>) => {
    await QuickSettingsManager.addQuickSetting({ settingKey });
    await loadData();
  };

  const handleRemove = async (settingKey: keyof ReturnType<typeof settingsSchema._def.shape>) => {
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

  // 按类型对可添加项分组
  const availableByType = {
    boolean: availableSettings.filter((k) => QuickSettingsManager.getSettingType(k as string) === "boolean"),
    enum: availableSettings.filter((k) => QuickSettingsManager.getSettingType(k as string) === "enum"),
    number: availableSettings.filter((k) => QuickSettingsManager.getSettingType(k as string) === "number"),
  };

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

        {/* 可添加的设置项，按类型分组展示 */}
        {availableSettings.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium">可添加的设置项</h3>

            {(
              [
                { key: "boolean" as const, label: "开关型", badgeClass: "bg-blue-500/20 text-blue-400" },
                { key: "enum" as const, label: "下拉菜单型", badgeClass: "bg-purple-500/20 text-purple-400" },
                { key: "number" as const, label: "数值调整型", badgeClass: "bg-orange-500/20 text-orange-400" },
              ] as const
            ).map(({ key, label, badgeClass }) => {
              const items = availableByType[key];
              if (items.length === 0) return null;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", badgeClass)}>{label}</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((settingKey) => {
                      const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
                      const title = t(`${settingKey as string}.title` as string);

                      return (
                        <div key={settingKey as string} className="flex items-center gap-2 rounded-lg border p-2.5">
                          {Icon !== Fragment ? (
                            <Icon className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="flex-1 text-sm">{title}</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
