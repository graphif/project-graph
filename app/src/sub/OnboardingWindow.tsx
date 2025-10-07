import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FlipWords } from "@/components/ui/flip-words";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import i18next from "i18next";
import { Languages, MessageCircleWarning, Moon, Palette, SettingsIcon, Sun } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import SettingsWindow from "./SettingsWindow";
import { donations } from "./SettingsWindow/credits";

export default function OnboardingWindow() {
  const { t, i18n } = useTranslation("onboarding");
  const languages = useMemo(() => {
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
  }, [i18n]);
  const [theme, setTheme] = Settings.use("theme");

  return (
    <div className="flex h-full w-full gap-8 p-16">
      <div className="flex h-full flex-1 grow flex-col gap-8">
        <div className="text-foreground/50 text-5xl leading-snug">
          {t("slogan.line1pre")}
          {(t("slogan.line1flip", { returnObjects: true }) as string[]).length > 0 && (
            <FlipWords words={t("slogan.line1flip", { returnObjects: true }) as string[]} />
          )}
          {t("slogan.line1post")}
          <br />
          {t("slogan.line2pre")}
          {(t("slogan.line2flip", { returnObjects: true }) as string[]).length > 0 && (
            <FlipWords words={t("slogan.line2flip", { returnObjects: true }) as string[]} />
          )}
          {t("slogan.line1post")}
        </div>
        <div className="flex w-max flex-col gap-4">
          <div className="flex gap-2">
            <Languages />
            <span>{t("language.title")}</span>
          </div>
          {languages.find((it) => it.code === i18n.language)!.completeness < 0.9 && (
            <Alert variant="destructive">
              <MessageCircleWarning />
              <AlertDescription>{t("language.lowCompleteness")}</AlertDescription>
            </Alert>
          )}
          <div className="flex w-max flex-col gap-2">
            {languages.map((lng) => (
              <Button
                key={lng.code}
                variant={i18n.language === lng.code ? "default" : "outline"}
                size="lg"
                onClick={() => {
                  i18next.changeLanguage(lng.code);
                }}
              >
                {lng.name} ({(lng.completeness * 100).toFixed(2)}%)
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Palette />
            <span>{t("theme.title")}</span>
          </div>
          <div className="flex w-max gap-2">
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
              <Moon />
              {t("theme.dark")}
            </Button>
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
              <Sun />
              {t("theme.light")}
            </Button>
            <Button
              variant={!["dark", "light"].includes(theme) ? "default" : "outline"}
              onClick={() => SettingsWindow.open("themes")}
            >
              <SettingsIcon />
              {t("theme.other")}
            </Button>
          </div>
        </div>
        <div className="grow" />
        <div className="flex gap-2">
          <Button>{t("next")}</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex w-56 flex-col gap-1 rounded-xl border p-4" onClick={() => SettingsWindow.open("credits")}>
          <h2 className="text-lg">{t("donation.title", { users: donations.length })}</h2>
          <p className="opacity-50">{t("donation.more")}</p>
        </div>
        <div className="flex w-56 flex-col gap-1 rounded-xl border p-4">
          <h2 className="text-lg">{t("star.title")}</h2>
          video...
        </div>
        <div className="flex w-56 flex-col gap-1 rounded-xl border p-4">
          <h2 className="text-lg">这里没有广告位</h2>
        </div>
      </div>
    </div>
  );
}

OnboardingWindow.open = () => {
  SubWindow.create({
    children: <OnboardingWindow />,
    rect: Rectangle.inCenter(new Vector(innerWidth > 1653 ? 1240 : innerWidth * 0.75, innerHeight * 0.875)),
    titleBarOverlay: true,
    closable: false,
    resizable: false,
  });
};
