import { Settings, settingsSchema } from "@/core/service/Settings";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Toolbar } from "./ui/toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { Fragment } from "react";
import { useAtom } from "jotai";
import { isClassroomModeAtom } from "@/state";

/**
 * Boolean 类型的快捷设置项
 */
function BooleanQuickSettingControl({
  settingKey,
  isHovered,
}: {
  settingKey: keyof ReturnType<typeof settingsSchema._def.shape>;
  isHovered: boolean;
}) {
  const [value, setValue] = useState<boolean>(Settings[settingKey] as boolean);

  useEffect(() => {
    const unwatch = Settings.watch(settingKey, (newValue) => {
      if (typeof newValue === "boolean") setValue(newValue);
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

  return (
    <div
      className={cn("overflow-hidden transition-all duration-200", isHovered ? "w-10 opacity-100" : "w-0 opacity-0")}
    >
      <Switch checked={value} onCheckedChange={handleToggle} />
    </div>
  );
}

/**
 * Enum 类型的快捷设置项（下拉菜单）
 */
function EnumQuickSettingControl({
  settingKey,
  isHovered,
}: {
  settingKey: keyof ReturnType<typeof settingsSchema._def.shape>;
  isHovered: boolean;
}) {
  const { t } = useTranslation("settings");
  const [value, setValue] = useState<string>(Settings[settingKey] as string);
  const options = QuickSettingsManager.getEnumOptions(settingKey as string);

  useEffect(() => {
    const unwatch = Settings.watch(settingKey, (newValue) => {
      if (typeof newValue === "string") setValue(newValue);
    });
    return unwatch;
  }, [settingKey]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    // @ts-expect-error 设置值
    Settings[settingKey] = newValue;
  };

  return (
    <div
      className={cn("overflow-hidden transition-all duration-200", isHovered ? "w-28 opacity-100" : "w-0 opacity-0")}
    >
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="h-7 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {t(`${settingKey as string}.options.${opt}`, { defaultValue: opt })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Number 类型的快捷设置项（滑块 或 数字输入框）
 */
function NumberQuickSettingControl({
  settingKey,
  isHovered,
}: {
  settingKey: keyof ReturnType<typeof settingsSchema._def.shape>;
  isHovered: boolean;
}) {
  const [value, setValue] = useState<number>(Settings[settingKey] as number);
  const { min, max, step, hasRange } = QuickSettingsManager.getNumberRange(settingKey as string);

  useEffect(() => {
    const unwatch = Settings.watch(settingKey, (newValue) => {
      if (typeof newValue === "number") setValue(newValue);
    });
    return unwatch;
  }, [settingKey]);

  const handleChange = (newValue: number) => {
    setValue(newValue);
    // @ts-expect-error 设置值
    Settings[settingKey] = newValue;
  };

  if (hasRange && min !== null && max !== null) {
    // 有范围：展示 Slider + 数值 badge
    const displayValue = step >= 1 ? String(value) : value.toFixed(2);
    return (
      <div className={cn("transition-all duration-200", isHovered ? "max-w-36 opacity-100" : "max-w-0 opacity-0")}>
        <div className="flex w-36 items-center gap-1.5 py-1 pr-1">
          <Slider
            value={[value]}
            onValueChange={([v]) => handleChange(v)}
            min={min}
            max={max}
            step={step}
            className="w-24 flex-shrink-0"
          />
          <span className="text-muted-foreground w-10 flex-shrink-0 text-right text-xs tabular-nums">
            {displayValue}
          </span>
        </div>
      </div>
    );
  }

  // 无范围：展示数字输入框
  return (
    <div
      className={cn("overflow-hidden transition-all duration-200", isHovered ? "w-20 opacity-100" : "w-0 opacity-0")}
    >
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const parsed = e.target.valueAsNumber;
          if (!Number.isNaN(parsed)) handleChange(parsed);
        }}
        className="h-7 w-20 text-xs"
      />
    </div>
  );
}

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
  const [showDialog, setShowDialog] = useState(false);
  const settingType = QuickSettingsManager.getSettingType(settingKey as string);

  // Boolean 类型用于图标 opacity 动态显示
  const [boolValue, setBoolValue] = useState<boolean>(
    settingType === "boolean" ? (Settings[settingKey] as boolean) : false,
  );

  useEffect(() => {
    if (settingType !== "boolean") return;
    const unwatch = Settings.watch(settingKey, (newValue) => {
      if (typeof newValue === "boolean") setBoolValue(newValue);
    });
    return unwatch;
  }, [settingKey, settingType]);

  const Icon = settingsIcons[settingKey as keyof typeof settingsIcons] ?? Fragment;
  const title = t(`${settingKey as string}.title` as string);
  const description = t(`${settingKey as string}.description` as string);

  if (Icon === Fragment) return null;

  // 图标 opacity：boolean 用 on/off 状态；enum/number 始终半透明
  const iconOpacityClass =
    settingType === "boolean"
      ? cn("opacity-50 transition-opacity hover:opacity-100", boolValue && "opacity-100")
      : "opacity-70 transition-opacity hover:opacity-100";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Button className={iconOpacityClass} variant="ghost" size="icon" onClick={() => setShowDialog(true)}>
              <Icon />
            </Button>

            {/* 根据类型展示不同控件 */}
            {settingType === "boolean" && <BooleanQuickSettingControl settingKey={settingKey} isHovered={isHovered} />}
            {settingType === "enum" && <EnumQuickSettingControl settingKey={settingKey} isHovered={isHovered} />}
            {settingType === "number" && <NumberQuickSettingControl settingKey={settingKey} isHovered={isHovered} />}
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
 * 显示用户自定义的快捷设置项（支持开关、下拉菜单、数值调整）
 */
export default function RightToolbar() {
  const [quickSettings, setQuickSettings] = useState<QuickSettingsManager.QuickSettingItem[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isClassroomMode] = useAtom(isClassroomModeAtom);

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
    <div
      className={cn(
        "absolute right-2 top-1/2 flex -translate-y-1/2 transform flex-col items-center justify-center transition-all hover:opacity-100",
        isClassroomMode && "opacity-0",
      )}
    >
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
