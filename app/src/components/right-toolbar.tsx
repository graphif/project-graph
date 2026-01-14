import { Settings, settingsSchema } from "@/core/service/Settings";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Button } from "./ui/button";
import { Toolbar } from "./ui/toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { Fragment } from "react";

/**
 * 单个快捷设置项按钮
 */
function QuickSettingButton({ settingKey }: { settingKey: keyof ReturnType<typeof settingsSchema._def.shape> }) {
  const { t } = useTranslation("settings");
  const [value, setValue] = useState<boolean>(Settings[settingKey] as boolean);

  useEffect(() => {
    const unwatch = Settings.watch(settingKey, (newValue) => {
      if (typeof newValue === "boolean") {
        setValue(newValue);
      }
    });
    return unwatch;
  }, [settingKey]);

  const handleToggle = () => {
    const currentValue = Settings[settingKey];
    if (typeof currentValue === "boolean") {
      // @ts-expect-error 设置值
      Settings[settingKey] = !currentValue;
    }
  };

  const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
  const title = t(`${settingKey}.title` as string);

  if (Icon === Fragment) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn("opacity-50 transition-opacity hover:opacity-100", value && "opacity-100")}
          variant="ghost"
          size="icon"
          onClick={handleToggle}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{title}</TooltipContent>
    </Tooltip>
  );
}

/**
 * 右侧工具栏
 * 显示用户自定义的快捷设置项开关
 */
export default function RightToolbar() {
  const [quickSettings, setQuickSettings] = useState<QuickSettingsManager.QuickSettingItem[]>([]);

  const loadQuickSettings = async () => {
    const items = await QuickSettingsManager.getQuickSettings();
    setQuickSettings(items);
  };

  useEffect(() => {
    // 加载快捷设置项列表
    loadQuickSettings();

    // 定期检查更新（每5秒）
    const interval = setInterval(() => {
      loadQuickSettings();
    }, 5000);

    // 监听窗口焦点事件，当窗口重新获得焦点时刷新
    const handleFocus = () => {
      loadQuickSettings();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <div className="absolute right-0 top-1/2 flex -translate-y-1/2 transform flex-col items-center justify-center">
      <Toolbar className="bg-popover/95 supports-backdrop-blur:bg-popover/80 border-border/50 flex-col gap-1 rounded-l-lg border-l px-1.5 py-2 shadow-xl backdrop-blur-md">
        {quickSettings.map((item) => (
          <QuickSettingButton key={item.settingKey as string} settingKey={item.settingKey} />
        ))}
      </Toolbar>
    </div>
  );
}
