import { settingsSchema } from "@/core/service/Settings";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Fragment } from "react";
import { GripVertical, Plus, Trash2, CircleQuestionMark } from "lucide-react";

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

    const allBooleanSettings = QuickSettingsManager.getAllAvailableBooleanSettings();
    const currentKeys = new Set(items.map((it) => it.settingKey));
    const available = allBooleanSettings.filter((key) => !currentKeys.has(key));
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

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">快捷设置项管理</h2>
        <p className="text-muted-foreground text-sm">管理右侧工具栏中显示的快捷设置项。您可以添加、删除和调整顺序。</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">当前快捷设置项</h3>
          {quickSettings.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无快捷设置项</p>
          ) : (
            <div className="space-y-2">
              {quickSettings.map((item, index) => {
                const settingKey = item.settingKey;
                const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
                const title = t(`${settingKey}.title` as string);

                return (
                  <div key={settingKey as string} className="flex items-center gap-2 rounded-lg border p-3">
                    <GripVertical className="text-muted-foreground h-4 w-4 cursor-move" />
                    {Icon !== Fragment ? <CircleQuestionMark className="h-4 w-4" /> : <div className="h-4 w-4" />}
                    <span className="flex-1 text-sm">{title}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === quickSettings.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => handleRemove(settingKey)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {availableSettings.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium">可添加的设置项</h3>
            <div className="space-y-2">
              {availableSettings.map((settingKey) => {
                const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
                const title = t(`${settingKey}.title` as string);

                return (
                  <div key={settingKey as string} className="flex items-center gap-2 rounded-lg border p-3">
                    {Icon !== Fragment ? <CircleQuestionMark className="h-4 w-4" /> : <div className="h-4 w-4" />}
                    <span className="flex-1 text-sm">{title}</span>
                    <Button variant="outline" size="sm" onClick={() => handleAdd(settingKey)}>
                      <Plus className="mr-1 h-4 w-4" />
                      添加
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
