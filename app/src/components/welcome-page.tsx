import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onNewDraft, onOpenFile } from "@/core/service/GlobalMenu";
import { Path } from "@/utils/path";
import { getVersion } from "@tauri-apps/api/app";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  Earth,
  FilePlus,
  FolderOpen,
  Info,
  LoaderCircle,
  Map as MapIcon,
  Settings as SettingsIcon,
  TableProperties,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsWindow from "../sub/SettingsWindow";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { AssetsRepository } from "@/core/service/AssetsRepository";
import { join, tempDir } from "@tauri-apps/api/path";
import { URI } from "vscode-uri";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import { isMac } from "@/utils/platform";

export default function WelcomePage() {
  const [recentFiles, setRecentFiles] = useState<RecentFileManager.RecentFile[]>([]);
  const { t } = useTranslation("welcome");
  const [appVersion, setAppVersion] = useState("unknown");
  const [isDownloadingGuideFile, setIsDownloadingGuideFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastClickFileURIPath, setLastClickFileURIPath] = useState("");

  useEffect(() => {
    refresh();
    (async () => {
      setAppVersion(await getVersion());
    })();
  }, []);

  async function refresh() {
    setIsLoading(true);
    await RecentFileManager.sortTimeRecentFiles();
    setRecentFiles(await RecentFileManager.getRecentFiles());
    setIsLoading(false);
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--stage-background)]">
      <div className="m-2 flex flex-col p-4 sm:gap-8">
        {/* 顶部标题区域 */}
        <div className="flex flex-col sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="sm:text-3xl">{t("title")}</span>
            <span className="border-card-foreground/30 hidden border-2 opacity-50 sm:inline sm:rounded-lg sm:px-2 sm:py-1 md:text-lg">
              {appVersion}
            </span>
          </div>
          <div className="hidden text-xs opacity-50 sm:block sm:text-lg">{t("slogan")}</div>
        </div>
        {/* 底部区域 */}
        <div className="flex sm:gap-16">
          <div className="flex flex-col sm:gap-8">
            {/* 常用操作 宫格区 */}
            <div className="grid grid-cols-2 grid-rows-2 *:flex *:w-max *:cursor-pointer *:items-center *:gap-2 *:hover:opacity-75 *:active:scale-90 sm:gap-2 sm:gap-x-4">
              <div
                onClick={() => {
                  if (isDownloadingGuideFile) {
                    return;
                  }
                  setIsDownloadingGuideFile(true);
                  toast.promise(
                    async () => {
                      const u8a = await AssetsRepository.fetchFile("tutorials/tutorial-2.0.prg");
                      const dir = await tempDir();
                      const path = await join(dir, `tutorial-${crypto.randomUUID()}.prg`);
                      await writeFile(path, u8a);
                      await onOpenFile(URI.file(path), "功能说明书");
                    },
                    {
                      loading: "正在下载功能说明书",
                      error: (err) => {
                        console.error("下载功能说明书失败:", err);
                        return (
                          `下载功能说明书失败，可以尝试访问${AssetsRepository.getGuideFileUrl("tutorials/tutorial-2.0.prg")}，请确保您能访问github。` +
                          err
                        );
                      },
                      finally: () => {
                        setIsDownloadingGuideFile(false);
                      },
                    },
                  );
                }}
              >
                <MapIcon className={cn(isDownloadingGuideFile && "animate-spin")} />
                <span className="hidden sm:inline">{t("newUserGuide")}</span>
              </div>
              <div onClick={onNewDraft}>
                <FilePlus />
                <span className="hidden sm:inline">{t("newDraft")}</span>
                <span className="hidden text-xs opacity-50 sm:inline">{isMac ? "⌘ + N" : "Ctrl + N"}</span>
              </div>
              <div onClick={() => RecentFilesWindow.open()}>
                <TableProperties />
                <span className="hidden sm:inline">{t("openRecentFiles")}</span>
                <span className="hidden text-xs opacity-50 sm:inline">Shift + #</span>
              </div>
              <div onClick={() => onOpenFile(undefined, "欢迎页面")}>
                <FolderOpen />
                <span className="hidden sm:inline">{t("openFile")}</span>
                <span className="hidden text-xs opacity-50 sm:inline">{isMac ? "⌘ + O" : "Ctrl + O"}</span>
              </div>
            </div>
            <div className={cn("hidden flex-col gap-2 *:transition-opacity *:hover:opacity-75 sm:flex")}>
              {recentFiles.slice(0, 6).map((file, index) => (
                <div
                  className="flex flex-row items-center gap-2"
                  key={index}
                  onClick={async () => {
                    if (isLoading) {
                      toast.error("正在打开文件，请稍后");
                      return;
                    }
                    setIsLoading(true);
                    setLastClickFileURIPath(file.uri.fsPath);
                    try {
                      await onOpenFile(file.uri, "欢迎页面-最近打开的文件");
                      await refresh();
                    } catch (e) {
                      toast.error(e as string);
                    }
                    setIsLoading(false);
                    setLastClickFileURIPath("");
                  }}
                >
                  {isLoading && lastClickFileURIPath === file.uri.fsPath && (
                    <LoaderCircle className={cn(isLoading && "animate-spin")} />
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{new Path(file.uri).nameWithoutExt}</span>
                    <span className="text-xs opacity-50">{file.uri.fsPath}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 右侧区域 */}
          <div className="flex flex-col *:flex *:w-max *:cursor-pointer *:gap-2 *:hover:opacity-75 *:active:scale-90 sm:gap-2">
            <div onClick={() => SettingsWindow.open("settings")}>
              <SettingsIcon />
              <span className="hidden sm:inline">{t("settings")}</span>
            </div>
            <div onClick={() => SettingsWindow.open("about")}>
              <Info />
              <span className="hidden sm:inline">{t("about")}</span>
            </div>
            <div onClick={() => shellOpen("https://project-graph.top")}>
              <Earth />
              <span className="hidden sm:inline">{t("website")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
