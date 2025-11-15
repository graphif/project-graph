import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Settings, settingsSchema } from "@/core/service/Settings";
import { settingsIcons } from "@/core/service/SettingsIcons";
import { Telemetry } from "@/core/service/Telemetry";
import { cn } from "@/utils/cn";
import _ from "lodash";
import { ChevronRight, RotateCw } from "lucide-react";
import React, { CSSProperties, Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function SettingField({ settingKey, extra = <></> }: { settingKey: keyof Settings; extra?: React.ReactNode }) {
  const [value, setValue] = React.useState<any>(Settings[settingKey]);
  const { t, i18n } = useTranslation("settings");
  const schema = settingsSchema.shape[settingKey];
  const languages = useMemo(() => {
    if (settingKey !== "language") return [];
    if (!i18n.options.supportedLngs) return [];
    // 获取完成度
    // 先获取zh_CN的所有key，然后对比其他语言的key，算出完成度
    const zhCNKeys = new Set<string>();
    const zhCN = i18n.options.resources!.zh_CN;
    // 遍历zh_CN的所有key
    Object.keys(zhCN).forEach((ns) => {
      const traverse = (obj: any, prefix = "") => {
        Object.keys(obj).forEach((key) => {
          const value = obj[key];
          if (typeof value === "string") {
            zhCNKeys.add(prefix + key);
          } else if (typeof value === "object") {
            traverse(value, prefix + key + ".");
          }
        });
      };
      traverse(zhCN[ns]);
    });
    return i18n.options.supportedLngs
      .filter((it) => it != "cimode")
      .map((lng) => {
        // 计算完成度
        const computeCompleteness = (): number => {
          if (lng === "zh_CN") return 1;
          const lngKeys = new Set<string>();
          const lngResource = i18n.options.resources![lng];
          if (!lngResource) return 0;
          Object.keys(lngResource).forEach((ns) => {
            const traverse = (obj: any, prefix = "") => {
              Object.keys(obj).forEach((key) => {
                const value = obj[key];
                if (typeof value === "string") {
                  lngKeys.add(prefix + key);
                } else if (typeof value === "object") {
                  traverse(value, prefix + key + ".");
                }
              });
            };
            traverse(lngResource[ns]);
          });
          return Array.from(lngKeys).filter((key) => zhCNKeys.has(key)).length / zhCNKeys.size;
        };
        return {
          code: lng,
          name: t("metadata:name", { lng }),
          completeness: computeCompleteness(),
        };
      });
  }, [settingKey, i18n]);

  React.useEffect(() => {
    if (value !== Settings[settingKey]) {
      // @ts-expect-error 不知道为什么Settings[settingKey]可能是never
      Settings[settingKey] = value;
      postTelemetryEvent();
    }

    if (settingKey === "language") {
      i18n.changeLanguage(value);
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

  return (
    <Field
      title={t(`${settingKey}.title`)}
      description={t(`${settingKey}.description`, { defaultValue: "" })}
      icon={<Icon />}
      className="border-accent not-hover:rounded-none hover:bg-accent border-b transition"
    >
      <RotateCw
        className="text-panel-details-text h-4 w-4 cursor-pointer opacity-0 hover:rotate-180 group-hover/field:opacity-100"
        onClick={() => setValue(schema._def.defaultValue)}
      />
      {extra}
      {schema._def.innerType._def.typeName === "ZodString" ? (
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-64" />
      ) : schema._def.innerType._def.typeName === "ZodNumber" &&
        schema._def.innerType._def.checks.find((it) => it.kind === "min") &&
        schema._def.innerType._def.checks.find((it) => it.kind === "max") ? (
        <>
          <Slider
            value={[value]}
            onValueChange={([v]) => setValue(v)}
            min={schema._def.innerType._def.checks.find((it) => it.kind === "min")?.value ?? 0}
            max={schema._def.innerType._def.checks.find((it) => it.kind === "max")?.value ?? 1}
            step={
              schema._def.innerType._def.checks.find((it) => it.kind === "int")
                ? 1
                : (schema._def.innerType._def.checks.find((it) => it.kind === "multipleOf")?.value ?? 0.01)
            }
            className="w-48"
          />
          <Input
            value={value}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            type="number"
            min={schema._def.innerType._def.checks.find((it) => it.kind === "min")?.value ?? 0}
            max={schema._def.innerType._def.checks.find((it) => it.kind === "max")?.value ?? 1}
            step={
              schema._def.innerType._def.checks.find((it) => it.kind === "int")
                ? 1
                : (schema._def.innerType._def.checks.find((it) => it.kind === "multipleOf")?.value ?? 0.01)
            }
            className="w-24"
          />
        </>
      ) : schema._def.innerType._def.typeName === "ZodNumber" ? (
        <Input value={value} onChange={(e) => setValue(e.target.valueAsNumber)} type="number" className="w-32" />
      ) : schema._def.innerType._def.typeName === "ZodBoolean" ? (
        <Switch checked={value} onCheckedChange={setValue} />
      ) : schema._def.innerType._def.typeName === "ZodUnion" ? (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settingKey === "language"
              ? languages.map((lng) => (
                  <SelectItem key={lng.code} value={lng.code}>
                    {lng.name} ({(lng.completeness * 100).toFixed(2)}%)
                  </SelectItem>
                ))
              : schema._def.innerType._def.options.map(({ _def: { value: it } }) => (
                  <SelectItem key={it} value={it}>
                    {t(`${settingKey}.options.${it}`)}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
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
  color = "default",
  icon = <></>,
  className = "",
  style = {},
  onClick = () => {},
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  color?: "default" | "celebrate" | "danger" | "warning" | "thinking" | "imaging";
  icon?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "group/field flex w-full items-center justify-between gap-2 rounded-xl p-4",
        fieldColors[color],
        className,
      )}
      style={style}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <div className="flex flex-col">
          <span>{title}</span>
          <span className="text-panel-details-text text-xs">
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
        className="text-settings-text my-2 flex cursor-pointer items-center gap-2 pl-4 pt-4 text-sm opacity-60 hover:opacity-100"
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
