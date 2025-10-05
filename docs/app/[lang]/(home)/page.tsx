"use client";

import Link from "fumadocs-core/link";
import { ChevronRight } from "lucide-react";
import { useMemo, useRef } from "react";
import { useMouse } from "react-use";

export default function Page() {
  return (
    <main className="-mt-[57px] flex min-h-full flex-col items-center gap-8">
      <Hero />
    </main>
  );
}

function Hero() {
  const titleElRef = useRef<HTMLHeadingElement>(null);
  const { docX: mouseX, docY: mouseY } = useMouse(titleElRef as any);
  const [titleX, titleY] = useMemo(() => {
    if (!titleElRef.current) return [0, 0];
    const rect = titleElRef.current.getBoundingClientRect();
    return [rect.left, rect.top + rect.height];
  }, [titleElRef.current]);
  const titleFontWeight = useMemo(() => {
    if (typeof window === "undefined") return 400;
    // 计算鼠标和标题的距离，然后转换为300~900的字重
    // 鼠标越近，字重越大
    // 距离0时，字重900；距离window.innerWidth时，字重300
    // 注意用的是可变字体，字重可以不是100倍数
    const distance = Math.hypot(mouseX - titleX, mouseY - titleY);
    const maxDistance = (window.innerWidth + window.innerHeight) / 2;
    const weight = 900 - (distance / maxDistance) * 600;
    return Math.max(300, Math.min(900, weight));
  }, [mouseX, mouseY, titleX, titleY]);

  return (
    <div className="flex h-screen w-full items-end bg-gradient-to-br dark:from-green-950 dark:via-blue-950 dark:to-purple-950">
      <div className="container flex flex-col gap-8 pb-28">
        <h1
          className="text-7xl opacity-90"
          style={{ fontWeight: titleFontWeight }}
          ref={titleElRef}
          suppressHydrationWarning
        >
          Project Graph
        </h1>
        <p className="w-[40vw]">
          一款基于图论的嵌套网状思维导图，让梳理超复杂逻辑关系变得轻松，通过直观的拓扑连接与区块化布局帮助你设计更庞大的想法，理清复杂的知识
        </p>
        <Link
          href="/docs/app"
          className="flex w-max items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-lg text-white no-underline shadow-lg shadow-blue-600/50 transition hover:opacity-90 hover:shadow-xl active:scale-95"
        >
          <span>开始使用</span>
          <ChevronRight />
        </Link>
      </div>
    </div>
  );
}
