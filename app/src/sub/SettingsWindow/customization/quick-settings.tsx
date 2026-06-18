import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Fragment } from "react";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";

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
 * 快捷设置项管理页面 — 仅提供顺序调整功能
 */
export default function QuickSettingsTab() {
  const { t } = useTranslation("settings");
  const [quickSettings, setQuickSettings] = useState<QuickSettingsManager.QuickSettingItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const items = await QuickSettingsManager.getQuickSettings();
    setQuickSettings(items);
  };

  const handleRemove = async (settingKey: string) => {
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
      </div>
    </div>
  );
}
