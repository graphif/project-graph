import { Settings } from "@/core/service/Settings";
import { cn } from "@/utils/cn";
import { runThemeTransition } from "@/utils/themeTransition";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "./ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function ThemeModeSwitch() {
  const { t } = useTranslation("settings");
  const [themeMode] = Settings.use("themeMode");
  const isDark = themeMode === "dark";
  const switchRef = useRef<HTMLDivElement>(null);
  const handleToggle = () => {
    const rect = switchRef.current?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: innerWidth / 2, y: 0 };
    void runThemeTransition(origin, () => {
      flushSync(() => {
        Settings.themeMode = Settings.themeMode === "dark" ? "light" : "dark";
      });
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={switchRef}
          className={cn(
            "bg-background outline-accent-foreground/10 relative h-6 w-11 cursor-pointer overflow-hidden rounded-full shadow-xs outline-1",
          )}
        >
          {/* Hidden default thumb */}
          <Switch
            aria-label={isDark ? "切换为浅色主题" : "切换为深色主题"}
            checked={isDark}
            onCheckedChange={handleToggle}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {/* Custom thumb with icon */}
          <span
            className={cn(
              "pointer-events-none absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
              isDark && "translate-x-5",
              isDark ? "bg-neutral-300" : "bg-amber-200",
            )}
          >
            {isDark ? <Moon className="h-3 w-3 text-slate-800" /> : <Sun className="h-3 w-3 text-amber-600" />}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">{isDark ? t("themeMode.options.dark") : t("themeMode.options.light")}</TooltipContent>
    </Tooltip>
  );
}
