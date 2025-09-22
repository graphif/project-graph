import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onNewDraft, onOpenFile } from "@/core/service/GlobalMenu";
import { Path } from "@/utils/path";
import { getVersion } from "@tauri-apps/api/app";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { Earth, FilePlus, FolderOpen, Info, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsWindow from "../sub/SettingsWindow";
import { toast } from "sonner";

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
          <span className="text-xs">此版本无自动保存功能，注意随手保存， 2.1版将会补全所有1.8版本功能，请耐心等待</span>
        </div>
        <div className="flex gap-16">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2 *:flex *:w-max *:cursor-pointer *:gap-2 *:hover:opacity-75 *:active:scale-90">
              <div onClick={onNewDraft}>
                <FilePlus />
                <span>{t("newDraft")}</span>
              </div>
              <div onClick={() => onOpenFile(undefined, "欢迎页面")}>
                <FolderOpen />
                <span>{t("openFile")}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 *:flex *:cursor-pointer *:flex-col *:*:last:text-sm *:*:last:opacity-50 *:hover:opacity-75">
              {recentFiles
                .toReversed()
                .slice(0, 5)
                .map((file, index) => (
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
                    <span>{new Path(file.uri).nameWithoutExt}</span>
                    <span>{file.uri.fsPath}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 *:flex *:w-max *:cursor-pointer *:gap-2 *:hover:opacity-75 *:active:scale-90">
            <div onClick={() => SettingsWindow.open("settings")}>
              <Settings />
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
