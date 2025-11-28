import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FlipWords } from "@/components/ui/flip-words";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { open } from "@tauri-apps/plugin-shell";
import i18next from "i18next";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Languages,
  MessageCircleWarning,
  Moon,
  Palette,
  SettingsIcon,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import SettingsWindow from "./SettingsWindow";

export default function OnboardingWindow() {
  const { t, i18n } = useTranslation("onboarding");
  const [theme, setTheme] = Settings.use("theme");

  const languages = useMemo(() => {
    if (!i18n.options.supportedLngs) return [];
    const zhCNKeys = new Set<string>();
    const zhCN = i18n.options.resources?.zh_CN ?? {};

    Object.keys(zhCN).forEach((ns) => {
      const traverse = (obj: any, prefix = "") => {
        Object.keys(obj || {}).forEach((key) => {
          const value = obj[key];
          if (typeof value === "string") {
            zhCNKeys.add(prefix + key);
          } else if (value && typeof value === "object") {
            traverse(value, prefix + key + ".");
          }
        });
      };
      traverse((zhCN as any)[ns]);
    });

    return (i18n.options.supportedLngs || [])
      .filter((code) => code !== "cimode")
      .map((code) => {
        if (code === "zh_CN") {
          return { code, completeness: 1, name: "简体中文" };
        }
        const lngResource = i18n.options.resources?.[code];
        if (!lngResource) {
          return { code, completeness: 0, name: t("metadata:name", { lng: code }) };
        }
        const lngKeys = new Set<string>();
        Object.keys(lngResource).forEach((ns) => {
          const traverse = (obj: any, prefix = "") => {
            Object.keys(obj || {}).forEach((key) => {
              const value = obj[key];
              if (typeof value === "string") {
                lngKeys.add(prefix + key);
              } else if (value && typeof value === "object") {
                traverse(value, prefix + key + ".");
              }
            });
          };
          traverse((lngResource as any)[ns]);
        });
        const completeness = zhCNKeys.size
          ? Array.from(lngKeys).filter((key) => zhCNKeys.has(key)).length / zhCNKeys.size
          : 0;
        return { code, completeness, name: t("metadata:name", { lng: code }) };
      });
  }, [i18n, t]);

  const activeLanguage = languages.find((lng) => lng.code === i18n.language) ?? languages[0];

  const highlights = [
    {
      icon: <Sparkles className="text-primary size-5" />,
      title: "无极限的思维画布",
      description: "使用全新的 Pixi.js 渲染内核，拖拽、缩放与节点操作更加顺滑。",
    },
    {
      icon: <Users className="text-primary size-5" />,
      title: "为团队协作而生",
      description: "即将上线的插件与 API 体系，让你的团队工作流程无缝衔接。",
    },
    {
      icon: <BookOpen className="text-primary size-5" />,
      title: "一分钟上手",
      description: "结合模板、AI 和键盘驱动的快捷操作，让灵感随写随用。",
    },
  ];

  const onboardingSteps = [
    {
      title: "设置语言与主题",
      description: "选择你熟悉的语言、偏爱的配色，营造舒适的创作环境。",
      done: Boolean(activeLanguage && activeLanguage.code === "zh_CN" && theme),
    },
    {
      title: "浏览新手教程",
      description: "阅读文档或加入社区，了解 Project Graph 的基本理念与操作方式。",
      done: false,
      action: () => open("https://graphif.dev/docs/app"),
    },
    {
      title: "创建第一个图谱",
      description: "从空白画布、模板或 AI 生成开始，探索嵌套节点与网状关系。",
      done: false,
      action: () => SubWindow.close(SubWindow.getFocused()?.id ?? ""),
    },
  ];

  return (
    <div className="bg-background text-foreground flex h-full w-full flex-col">
      <div className="flex flex-1 gap-8 p-10">
        <section className="sticky top-10 flex h-max flex-1 flex-col overflow-hidden rounded-3xl border p-10 shadow-lg">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 blur-3xl">
            <div className="bg-primary/30 absolute left-10 top-10 size-64 rounded-full"></div>
            <div className="bg-secondary/30 absolute right-0 top-0 size-72 rounded-full"></div>
            <div className="bg-accent/20 absolute bottom-0 right-14 size-80 rounded-full"></div>
          </div>

          <div className="flex flex-col gap-6">
            <span className="text-muted-foreground text-sm font-semibold uppercase tracking-[0.4em]">
              Project Graph
            </span>
            <div className="text-5xl font-semibold leading-tight">
              {t("slogan.line1pre", { defaultValue: "" })}
              <FlipWords words={t("slogan.line1flip", { returnObjects: true }) as string[]} className="text-primary" />
              {t("slogan.line1post", { defaultValue: "" })}
              <br />
              {t("slogan.line2pre", { defaultValue: "" })}
              <FlipWords words={t("slogan.line2flip", { returnObjects: true }) as string[]} className="text-primary" />
              {t("slogan.line2post", { defaultValue: "" })}
            </div>
            <p className="text-muted-foreground max-w-3xl text-lg leading-relaxed">
              这是一款由 Graphif
              组织打造的桌面端创意工作台，在一个无限大的二维平面中完成笔记、分析框架图、思维导图与头脑风暴的纵深协作。基于图论的拓扑布局帮助你梳理复杂逻辑关系网，设计并架构一个复杂系统，并保持灵感流动。
            </p>
          </div>

          <Separator className="my-8" />

          <div className="grid grid-cols-3 gap-6">
            {highlights.map((card) => (
              <div key={card.title} className="bg-card/70 flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur">
                <div className="flex items-center gap-3">
                  {card.icon}
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-[420px] flex-col gap-6">
          <div className="bg-card/70 rounded-2xl border p-6 backdrop-blur">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Languages className="size-4" />
              <span>{t("language.title")}</span>
            </div>

            {activeLanguage && activeLanguage.completeness < 0.9 && (
              <Alert variant="destructive" className="mb-4">
                <MessageCircleWarning />
                <AlertDescription>{t("language.lowCompleteness")}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {languages.map((lng) => (
                <button
                  key={lng.code}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    i18n.language === lng.code ? "border-primary bg-primary/10" : "hover:border-foreground/40"
                  }`}
                  onClick={() => i18next.changeLanguage(lng.code)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{lng.name}</span>
                    <span className="text-muted-foreground text-xs">{lng.code}</span>
                  </div>
                  <div className="flex w-24 flex-col items-end">
                    <span className="text-sm font-semibold">{Math.round(lng.completeness * 100)}%</span>
                    <Progress value={lng.completeness * 100} className="h-1.5 w-full" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card/70 rounded-2xl border p-6 backdrop-blur">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Palette className="size-4" />
              <span>{t("theme.title")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setTheme("dark")}
              >
                <Moon className="size-4" />
                {t("theme.dark")}
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setTheme("light")}
              >
                <Sun className="size-4" />
                {t("theme.light")}
              </Button>
              <Button
                variant={!["dark", "light"].includes(theme) ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => SettingsWindow.open("themes")}
              >
                <SettingsIcon className="size-4" />
                {t("theme.other")}
              </Button>
            </div>
          </div>

          <div className="bg-card/70 rounded-2xl border p-6 backdrop-blur">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="size-4" />
              <span>引导进度</span>
            </div>
            <ol className="space-y-4">
              {onboardingSteps.map((step, index) => (
                <li key={step.title} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                  {step.action && (
                    <Button size="icon" variant="ghost" onClick={step.action}>
                      <ChevronRight />
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

OnboardingWindow.open = () => {
  const width = Math.min(innerWidth * 0.95, 1240);
  const height = Math.min(innerHeight * 0.95, 900);

  SubWindow.create({
    children: <OnboardingWindow />,
    rect: Rectangle.inCenter(new Vector(width, height)),
    titleBarOverlay: true,
    resizable: false,
  });
};
