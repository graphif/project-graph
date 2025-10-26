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
  PersonStanding,
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

export default function WelcomePage() {
  const [recentFiles, setRecentFiles] = useState<RecentFileManager.RecentFile[]>([]);
  const { t } = useTranslation("welcome");
  const [appVersion, setAppVersion] = useState("unknown");

  useEffect(() => {
    refresh();
    (async () => {
      setAppVersion(await getVersion());
    })();
  }, []);

  async function refresh() {
    await RecentFileManager.sortTimeRecentFiles();
    setRecentFiles(await RecentFileManager.getRecentFiles());
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--stage-background)]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{t("title")}</span>
            <span className="rounded-lg px-2 py-1 text-sm opacity-50 ring">{appVersion}</span>
          </div>
          <div className="text-lg opacity-50">{t("slogan")}</div>
        </div>
        <div className="flex gap-16">
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 grid-rows-2 gap-2 gap-x-4 *:flex *:w-max *:cursor-pointer *:items-center *:gap-2 *:hover:opacity-75 *:active:scale-90">
              <div
                onClick={() => {
                  toast.promise(
                    async () => {
                      const u8a = await AssetsRepository.fetchFile("tutorials/tutorial-2.0.prg");
                      const dir = await tempDir();
                      const path = await join(dir, `tutorial-${crypto.randomUUID()}.prg`);
                      await writeFile(path, u8a);
                      await onOpenFile(URI.file(path), "新手引导");
                    },
                    {
                      loading: "正在下载新手引导文件",
                    },
                  );
                }}
              >
                <PersonStanding />
                <span>{t("newUserGuide")}</span>
              </div>
              <div onClick={onNewDraft}>
                <FilePlus />
                <span>{t("newDraft")}</span>
                <span className="text-xs opacity-50">Ctrl + N</span>
              </div>
              <div onClick={() => RecentFilesWindow.open()}>
                <TableProperties />
                <span>{t("openRecentFiles")}</span>
                <span className="text-xs opacity-50">Shift + #</span>
              </div>
              <div onClick={() => onOpenFile(undefined, "欢迎页面")}>
                <FolderOpen />
                <span>{t("openFile")}</span>
                <span className="text-xs opacity-50">Ctrl + O</span>
              </div>
            </div>
            <div
              className={cn(
                "flex flex-col gap-2 *:flex *:flex-col *:transition-opacity *:*:last:opacity-50 *:hover:opacity-75",
              )}
            >
              {recentFiles.slice(0, 6).map((file, index) => (
                <div
                  key={index}
                  onClick={async () => {
                    try {
                      await onOpenFile(file.uri, "欢迎页面-最近打开的文件");
                      await refresh();
                    } catch (e) {
                      toast.error(e as string);
                    }
                  }}
                >
                  <span className="text-sm">{new Path(file.uri).nameWithoutExt}</span>
                  <span className="text-xs">{file.uri.fsPath}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 *:flex *:w-max *:cursor-pointer *:gap-2 *:hover:opacity-75 *:active:scale-90">
            <div onClick={() => SettingsWindow.open("settings")}>
              <SettingsIcon />
              <span>{t("settings")}</span>
            </div>
            <div onClick={() => SettingsWindow.open("about")}>
              <Info />
              <span>{t("about")}</span>
            </div>
            <div onClick={() => shellOpen("https://project-graph.top")}>
              <Earth />
              <span>{t("website")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
