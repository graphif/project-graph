// import { readTextFile } from "@tauri-apps/plugin-fs";
import { Input } from "@/components/ui/input";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { SubWindow } from "@/core/service/SubWindow";
// import { activeProjectAtom } from "@/state";
import { cn } from "@/utils/cn";
import { PathString } from "@/utils/pathString";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
// import { useAtom } from "jotai";
import { LoaderPinwheel } from "lucide-react";
import React, { ChangeEventHandler, useEffect } from "react";
import { toast } from "sonner";
import { onOpenFile } from "@/core/service/GlobalMenu";
/**
 * 最近文件面板按钮
 * @returns
 */
export default function RecentFilesWindow({ winId = "" }: { winId?: string }) {
  /**
   * 数据中有多少就是多少
   */
  const [recentFiles, setRecentFiles] = React.useState<RecentFileManager.RecentFile[]>([]);
  /**
   * 经过搜索字符串过滤后的
   */
  const [recentFilesFiltered, setRecentFilesFiltered] = React.useState<RecentFileManager.RecentFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // const [currentFile, setFile] = useAtom(fileAtom);
  // const [activeProject] = useAtom(activeProjectAtom);

  // 当前预选中的文件下标
  const [currentPreselect, setCurrentPreselect] = React.useState<number>(0);
  const [searchString, setSearchString] = React.useState("");

  /**
   * 用于刷新页面显示
   */
  const updateRecentFiles = async () => {
    setIsLoading(true);
    await RecentFileManager.validAndRefreshRecentFiles();
    await RecentFileManager.sortTimeRecentFiles();
    const files = await RecentFileManager.getRecentFiles();
    setRecentFiles(files);
    setRecentFilesFiltered(files);
    setIsLoading(false);
  };

  const onInputChange: ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputString: string = event.target.value;
    console.log(inputString, "inputContent");
    if (inputString === "#") {
      // 默认的shift + 3 会触发井号
      return;
    }
    setCurrentPreselect(0); // 一旦有输入，就设置下标为0
    setSearchString(inputString);
    setRecentFilesFiltered(recentFiles.filter((file) => file.uri.toString().includes(inputString)));
  };

  useEffect(() => {
    updateRecentFiles();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const currentRect = SubWindow.get(winId).rect;
    const createdWin = SubWindow.create({
      titleBarOverlay: true,
      children: (
        <div className="flex flex-col gap-1 p-5">
          <span className="text-sm">文件路径</span>
          <span>{recentFilesFiltered[currentPreselect].uri.toString()}</span>
          <div className="h-1"></div>
          <span className="text-sm">修改时间</span>
          <span>{new Date(recentFilesFiltered[currentPreselect].time).toLocaleString()}</span>
        </div>
      ),
      rect: new Rectangle(currentRect.rightTop.add(new Vector(10, 0)), Vector.same(-1)),
      closeWhenClickOutside: true,
    });
    return () => {
      SubWindow.close(createdWin.id);
    };
  }, [currentPreselect, isLoading]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      setCurrentPreselect((prev) => Math.max(0, prev - 1));
    } else if (e.key === "ArrowDown") {
      setCurrentPreselect((prev) => Math.min(recentFilesFiltered.length - 1, prev + 1));
    } else if (e.key === "Enter") {
      const file = recentFilesFiltered[currentPreselect];
      checkoutFile(file);
    }
  };
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [recentFilesFiltered]); // isRecentFilePanelOpen, recentFiles, currentPreselect

  const openFile = (file: RecentFileManager.RecentFile) => {
    checkoutFile(file);
  };

  const checkoutFile = async (file: RecentFileManager.RecentFile) => {
    try {
      await onOpenFile(file.uri, "历史界面-最近打开的文件");
      SubWindow.close(winId);
    } catch (error) {
      toast.error(error as string);
    }
  };

  return (
    <div className={cn("flex h-full flex-col items-center gap-2")}>
      <Input placeholder="请输入要筛选的文件" onChange={onInputChange} value={searchString} autoFocus />

      {/* 加载中提示 */}
      {isLoading && (
        <div className="flex h-full items-center justify-center text-8xl">
          <LoaderPinwheel className="scale-200 animate-spin" />
        </div>
      )}
      {/* 滚动区域单独封装 */}
      {!isLoading && recentFilesFiltered.length === 0 && (
        <div className="flex h-full items-center justify-center text-8xl">
          <span>NULL</span>
        </div>
      )}

      <div className="flex w-full flex-1 ring">
        {recentFilesFiltered.map((file, index) => (
          <div
            key={index}
            className={cn("flex origin-left items-center gap-2 border-4 border-transparent px-2 py-1 opacity-75", {
              "border-panel-success-text opacity-100": index === currentPreselect,
            })}
            onMouseEnter={() => setCurrentPreselect(index)}
            onClick={() => openFile(file)}
          >
            {PathString.absolute2file(decodeURI(file.uri.toString()))}
          </div>
        ))}
      </div>
    </div>
  );
}

RecentFilesWindow.open = () => {
  SubWindow.create({
    title: "最近打开的文件",
    children: <RecentFilesWindow />,
    rect: new Rectangle(new Vector(50, 50), new Vector(250, window.innerHeight - 100)),
  });
};
