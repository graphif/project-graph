import { Button } from "@/components/ui/button";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { RefreshCcw } from "lucide-react";
import { useAtom } from "jotai";
import { useState, useEffect } from "react";
import { PathString } from "@/utils/pathString";
import { URI } from "vscode-uri";

export default function ReferencesWindow(props: { currentProjectFileName: string }) {
  const currentProjectFileName = props.currentProjectFileName;
  const [project] = useAtom(activeProjectAtom);
  if (!project) return <></>;

  const [references, setReferences] = useState(project.references);

  function refresh() {
    setReferences({ ...project!.references });
  }

  useEffect(() => {
    refresh();
  }, []);

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
        {/* <div className="mb-4">
          <h3 className="mb-2 text-lg font-semibold">直接引用{currentProjectFileName}的文件</h3>
          {references.files.length === 0 ? (
            <p className="text-muted-foreground text-sm">当前项目中没有引用{currentProjectFileName}的文件</p>
          ) : (
            <div className="space-y-1">
              {references.files.map((filePath) => {
                const fileName = PathString.getFileNameFromPath(filePath);
                return (
                  <div
                    key={filePath}
                    className="text-select-option-text hover:text-select-option-hover-text hover:bg-icon-button-bg flex cursor-pointer items-center gap-2 rounded p-1 text-sm"
                    onClick={() => handleOpenReferencedFile(fileName, "")}
                  >
                    <span className="font-medium">{fileName}</span>
                    <span className="text-muted-foreground text-xs">{filePath}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div> */}

        <div>
          <h3 className="mb-2 text-lg font-semibold">被引用的章节</h3>
          {Object.keys(references.sections).length === 0 ? (
            <p className="text-muted-foreground text-sm">{currentProjectFileName}中没有被引用的章节</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(references.sections).map(([referencedSectionName, sections]) => (
                <div key={referencedSectionName}>
                  <div className="text-select-option-text hover:text-select-option-hover-text hover:bg-icon-button-bg cursor-pointer rounded p-1 font-medium">
                    {referencedSectionName}
                  </div>
                  <div className="ml-4 mt-1 space-y-1">
                    {sections.map((fileName) => (
                      <div
                        onClick={() =>
                          project.referenceManager.jumpToReferenceLocation(fileName, referencedSectionName)
                        }
                        key={fileName}
                        className="border-muted text-select-option-text hover:text-select-option-hover-text hover:bg-icon-button-bg cursor-pointer rounded border-l-2 p-1 pl-2 text-sm"
                      >
                        {fileName}
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

export function SectionReferencePanel(props: { currentProjectFileName: string; sectionName: string }) {
  // const currentProjectFileName = props.currentProjectFileName;
  const sectionName = props.sectionName;
  const [project] = useAtom(activeProjectAtom);
  if (!project) return <></>;
  const [references, setReferences] = useState(project.references);
  function refresh() {
    setReferences({ ...project!.references });
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-col gap-2 p-2">
      {references.sections[sectionName].map((fileName) => (
        <div
          onClick={() => project.referenceManager.jumpToReferenceLocation(fileName, sectionName)}
          key={fileName}
          className="border-muted text-select-option-text w-full cursor-pointer rounded p-1 text-sm hover:ring"
        >
          {fileName}
        </div>
      ))}
    </div>
  );
}

SectionReferencePanel.open = (currentURI: URI, sectionName: string, sectionViewLocation: Vector) => {
  const fileName = PathString.getFileNameFromPath(currentURI.path);
  SubWindow.create({
    title: `引用它的地方`,
    children: <SectionReferencePanel currentProjectFileName={fileName} sectionName={sectionName} />,
    rect: new Rectangle(sectionViewLocation, new Vector(150, 150)),
    closeWhenClickOutside: true,
    closeWhenClickInside: true,
  });
};

ReferencesWindow.open = (currentURI: URI) => {
  const fileName = PathString.getFileNameFromPath(currentURI.path);
  SubWindow.create({
    title: "引用管理器：" + fileName,
    children: <ReferencesWindow currentProjectFileName={fileName} />,
    rect: new Rectangle(new Vector(100, 100), new Vector(300, 600)),
  });
};
