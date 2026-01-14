import { Settings, settingsSchema } from "@/core/service/Settings";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Toolbar } from "./ui/toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { Fragment } from "react";

/**
 * 单个快捷设置项按钮
 */
function QuickSettingButton({
  settingKey,
  isHovered,
}: {
  settingKey: keyof ReturnType<typeof settingsSchema._def.shape>;
  isHovered: boolean;
}) {
  const { t } = useTranslation("settings");
  const [value, setValue] = useState<boolean>(Settings[settingKey] as boolean);
  const [showDialog, setShowDialog] = useState(false);

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

  const handleIconClick = () => {
    setShowDialog(true);
  };

  const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
  const title = t(`${settingKey}.title` as string);
  const description = t(`${settingKey}.description` as string);

  if (Icon === Fragment) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Button
              className={cn("opacity-50 transition-opacity hover:opacity-100", value && "opacity-100")}
              variant="ghost"
              size="icon"
              onClick={handleIconClick}
            >
              <Icon />
            </Button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                isHovered ? "w-10 opacity-100" : "w-0 opacity-0",
              )}
            >
              <Switch checked={value} onCheckedChange={handleToggle} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">{title}</TooltipContent>
      </Tooltip>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription className="pt-2">{description}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 右侧工具栏
 * 显示用户自定义的快捷设置项开关
 */
export default function RightToolbar() {
  const [quickSettings, setQuickSettings] = useState<QuickSettingsManager.QuickSettingItem[]>([]);
  const [isHovered, setIsHovered] = useState(false);

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
    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 transform flex-col items-center justify-center">
      <Toolbar
        className="bg-popover/95 supports-backdrop-blur:bg-popover/80 border-border/50 flex-col gap-0.5 rounded-lg border px-1 py-1.5 shadow-xl backdrop-blur-md"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {quickSettings.map((item) => (
          <QuickSettingButton key={item.settingKey as string} settingKey={item.settingKey} isHovered={isHovered} />
        ))}
      </Toolbar>
    </div>
  );
}
