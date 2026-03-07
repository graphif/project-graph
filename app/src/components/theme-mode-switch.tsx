import { Settings } from "@/core/service/Settings";
import { Switch } from "./ui/switch";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useTranslation } from "react-i18next";

export default function ThemeModeSwitch() {
  const { t } = useTranslation("settings");
  const [themeMode] = Settings.use("themeMode");
  const isDark = themeMode === "dark";

  const handleToggle = () => {
    Settings.themeMode = isDark ? "light" : "dark";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "bg-background shadow-xs outline-accent-foreground/10 relative h-6 w-11 cursor-pointer overflow-hidden rounded-full outline-1",
          )}
        >
          {/* Hidden default thumb */}
          <Switch
            checked={isDark}
            onCheckedChange={handleToggle}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {/* Custom thumb with icon */}
          <span
            className={cn(
              "pointer-events-none absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
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
