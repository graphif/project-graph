import { Random } from "@/core/algorithm/random";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onNewDraft, onOpenFile, onOpenTutorial } from "@/core/service/GlobalMenu";
import { Path } from "@/utils/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { ArrowUpRightIcon, Earth, FilePlus, FolderCode, FolderOpen, Info, Settings } from "lucide-react";
import { cache, Fragment, Suspense, use, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import SettingsWindow from "../sub/SettingsWindow";
import AppVersion from "./app-version";
import { Button } from "./ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Skeleton } from "./ui/skeleton";

export default function WelcomePage() {
  const { t } = useTranslation("welcome");
  const [empty, setEmpty] = useState(false);

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--stage-background)]">
      {empty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderCode />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={onNewDraft}>
                <FilePlus />
                {t("empty.newDraft")}
              </Button>
              <Button variant="outline" onClick={() => onOpenFile(undefined, "欢迎页面")}>
                <FolderOpen />
                {t("empty.openFile")}
              </Button>
            </div>
          </EmptyContent>
          <Button variant="link" className="text-muted-foreground" size="sm" onClick={onOpenTutorial}>
            {t("empty.tutorial")}
            <ArrowUpRightIcon />
          </Button>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{t("title")}</span>
              <Suspense>
                <span className="rounded-lg px-2 py-1 text-sm opacity-50 ring">
                  <AppVersion />
                </span>
              </Suspense>
            </div>
            <div className="text-lg opacity-50">{t("slogan")}</div>
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
              <Suspense
                fallback={
                  <div className="flex flex-col gap-2 *:odd:mt-2">
                    {[...Array(5)].map((_, index) => (
                      <Fragment key={index}>
                        <Skeleton className="h-6" style={{ width: Random.randomInt(80, 130) }} />
                        <Skeleton className="h-4" style={{ width: Random.randomInt(100, 250) }} />
                      </Fragment>
                    ))}
                  </div>
                }
              >
                <RecentFiles onEmpty={() => setEmpty(true)} />
              </Suspense>
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
      )}
    </div>
  );
}

const recentFilesCache = cache(() => RecentFileManager.getRecentFiles());
function RecentFiles({ onEmpty }: { onEmpty: () => void }) {
  const recentFiles = use(recentFilesCache());

  useEffect(() => {
    if (recentFiles && recentFiles.length === 0) {
      onEmpty();
    }
  }, [recentFiles, onEmpty]);

  async function handleOpenRecentFile(file: RecentFileManager.RecentFile) {
    try {
      await onOpenFile(file.uri, "欢迎页面-最近打开的文件");
    } catch (e) {
      toast.error(e as string);
    }
  }

  return (
    <div className="flex flex-col gap-2 *:flex *:cursor-pointer *:flex-col *:*:last:text-sm *:*:last:opacity-50 *:hover:opacity-75">
      {recentFiles
        .toReversed()
        .slice(0, 5)
        .map((file, index) => (
          <div key={index} onClick={() => handleOpenRecentFile(file)}>
            <span>{new Path(file.uri).nameWithoutExt}</span>
            <span>{file.uri.fsPath}</span>
          </div>
        ))}
    </div>
  );
}
