import { memo, useCallback, useRef } from "react";
import { Project, ProjectState } from "./core/Project";
import { cn } from "@udecode/cn";
import { Button } from "./components/ui/button";
import { CircleAlert, CloudUpload, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip";
import { SoundService } from "./core/service/feedbackService/SoundService";

// 将 ProjectTabs 移出 App 组件，作为独立组件
export const ProjectTabs = memo(function ProjectTabs({
  projects,
  activeProject,
  onTabClick,
  onTabClose,
  isClassroomMode,
  ignoreMouseEvents,
}: {
  projects: Project[];
  activeProject: Project | undefined;
  onTabClick: (project: Project) => void;
  onTabClose: (project: Project) => void;
  isClassroomMode: boolean;
  ignoreMouseEvents: boolean;
}) {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // 保存滚动位置
  const saveScrollPosition = useCallback(() => {
    if (tabsContainerRef.current) {
      scrollPositionRef.current = tabsContainerRef.current.scrollLeft;
    }
  }, []);

  // 恢复滚动位置
  const restoreScrollPosition = useCallback(() => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollLeft = scrollPositionRef.current;
    }
  }, []);

  // 处理标签点击
  const handleTabClick = useCallback(
    (project: Project) => {
      saveScrollPosition();
      onTabClick(project);
      // 微任务中恢复滚动位置
      Promise.resolve().then(restoreScrollPosition);
    },
    [onTabClick, saveScrollPosition, restoreScrollPosition],
  );

  // 处理标签关闭
  const handleTabClose = useCallback(
    async (project: Project, e: React.MouseEvent) => {
      e.stopPropagation();
      saveScrollPosition();
      await onTabClose(project);
      Promise.resolve().then(restoreScrollPosition);
    },
    [onTabClose, saveScrollPosition, restoreScrollPosition],
  );

  // 监听滚动
  const handleScroll = useCallback(() => {
    saveScrollPosition();
  }, [saveScrollPosition]);

  return (
    <div
      ref={tabsContainerRef}
      className={cn(
        "scrollbar-hide z-10 flex h-4 overflow-x-auto whitespace-nowrap hover:opacity-100 sm:h-6 sm:gap-1",
        isClassroomMode && "opacity-0",
        ignoreMouseEvents && "pointer-events-none",
      )}
      onScroll={handleScroll}
    >
      {projects.map((project) => (
        <Button
          key={project.uri.toString()}
          className={cn(
            "hover:bg-primary/20 outline-inset h-full cursor-pointer rounded-none px-2 hover:opacity-100 sm:rounded-sm",
            activeProject?.uri.toString() === project.uri.toString() ? "bg-primary/70" : "bg-accent opacity-70",
          )}
          onMouseDown={(e) => {
            if (e.button === 0) {
              SoundService.play.mouseClickButton();
              handleTabClick(project);
            } else if (e.button === 1) {
              e.preventDefault();
              saveScrollPosition();
              onTabClose(project);
              Promise.resolve().then(restoreScrollPosition);
              SoundService.play.cuttingLineRelease();
            }
          }}
          onMouseEnter={() => {
            SoundService.play.mouseEnterButton();
          }}
        >
          <span className="text-xs">
            {project.uri.scheme === "draft"
              ? `临时草稿 (${project.uri.path})`
              : project.uri.scheme === "file"
                ? project.uri.path.split("/").pop()
                : project.uri.toString()}
          </span>
          <div
            className="hover:rotate-15 cursor-pointer overflow-hidden transition-transform hover:scale-110 hover:opacity-100"
            onClick={(e) => {
              handleTabClose(project, e);
              SoundService.play.cuttingLineRelease();
            }}
          >
            {project.state === ProjectState.Saved && <X className="scale-75 opacity-75" />}
            {project.state === ProjectState.Stashed && <CloudUpload />}
            {project.state === ProjectState.Unsaved && (
              <Tooltip>
                {/* 醒目提醒用户，崩溃了丢了文件别怪开发者提醒不到位 */}
                <TooltipTrigger>
                  <CircleAlert className="*:text-destructive! text-destructive! mt-1.5" />
                </TooltipTrigger>
                <TooltipContent>未保存！</TooltipContent>
              </Tooltip>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
});
