import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function KeyboardRecentFilesWindow({ winId = "" }: { winId?: string }) {
  const [recentFiles, setRecentFiles] = useState<RecentFileManager.RecentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [recentFiles]);

  async function refresh() {
    setIsLoading(true);
    await RecentFileManager.validAndRefreshRecentFiles();
    await RecentFileManager.sortTimeRecentFiles();
    const files = await RecentFileManager.getRecentFiles();
    setRecentFiles(files);
    setIsLoading(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    // 按下数字键1-9时，打开对应的文件
    toast(event.key);
    if (event.key >= "1" && event.key <= "9") {
      const index = parseInt(event.key) - 1; // 将键值转换为索引
      if (index >= 0 && index < recentFiles.length) {
        const file = recentFiles[index];
        if (file.uri) {
          toast(`打开第 ${event.key} 项`);
          onOpenFile(file.uri, "KeyboardRecentFilesWindow");
          SubWindow.close(winId);
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {isLoading && "loading"}
      {recentFiles.map((it, index) => (
        <span key={index}>
          [{index + 1}] {it.uri.fsPath}
        </span>
      ))}
    </div>
  );
}

KeyboardRecentFilesWindow.open = () => {
  SubWindow.create({
    title: "最近打开的文件",
    children: <KeyboardRecentFilesWindow />,
    rect: new Rectangle(Vector.same(100), Vector.same(-1)),
    closeWhenClickInside: true,
    closeWhenClickOutside: true,
  });
};
