import { Button } from "@/components/ui/button";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { RefreshCcw } from "lucide-react";
import { useAtom } from "jotai";
import { useState, useEffect } from "react";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { PathString } from "@/utils/pathString";
import { toast } from "sonner";
import { onOpenFile } from "@/core/service/GlobalMenu";

export default function ReferencesWindow() {
  const [project] = useAtom(activeProjectAtom);
  if (!project) return <></>;

  const [references, setReferences] = useState(project.references);

  function refresh() {
    setReferences({ ...project!.references });
  }

  useEffect(() => {
    refresh();
  }, []);

  const handleOpenReferencedFile = async (fileName: string) => {
    const recentFiles = await RecentFileManager.getRecentFiles();
    const file = recentFiles.find(
      (file) =>
        PathString.getFileNameFromPath(file.uri.path) === fileName ||
        PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
    );
    if (!file) {
      toast.error(`文件 ${fileName} 未找到`);
      return;
    }
    onOpenFile(file.uri, "ReferencesWindow跳转打开-prg文件");
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex gap-3">
        <Button onClick={refresh} variant="outline">
          <RefreshCcw />
          刷新
        </Button>
      </div>

      {/* 引用信息展示 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4">
          <h3 className="mb-2 text-lg font-semibold">直接引用此文件的文件</h3>
          {references.files.length === 0 ? (
            <p className="text-muted-foreground text-sm">当前项目中没有引用此文件的文件</p>
          ) : (
            <div className="space-y-1">
              {references.files.map((filePath) => {
                const fileName = PathString.getFileNameFromPath(filePath);
                return (
                  <div
                    key={filePath}
                    className="text-select-option-text hover:text-select-option-hover-text hover:bg-icon-button-bg flex cursor-pointer items-center gap-2 rounded p-1 text-sm"
                    onClick={() => handleOpenReferencedFile(fileName)}
                  >
                    <span className="font-medium">{fileName}</span>
                    <span className="text-muted-foreground text-xs">{filePath}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">被引用的章节</h3>
          {Object.keys(references.sections).length === 0 ? (
            <p className="text-muted-foreground text-sm">当前项目中没有被引用的章节</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(references.sections).map(([fileName, sections]) => (
                <div key={fileName}>
                  <div
                    className="text-select-option-text hover:text-select-option-hover-text hover:bg-icon-button-bg cursor-pointer rounded p-1 font-medium"
                    onClick={() => handleOpenReferencedFile(fileName)}
                  >
                    {fileName}
                  </div>
                  <div className="ml-4 mt-1 space-y-1">
                    {sections.map((sectionName) => (
                      <div
                        key={sectionName}
                        className="border-muted text-select-option-text hover:text-select-option-hover-text hover:bg-icon-button-bg cursor-pointer rounded border-l-2 p-1 pl-2 text-sm"
                      >
                        {sectionName}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReferencesWindow.open = () => {
  SubWindow.create({
    title: "引用管理器",
    children: <ReferencesWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(300, 600)),
  });
};
