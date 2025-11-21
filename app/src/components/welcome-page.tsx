import logoUrl from "@/assets/icon.png";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { easeOutExpo } from "@/core/service/feedbackService/effectEngine/mathTools/easings";
import { onNewDraft, onOpenFile } from "@/core/service/GlobalMenu";
import SettingsWindow from "@/sub/SettingsWindow";
import { useHitokoto } from "@/utils/hitokoto";
import { relativeTime } from "@/utils/time";
import { open } from "@tauri-apps/plugin-shell";
import {
  ChevronRight,
  CircleX,
  ExternalLink,
  FileClock,
  Folder,
  Info,
  Loader2,
  Plus,
  SettingsIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, use, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
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
  const [selectedFile, setSelectedFile] = useState<RecentFileManager.RecentFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) return;
    setError(null);
    setTimeout(async () => {
      try {
        await onOpenFile(selectedFile.uri, "欢迎页面-最近打开的文件");
        setSelectedFile(null);
      } catch (err) {
        setError(String(err));
      }
    }, 500);
  }, [selectedFile]);

  return (
    <div className="h-screen w-screen bg-[var(--stage-background)]">
      <motion.div
        className="flex h-full overflow-hidden pt-11 blur-xl"
        animate={
          selectedFile
            ? { filter: "blur(24px)", transform: "scale(0.9)" }
            : { filter: "blur(0px)", transform: "scale(1)" }
        }
        transition={{ duration: 0.5, type: "tween", ease: easeOutExpo }}
      >
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
              <SidebarGroupAction>
                <Plus />
              </SidebarGroupAction>
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
        <div className="mx-auto flex max-w-[1200px] grow flex-col gap-4 overflow-y-auto overflow-x-hidden p-2 pl-0">
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
          <div className="scrollbar-hide grid grid-cols-4 gap-4 pb-10">
            <div
              className="relative cursor-pointer overflow-hidden rounded-xl border border-dashed transition active:scale-90"
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
              <RecentFiles onSelect={setSelectedFile} />
            </Suspense>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            layoutId={`card-${selectedFile.uri.path}`}
            className="bg-background fixed inset-0 z-10 flex flex-col"
            initial={{ borderRadius: 12 }}
            animate={{ borderRadius: 0 }}
            exit={{ borderRadius: 12 }}
            transition={{ duration: 0.5, type: "tween", ease: easeOutExpo }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-full flex-col items-center justify-center gap-6"
            >
              <div className="flex flex-col items-center gap-4">
                {error ? (
                  <>
                    <CircleX className="text-destructive" size={64} />
                    <h2 className="text-2xl font-bold">打开文件失败</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <Button variant="outline" onClick={() => setSelectedFile(null)}>
                      返回
                    </Button>
                  </>
                ) : (
                  <>
                    <Loader2 className="text-primary animate-spin" size={64} />
                    <h2 className="text-2xl font-bold">{selectedFile.uri.path.split("/").pop()}</h2>
                    <p className="text-muted-foreground">正在加载文件…</p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecentFiles({ onSelect }: { onSelect: (file: RecentFileManager.RecentFile) => void }) {
  const [promise, setPromise] = useState<Promise<RecentFileManager.RecentFile[] | null>>(Promise.resolve(null));
  const files = use(promise);

  useEffect(() => {
    setPromise(RecentFileManager.getRecentFiles());
  }, []);

  return files?.toReversed().map((file, i) => (
    <motion.div
      layoutId={`card-${file.uri.path}`}
      className="bg-card group relative cursor-pointer overflow-hidden rounded-xl border"
      onClick={() => onSelect(file)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ borderRadius: 12 }}
      key={i}
    >
      <div className="bg-muted/30 group-hover:bg-muted/50 aspect-video transition-colors">
        {/* 这里放文件缩略图作为卡片背景 */}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 bg-gradient-to-t from-black/75 to-transparent p-4 pt-8 text-white">
        <CardTitle className="leading-snug">{file.uri.path.split("/").pop()}</CardTitle>
        <CardDescription className="text-white/80">{relativeTime(file.time)}</CardDescription>
      </div>
    </motion.div>
  ));
}
