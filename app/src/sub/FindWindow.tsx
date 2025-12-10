import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchScope } from "@/core/service/dataManageService/contentSearchEngine/contentSearchEngine";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import {
  CaseSensitive,
  MessageCircleQuestionMark,
  Square,
  SquareDashedTopSolid,
  SquareDashedMousePointer,
  Telescope,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * 搜索内容的面板
 */
export default function FindWindow() {
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [searchString, setSearchString] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; uuid: string }[]>([]);
  // 是否开启快速瞭望模式
  const [isMouseEnterCameraMovable, setIsMouseEnterCameraMovable] = useState(false);
  // 搜索范围
  const [searchScope, setSearchScope] = useState<SearchScope>(SearchScope.ALL);
  const [project] = useAtom(activeProjectAtom);

  const selectAllResult = () => {
    for (const result of searchResults) {
      const node = project?.stageManager.get(result.uuid);
      if (node) {
        node.isSelected = true;
      }
    }
    toast.success(`${searchResults.length} 个结果已全部选中`);
  };

  useEffect(() => {
    if (!project) return;
    project.contentSearch.isCaseSensitive = isCaseSensitive;
  }, [project, isCaseSensitive]);

  useEffect(() => {
    if (!project) return;
    project.contentSearch.searchScope = searchScope;
  }, [project, searchScope]);

  const clearSearch = () => {
    setSearchString("");
    setSearchResults([]);
  };

  useEffect(() => {
    clearSearch();
    return () => {
      clearSearch();
    };
  }, []);

  if (!project) return <></>;
  return (
    <div className="flex flex-col gap-2 p-4">
      <Input
        placeholder="请输入要在舞台上搜索的内容"
        autoFocus
        type="search"
        onChange={(e) => {
          setSearchString(e.target.value);
          project.contentSearch.startSearch(e.target.value, false);
          setSearchResults(
            project.contentSearch.searchResultNodes.map((node) => ({
              title: project.contentSearch.getStageObjectText(node),
              uuid: node.uuid,
            })),
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (searchString !== "") {
              clearSearch();
            }
          }
        }}
        value={searchString}
      />
      <div className="my-1 flex flex-wrap gap-3">
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="icon"
              variant={isCaseSensitive ? "default" : "outline"}
              onClick={() => {
                const currentResult = !isCaseSensitive;
                setIsCaseSensitive(currentResult);
              }}
            >
              <CaseSensitive />
            </Button>
          </TooltipTrigger>
          <TooltipContent>区分大小写</TooltipContent>
        </Tooltip>

        {/* 搜索范围选择按钮组 */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="icon"
              variant={searchScope === SearchScope.ALL ? "default" : "outline"}
              onClick={() => {
                setSearchScope(SearchScope.ALL);
              }}
            >
              <Square />
            </Button>
          </TooltipTrigger>
          <TooltipContent>搜索整个舞台</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              size="icon"
              variant={searchScope === SearchScope.SELECTED ? "default" : "outline"}
              onClick={() => {
                setSearchScope(SearchScope.SELECTED);
              }}
            >
              <SquareDashedTopSolid />
            </Button>
          </TooltipTrigger>
          <TooltipContent>只搜索选中的内容</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              size="icon"
              variant={searchScope === SearchScope.SELECTED_BOUNDS ? "default" : "outline"}
              onClick={() => {
                setSearchScope(SearchScope.SELECTED_BOUNDS);
              }}
            >
              <SquareDashedMousePointer />
            </Button>
          </TooltipTrigger>
          <TooltipContent>搜索选中内容的外接矩形范围</TooltipContent>
        </Tooltip>

        {searchResults.length > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Button size="icon" variant="outline" onClick={selectAllResult}>
                <SquareDashedTopSolid strokeWidth={1.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>将全部结果选中</TooltipContent>
          </Tooltip>
        )}

        {searchResults.length >= 3 && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                size="icon"
                variant={isMouseEnterCameraMovable ? "default" : "outline"}
                onClick={() => {
                  setIsMouseEnterCameraMovable(!isMouseEnterCameraMovable);
                }}
              >
                <Telescope />
              </Button>
            </TooltipTrigger>
            <TooltipContent>快速瞭望模式</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                Dialog.confirm(
                  "帮助和提示",
                  "如果关闭窗口后发现红框闪烁残留，可以尝试再打开一次搜索窗口，在搜索框中随便输入点东西然后再删除干净。",
                );
              }}
            >
              <MessageCircleQuestionMark />
            </Button>
          </TooltipTrigger>
          <TooltipContent>使用说明</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {searchString === "" && <div className="text-center">请输入搜索内容</div>}
        {searchResults.length === 0 && searchString !== "" && (
          <div className="text-center">没有搜索结果:`{searchString}`</div>
        )}
        {searchResults.map((result, index) => (
          <div
            key={result.uuid}
            className="hover:text-panel-success-text flex cursor-pointer truncate text-xs hover:underline"
            onMouseEnter={() => {
              project.controller.resetCountdownTimer();
              if (isMouseEnterCameraMovable) {
                const node = project.stageManager.get(result.uuid);
                if (node) {
                  project.camera.bombMove(node.collisionBox.getRectangle().center);
                  project.effects.addEffect(RectangleLittleNoteEffect.fromSearchNode(node));
                }
              }
            }}
            onClick={() => {
              project.controller.resetCountdownTimer();
              const node = project.stageManager.get(result.uuid);
              if (node) {
                project.camera.bombMove(node.collisionBox.getRectangle().center);
                project.effects.addEffect(RectangleLittleNoteEffect.fromSearchNode(node));
              }
            }}
          >
            <span className="bg-secondary rounded-sm px-2">{index + 1}</span>
            {result.title}
          </div>
        ))}
      </div>
    </div>
  );
}

FindWindow.open = () => {
  SubWindow.create({
    title: "搜索",
    children: <FindWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(300, 600)),
  });
};
