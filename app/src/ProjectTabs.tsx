import { Vector } from "@graphif/data-structures";
import { cn } from "@udecode/cn";
import { useAtomValue } from "jotai";
import { CircleAlert, CloudUpload, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import TabContextMenu from "./components/tab-context-menu";
import { Button } from "./components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip";
import { Project, ProjectState } from "./core/Project";
import { SoundService } from "./core/service/feedbackService/SoundService";
import { Settings } from "./core/service/Settings";
import { ComponentTab, Tab } from "./core/Tab";
import { TabWorkspace } from "./core/TabWorkspace";
import { activeResourceTabAtom } from "./state";
import { replaceTextWhenProtect } from "./utils/font";

// 将 ProjectTabs 移出 App 组件，作为独立组件
export const ProjectTabs = memo(function ProjectTabs({
  groupId,
  tabs,
  activeTab,
  onTabClick,
  onTabClose,
  isClassroomMode,
}: {
  groupId: string;
  tabs: Tab[];
  activeTab: Tab | undefined;
  onTabClick: (tab: Tab) => void;
  onTabClose: (tab: Tab) => void;
  isClassroomMode: boolean;
}) {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const [protectingPrivacy, setProtectingPrivacy] = useState(Settings.protectingPrivacy);
  const activeResourceTab = useAtomValue(activeResourceTabAtom);

  useEffect(() => {
    const unwatch = Settings.watch("protectingPrivacy", setProtectingPrivacy);
    return unwatch;
  }, []);

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
    (tab: Tab) => {
      saveScrollPosition();
      onTabClick(tab);
      // 微任务中恢复滚动位置
      Promise.resolve().then(restoreScrollPosition);
    },
    [onTabClick, saveScrollPosition, restoreScrollPosition],
  );

  // 处理标签关闭
  const handleTabClose = useCallback(
    async (tab: Tab, e: React.MouseEvent) => {
      e.stopPropagation();
      saveScrollPosition();
      await onTabClose(tab);
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
      data-pg-tab-bar
      data-pg-tab-group-bar-id={groupId}
      className={cn(
        "scrollbar-hide z-10 flex h-8 items-center gap-1.5 overflow-x-auto px-3 py-1 whitespace-nowrap transition-opacity hover:opacity-100",
        isClassroomMode && "opacity-0",
      )}
      onScroll={handleScroll}
    >
      {tabs.map((tab) => (
        <TabContextMenu key={tab.id} tab={tab} onClose={onTabClose}>
          <Button
            data-pg-docked-tab-id={tab.id}
            className={cn(
              "outline-inset h-full shrink-0 cursor-pointer rounded-full px-3 shadow-xs",
              activeTab === tab
                ? "bg-primary/20 text-foreground hover:bg-primary/25 ring-primary/40 ring-1 ring-inset"
                : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground",
              tab instanceof Project && tab.isSaving && "animate-pulse",
            )}
            onMouseDown={(e) => {
              if (e.button === 0) {
                SoundService.play.mouseClickButton();
                handleTabClick(tab);
                const start = new Vector(e.clientX, e.clientY);
                let dragged = false;
                const onMouseUp = (event: MouseEvent) => {
                  window.removeEventListener("mousemove", onMouseMove);
                  window.removeEventListener("mouseup", onMouseUp);
                  const target = TabWorkspace.getDropTarget(event.clientX, event.clientY);
                  TabWorkspace.clearDropPreview();
                  if (!dragged) return;
                  if (target) {
                    TabWorkspace.moveTab(tab.id, target);
                  } else {
                    TabWorkspace.float(tab.id, new Vector(event.clientX - 80, event.clientY - 12));
                  }
                };
                const onMouseMove = (event: MouseEvent) => {
                  if (new Vector(event.clientX, event.clientY).subtract(start).magnitude() < 8) return;
                  dragged = true;
                  TabWorkspace.previewDrop(event.clientX, event.clientY);
                };
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
              } else if (e.button === 1) {
                e.preventDefault();
                saveScrollPosition();
                onTabClose(tab);
                Promise.resolve().then(restoreScrollPosition);
                SoundService.play.cuttingLineRelease();
              }
            }}
            onMouseEnter={() => {
              SoundService.play.mouseEnterButton();
            }}
          >
            <span className="flex items-center gap-1 text-xs">
              {tab.icon && <tab.icon className="size-3" />}
              {(() => {
                const name = tab.title;
                return protectingPrivacy ? replaceTextWhenProtect(name ?? "") : name;
              })()}
              {tab instanceof ComponentTab && tab.contextTarget === "activeResourceTab" && (
                <span className="max-w-32 truncate opacity-70">→ {activeResourceTab?.title ?? "无项目"}</span>
              )}
            </span>
            <div
              className="flex size-4 cursor-pointer items-center justify-center hover:opacity-100"
              onClick={(e) => {
                if (tab instanceof Project && tab.isSaving) {
                  // 如果正在保存中，显示提示
                  toast.warning("正在保存中，请勿擅自做多余的操作");
                  SoundService.play.cuttingLineRelease();
                } else if (tab instanceof Project && tab.projectState === ProjectState.Unsaved) {
                  // 如果是未保存状态，根据项目类型执行不同操作
                  if (tab.uri.scheme === "draft") {
                    // 草稿文件，弹出对话框
                    handleTabClose(tab, e);
                    SoundService.play.cuttingLineRelease();
                  } else {
                    // 已有的文件，直接保存
                    tab.save();
                    SoundService.play.cuttingLineRelease();
                  }
                } else {
                  // 其他状态，执行关闭操作
                  handleTabClose(tab, e);
                  SoundService.play.cuttingLineRelease();
                }
              }}
            >
              {tab instanceof Project && tab.isSaving ? (
                <span className="grid size-3.5 animate-spin grid-cols-2">
                  <span className="border-accent-foreground w-full animate-pulse rounded-full border-1 p-0.5"></span>
                  <span className="border-accent-foreground w-full rounded-full border-1 p-0.5"></span>
                  <span className="border-accent-foreground w-full rounded-full border-1 p-0.5"></span>
                  <span className="border-accent-foreground w-full animate-pulse rounded-full border-1 p-0.5"></span>
                </span>
              ) : tab instanceof Project && tab.projectState === ProjectState.Saved ? (
                <X className="scale-75 opacity-75" />
              ) : tab instanceof Project && tab.projectState === ProjectState.Stashed ? (
                <CloudUpload />
              ) : tab instanceof Project ? (
                <Tooltip>
                  {/* 醒目提醒用户，崩溃了丢了文件别怪开发者提醒不到位 */}
                  <TooltipTrigger>
                    <CircleAlert className="*:text-destructive! text-destructive!" />
                  </TooltipTrigger>
                  <TooltipContent>未保存！</TooltipContent>
                </Tooltip>
              ) : (
                <X className="scale-75 opacity-75" />
              )}
            </div>
          </Button>
        </TabContextMenu>
      ))}
    </div>
  );
});
