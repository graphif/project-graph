import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { Settings, settingsSchema } from "@/core/service/Settings";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Telemetry } from "@/core/service/Telemetry";
import { cn } from "@/utils/cn";
import _ from "lodash";
import { ChevronRight, Pin, PinOff, RotateCw } from "lucide-react";
import React, { CSSProperties, Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function SettingField({ settingKey, extra = <></> }: { settingKey: keyof Settings; extra?: React.ReactNode }) {
  const [value, setValue] = React.useState<any>(Settings[settingKey]);
  const { t } = useTranslation("settings");
  const schema = settingsSchema.shape[settingKey];
  const [isPinned, setIsPinned] = useState(false);

  const loadPinnedState = useCallback(async () => {
    const items = await QuickSettingsManager.getQuickSettings();
    setIsPinned(items.some((it) => it.settingKey === settingKey));
  }, [settingKey]);

  useEffect(() => {
    if (QuickSettingsManager.isValidQuickSetting(settingKey as string)) {
      loadPinnedState();
    }
  }, [settingKey, loadPinnedState]);

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinned) {
      await QuickSettingsManager.removeQuickSetting(settingKey);
      setIsPinned(false);
    } else {
      await QuickSettingsManager.addQuickSetting({ settingKey });
      setIsPinned(true);
    }
  };

  const showPin = QuickSettingsManager.isValidQuickSetting(settingKey as string);

  React.useEffect(() => {
    if (value !== Settings[settingKey]) {
      // @ts-expect-error 不知道为什么Settings[settingKey]可能是never
      Settings[settingKey] = value;
      postTelemetryEvent();
    }
  }, [value]);

  const postTelemetryEvent = _.debounce(() => {
    if (settingKey === "aiApiKey") return;
    Telemetry.event("修改设置", {
      key: settingKey,
      value,
    });
  }, 1000);

  // @ts-expect-error fuck ts
  const Icon = settingsIcons[settingKey] ?? Fragment;

  // 解包 ZodDefault 拿到 innerType 和 defaultValue
  // Zod v4: _def.typeName 已废弃，改用 _def.type（值为小写，如 "boolean"/"number"/"string"/"union"）
  const innerType = (schema as any)._def.innerType;
  const innerTypeName: string = innerType._def.type ?? "";
  const bag = innerType._zod?.bag ?? {};

  return (
    <Field
      title={t(`${settingKey}.title`)}
      description={t(`${settingKey}.description`, { defaultValue: "" })}
      icon={<Icon />}
      className="border-accent hover:bg-accent border-b transition not-hover:rounded-none"
      titleExtra={
        showPin && (
          <Tooltip>
            <TooltipTrigger asChild>
              {isPinned ? (
                <Pin className="h-4 w-4 cursor-pointer" onClick={handlePinToggle} />
              ) : (
                <PinOff className="h-4 w-4 cursor-pointer opacity-30 hover:opacity-70" onClick={handlePinToggle} />
              )}
            </TooltipTrigger>
            <TooltipContent>{t(isPinned ? "pin.tooltipUnpin" : "pin.tooltipPin")}</TooltipContent>
          </Tooltip>
        )
      }
    >
      <RotateCw
        className="text-panel-details-text h-4 w-4 cursor-pointer opacity-0 group-hover/field:opacity-100 hover:rotate-180"
        onClick={() => setValue((schema as any)._def.defaultValue)}
      />
      {extra}
      {innerTypeName === "string" ? (
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-64" />
      ) : innerTypeName === "number" && bag.minimum !== undefined && bag.maximum !== undefined ? (
        <>
          <Slider
            value={[value]}
            onValueChange={([v]) => setValue(v)}
            min={bag.minimum}
            max={bag.maximum}
            step={bag.format === "safeint" ? 1 : 0.01}
            className="w-48"
          />
          <Input
            value={value}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              if (Number.isNaN(parsed)) return;
              const min = bag.minimum;
              const max = bag.maximum;
              if (parsed < min) {
                toast.warning(`最小值为 ${min}，已自动修正`, { id: `field-clamp-${settingKey}`, duration: 2000 });
              } else if (parsed > max) {
                toast.warning(`最大值为 ${max}，已自动修正`, { id: `field-clamp-${settingKey}`, duration: 2000 });
              }
              setValue(Math.min(max, Math.max(min, parsed)));
            }}
            type="number"
            min={bag.minimum}
            max={bag.maximum}
            step={bag.format === "safeint" ? 1 : 0.01}
            className="w-24"
          />
        </>
      ) : innerTypeName === "number" ? (
        <Input value={value} onChange={(e) => setValue(e.target.valueAsNumber)} type="number" className="w-32" />
      ) : innerTypeName === "boolean" ? (
        <Switch checked={value} onCheckedChange={setValue} />
      ) : innerTypeName === "union" ? (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {innerType._def.options.map((opt: any) => {
              const it = opt._def.values?.[0] ?? opt._def.value;
              return (
                <SelectItem key={it} value={it}>
                  {t(`${settingKey}.options.${it}`)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : innerTypeName === "tuple" ? (
        <input
          type="color"
          value={`#${(value[0] as number).toString(16).padStart(2, "0")}${(value[1] as number).toString(16).padStart(2, "0")}${(value[2] as number).toString(16).padStart(2, "0")}`}
          onChange={(e) => {
            const hex = e.target.value;
            setValue([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
          }}
          className="h-8 w-10 cursor-pointer rounded border"
        />
      ) : (
        <>unknown type</>
      )}
    </Field>
  );
}
export function ButtonField({
  title,
  description = "",
  label = "",
  disabled = false,
  onClick = () => {},
  icon = <></>,
}: {
  title: string;
  description?: string;
  label?: string;
  disabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Field title={title} description={description} icon={icon}>
      <Button disabled={disabled} onClick={onClick}>
        {label}
      </Button>
    </Field>
  );
}

const fieldColors = {
  default: "hover:bg-field-group-hover-bg",
  celebrate: "border-2 border-green-500/20 hover:bg-green-500/25",
  danger: "border-2 border-red-500/20 hover:bg-red-500/25",
  warning: "border-2 border-yellow-500/20 hover:bg-yellow-500/25",
  thinking: "border-2 border-blue-500/20 hover:bg-blue-500/25",
  imaging: "border-2 border-purple-500/20 hover:bg-purple-500/25",
};

/**
 * 每一个设置段
 * @param param0
 * @returns
 */
export function Field({
  title = "",
  description = "",
  children = <></>,
  extra = <></>,
  color = "default",
  icon = <></>,
  className = "",
  style = {},
  onClick = () => {},
  titleExtra,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  extra?: React.ReactNode;
  color?: "default" | "celebrate" | "danger" | "warning" | "thinking" | "imaging";
  icon?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  titleExtra?: React.ReactNode;
}) {
  return (
    <div
      className={cn("group/field flex w-full flex-col items-start gap-2 rounded-xl p-4", fieldColors[color], className)}
      style={style}
      onClick={onClick}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1">
              {title}
              {titleExtra}
            </span>
            <span className="text-panel-details-text text-xs font-light opacity-60">
              {description.split("\n").map((dd, ii) => (
                <p key={ii} className="text-xs">
                  {dd}
                </p>
              ))}
            </span>
          </div>
        </div>
        <div className="flex-1"></div>
        {children}
      </div>
      {extra}
    </div>
  );
}

/**
 * 用于给各种设置项提供一个分类组
 * @param param0
 * @returns
 */
export function FieldGroup({
  title = "",
  icon = null,
  children = null,
  className = "",
  description = "",
}: {
  title?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  description?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState<number | string>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setAnimating] = useState(false);
  const [shouldMount, setShouldMount] = useState(isOpen);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (isOpen) setHeight(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setHeight(0);
      return;
    }

    requestAnimationFrame(() => {
      const el = innerRef.current;
      if (el) setHeight(el.offsetHeight);
    });
  }, [isOpen]);

  const handleToggle = () => {
    setAnimating(true);
    const next = !isOpen;
    setIsOpen(next);

    if (next) {
      setShouldMount(true); // 展开：立即挂载
    } else {
      setTimeout(() => {
        // 折叠：动画后再卸载
        setShouldMount(false);
      }, 250);
    }
    setTimeout(() => setAnimating(false), 500);
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div
        className="text-settings-text my-2 flex cursor-pointer items-center gap-2 pt-4 pl-4 text-sm opacity-60 hover:opacity-100"
        onClick={handleToggle}
      >
        <span>{icon}</span>
        <span>{title}</span>
        <ChevronRight className={cn(isOpen && "rotate-90")} />
      </div>

      {description && isOpen && <div className="text-panel-details-text pl-4 text-xs">{description}</div>}

      <div ref={contentRef} className="overflow-hidden rounded-xl transition-all" style={{ height }}>
        {shouldMount && (
          <div
            ref={innerRef}
            className={cn("transition-all", !isOpen && !isAnimating && "pointer-events-none opacity-0")}
          >
            <div className="bg-field-group-bg group/field-group">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}
