import { Button } from "@/components/ui/button";
import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Angry, MousePointerClick, RefreshCcw, Smile, Tags, Telescope } from "lucide-react";
import React from "react";
import { useAtom } from "jotai";
import { activeProjectAtom } from "@/state";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * 标签相关面板
 * @param param0
 */
export default function TagWindow() {
  const [project] = useAtom(activeProjectAtom);
  if (!project) return <></>;

  const [tagNameList, setTagNameList] = React.useState<
    { tagName: string; uuid: string; color: [number, number, number, number] }[]
  >([]);
  // 是否开启允许滑动移动摄像机
  const [isMouseEnterMoveCameraAble, setIsMouseEnterMoveCameraAble] = React.useState(false);
  // 是否开启透视
  const [isPerspective, setIsPerspective] = React.useState(false);

  function refreshTagNameList() {
    setTagNameList(project!.tagManager.refreshTagNamesUI());
  }

  React.useEffect(() => {
    refreshTagNameList();
  }, []);

  const handleMoveCameraToTag = (tagUUID: string) => {
    return () => {
      // 跳转到对应位置
      project.tagManager.moveCameraToTag(tagUUID);
      project.controller.resetCountdownTimer();
    };
  };

  const handleMouseEnterTag = (tagUUID: string) => {
    return () => {
      if (isMouseEnterMoveCameraAble) {
        project.tagManager.moveCameraToTag(tagUUID);
        project.controller.resetCountdownTimer();
      }
    };
  };

  const handleClickAddTag = () => {
    // 检查是否有选中的entity或连线
    if (
      project.stageManager.getSelectedEntities().length === 0 &&
      project.stageManager.getSelectedAssociations().length === 0
    ) {
      toast.error("请先选中舞台上的物体, 选中后再点此按钮，即可添标签");
    }
    project.tagManager.changeTagBySelected();
    project.controller.resetCountdownTimer();
    refreshTagNameList();
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Button size="icon" onClick={handleClickAddTag}>
              <Tags />
            </Button>
          </TooltipTrigger>
          <TooltipContent>将选中的节点添加到标签，如果选中了已经是标签的节点，则会移出标签</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button size="icon" onClick={refreshTagNameList}>
              <RefreshCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>如果舞台上的标签发生变更但此处未更新，可以手动刷新</TooltipContent>
        </Tooltip>

        {tagNameList.length >= 3 && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                size="icon"
                onClick={() => {
                  setIsMouseEnterMoveCameraAble(!isMouseEnterMoveCameraAble);
                }}
              >
                {isMouseEnterMoveCameraAble ? <Telescope /> : <MousePointerClick />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMouseEnterMoveCameraAble ? "快速瞭望模式" : "点击跳转模式"}</TooltipContent>
          </Tooltip>
        )}
        {tagNameList.length > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                size="icon"
                onClick={() => {
                  setIsPerspective(!isPerspective);
                }}
              >
                {isPerspective ? <Angry /> : <Smile />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPerspective ? "透视已开启" : "开启透视眼"}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 标签列表 */}
      {tagNameList.length === 0 ? (
        <div>
          <h3 className="text-select-text text-lg">当前还没有标签</h3>
          <p className="text-select-option-hover-text text-sm">
            给节点添加标签后会显示在左侧面板中，方便知道舞台上都有哪些主要内容，点击内容即可跳转
          </p>
        </div>
      ) : (
        <div className="mt-2 flex-1 flex-col justify-center overflow-y-auto p-2">
          {tagNameList.map((tag) => {
            return (
              <div
                key={tag.uuid}
                style={{ color: tag.color[3] === 0 ? "" : `rgba(${tag.color.join(",")})` }}
                className="text-select-option-text hover:text-select-option-hover-text hover:bg-icon-button-bg group flex cursor-pointer items-center text-left"
                onMouseEnter={handleMouseEnterTag(tag.uuid)}
              >
                <span
                  onClick={handleMoveCameraToTag(tag.uuid)}
                  className="flex-1 cursor-pointer truncate hover:underline"
                >
                  {tag.tagName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

TagWindow.open = () => {
  SubWindow.create({
    title: "标签管理器",
    children: <TagWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(150, 600)),
  });
};
