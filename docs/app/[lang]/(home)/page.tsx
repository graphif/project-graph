"use client";

import ThemeProvider from "@/app/theme-provider";
import { Hero } from "@primer/react-brand";
import "@primer/react-brand/lib/css/main.css";
import { ChevronRight, PlayCircle } from "lucide-react";
import { useParams } from "next/navigation";

const translations = {
  "zh-CN": {
    news: "2.0 版本将在 8 月 21 日发布",
    slogan: ["笔起思涌", "图见真意"],
    description:
      "一款基于图论的嵌套网状思维导图，让梳理超复杂逻辑关系变得轻松，通过直观的拓扑连接与区块化布局帮助你设计更庞大的想法，理清复杂的知识",
    start: "开始使用",
    video: "宣传片",
  },
  en: {
    news: "Version 2.0 will be released on August 21",
    slogan: ["Draw fast", "Think efficiently"],
    description: "Next-generation node graph drawing tool",
    start: "Get started",
    video: "Watch video",
  },
};

export default function Page() {
  const { lang } = useParams() as { lang: string };

  if (!(lang in translations)) {
    return <></>;
  }

  function t<T extends keyof (typeof translations)[keyof typeof translations]>(
    key: T,
  ): (typeof translations)[keyof typeof translations][T] {
    return translations[lang as keyof typeof translations][key];
  }

  return (
    <ThemeProvider>
      <main className="[&_.lucide]:fill-none! container flex min-h-full flex-col items-center gap-8 py-28">
        <Hero>
          <Hero.Label>{t("news")}</Hero.Label>
          <Hero.Heading className="leading-22!">
            {t("slogan").map((line, index) => (
              <span key={index} className="block">
                {line}
              </span>
            ))}
          </Hero.Heading>
          <Hero.Description className="opacity-75">{t("description")}</Hero.Description>
          <Hero.PrimaryAction variant="accent" href="/docs/app" trailingVisual={<ChevronRight />}>
            {t("start")}
          </Hero.PrimaryAction>
          <Hero.SecondaryAction href="https://www.bilibili.com/BV1W4k7YqEgU" leadingVisual={<PlayCircle />}>
            {t("video")}
          </Hero.SecondaryAction>
        </Hero>
      </main>
    </ThemeProvider>
  );
}
