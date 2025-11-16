import logoUrl from "@/assets/icon.png";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onNewDraft } from "@/core/service/GlobalMenu";
import SettingsWindow from "@/sub/SettingsWindow";
import { useHitokoto } from "@/utils/hitokoto";
import { relativeTime } from "@/utils/time";
import { open } from "@tauri-apps/plugin-shell";
import { ChevronRight, ExternalLink, FileClock, Folder, Info, Plus, SettingsIcon } from "lucide-react";
import { Suspense, use, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import { Skeleton } from "./ui/skeleton";

export default function WelcomePage() {
  // const { t } = useTranslation("welcome");
  const { data: hitokoto } = useHitokoto();

  return (
    <div className="flex bg-[var(--stage-background)] pt-11">
      <Sidebar className="h-full">
        <SidebarHeader className="flex-row items-center gap-1.5 pb-0">
          <img src={logoUrl} className="size-8" />
          Project Graph
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <FileClock />
                    最近打开
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>常用文件夹</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Folder />
                    file:///home/zty/des
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => SettingsWindow.open()}>
                <SettingsIcon />
                设置
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => SettingsWindow.open("about")}>
                <Info />
                关于
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <div className="mx-auto flex max-w-[1200px] grow flex-col gap-4 overflow-auto p-2 pl-0">
        <Card>
          <CardHeader>
            <CardTitle>描述你的想法，让它们编织成现实。</CardTitle>
            <CardDescription>使用 AI 将想法转化为图。使用本功能视为您同意我们的用户协议。</CardDescription>
            <CardAction className="flex gap-1">
              <Button variant="ghost" onClick={() => open("https://graphif.dev/docs/app/misc/terms")}>
                <ExternalLink />
                用户协议
              </Button>
              <Button>
                开始生成
                <ChevronRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Input placeholder="输入你的想法…" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-4 gap-4">
          <div
            className="relative overflow-hidden rounded-xl border border-dashed transition active:scale-90"
            onClick={onNewDraft}
          >
            <div className="flex aspect-video items-center justify-center opacity-75">
              <Plus size={64} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 bg-gradient-to-t from-black/75 to-transparent p-4 pt-8 text-white">
              <CardTitle>新建文件</CardTitle>
              <CardDescription>「{hitokoto.hitokoto}」</CardDescription>
            </div>
          </div>
          <Suspense
            fallback={Array(15).fill(
              <div className="flex aspect-video flex-col justify-end gap-2 rounded-xl border p-4">
                <Skeleton className="mb-2 h-6 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>,
            )}
          >
            <RecentFiles />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function RecentFiles() {
  const [promise, setPromise] = useState<Promise<RecentFileManager.RecentFile[] | null>>(Promise.resolve(null));
  const files = use(promise);

  useEffect(() => {
    setPromise(RecentFileManager.getRecentFiles());
  }, []);

  return files?.map((file, i) => (
    <div className="relative overflow-hidden rounded-xl border transition active:scale-90" key={i}>
      <div className="aspect-video">这里放文件缩略图作为卡片背景</div>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 bg-gradient-to-t from-black/75 to-transparent p-4 pt-8 text-white">
        <CardTitle className="leading-snug">{file.uri.path.split("/").pop()}</CardTitle>
        <CardDescription>{relativeTime(file.time)}</CardDescription>
      </div>
    </div>
  ));
}
