import TabContextMenu from "@/components/tab-context-menu";
import { SimpleCard } from "@/components/ui/card";
import { ComponentTab, Tab } from "@/core/Tab";
import { TabWorkspace } from "@/core/TabWorkspace";
import { activeResourceTabAtom, activeTabAtom, tabsAtom } from "@/state";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Transition } from "@headlessui/react";
import { useAtomValue } from "jotai";
import { X } from "lucide-react";
import React from "react";

/**
 * @param zoomStyle 可选的缩放样式，用于让浮动标签页跟随全局缩放
 */
export default function FloatingTabs({
  zoomStyle,
  onTabClose,
}: {
  zoomStyle?: React.CSSProperties;
  onTabClose: (tab: Tab) => void | Promise<void>;
}) {
  const floatingTabs = useAtomValue(tabsAtom).filter((tab) => tab.layout === "floating");
  const activeTab = useAtomValue(activeTabAtom);
  const activeResourceTab = useAtomValue(activeResourceTabAtom);

  const onClickInner = (tab: Tab) => {
    if (tab.closeWhenClickInside) {
      void TabWorkspace.close(tab.id);
    }
  };

  return (
    <div className="pointer-events-none fixed top-0 left-0 z-40 h-full w-full" style={zoomStyle}>
      {floatingTabs.map((tab) => (
        // transition 组件可以让关闭流程更平滑
        <Transition key={tab.id} appear={true} show={!tab.closing}>
          <SimpleCard
            data-pg-tab-id={tab.id}
            style={{
              top: tab.floatingRect.top + "px",
              left: tab.floatingRect.left + "px",
              zIndex: tab.zIndex,
              width: tab.floatingRect.width + "px",
              height: tab.floatingRect.height + "px",
            }}
            className={cn(
              "outline-primary pointer-events-auto absolute flex flex-col overflow-hidden shadow-md outline-0 transition",
              "data-closed:scale-90 data-closed:opacity-0",
              activeTab === tab && "outline-4",
            )}
            onClick={() => onClickInner(tab)}
            onMouseDown={(e) => {
              TabWorkspace.focus(tab.id);
              if (e.button !== 0) return;
              // 如果按到的元素的父元素都没有data-pg-drag-region属性，就不移动窗口
              if (!(e.target as HTMLElement).closest("[data-pg-drag-region]")) {
                return;
              }
              const start = new Vector(e.clientX, e.clientY);
              const originalRect = tab.floatingRect;
              const onMouseUp = (event: MouseEvent) => {
                window.removeEventListener("mouseup", onMouseUp);
                window.removeEventListener("mousemove", onMouseMove);
                const target = TabWorkspace.getDropTarget(event.clientX, event.clientY, true);
                TabWorkspace.clearDropPreview();
                if (target && tab.canDock) TabWorkspace.moveTab(tab.id, target);
              };
              const onMouseMove = (e: MouseEvent) => {
                const delta = new Vector(e.clientX, e.clientY).subtract(start);
                TabWorkspace.update(tab.id, { rect: originalRect.translate(delta) });
                TabWorkspace.previewDrop(e.clientX, e.clientY, true);
              };
              window.addEventListener("mouseup", onMouseUp);
              window.addEventListener("mousemove", onMouseMove);
            }}
            onTouchStart={(e) => {
              TabWorkspace.focus(tab.id);
              if (e.touches.length > 1) return;
              const touch = e.touches[0];
              // 如果按到的元素的父元素都没有data-pg-drag-region属性，就不移动窗口
              if (!(e.target as HTMLElement).closest("[data-pg-drag-region]")) {
                return;
              }
              const start = new Vector(touch.clientX, touch.clientY);
              const originalRect = tab.floatingRect;
              const onTouchEnd = (event: TouchEvent) => {
                window.removeEventListener("touchend", onTouchEnd);
                window.removeEventListener("touchmove", onTouchMove);
                const touch = event.changedTouches[0];
                const target = TabWorkspace.getDropTarget(touch.clientX, touch.clientY, true);
                TabWorkspace.clearDropPreview();
                if (target && tab.canDock) TabWorkspace.moveTab(tab.id, target);
              };
              const onTouchMove = (e: TouchEvent) => {
                if (e.touches.length > 1) return;
                const touch = e.touches[0];
                const delta = new Vector(touch.clientX, touch.clientY).subtract(start);
                TabWorkspace.update(tab.id, { rect: originalRect.translate(delta) });
                TabWorkspace.previewDrop(touch.clientX, touch.clientY, true);
              };
              window.addEventListener("touchend", onTouchEnd);
              window.addEventListener("touchmove", onTouchMove);
            }}
          >
            <div
              className={cn(
                "flex p-1",
                tab.titleBarOverlay && "pointer-events-none absolute top-0 right-0 z-100 w-max",
              )}
            >
              <TabContextMenu tab={tab} onClose={onTabClose}>
                <div
                  className="hover:bg-sidebar-accent hover:outline-sidebar-ring flex min-w-0 flex-1 cursor-grab items-center gap-2 rounded-sm px-1 transition-all hover:outline hover:outline-dashed active:cursor-grabbing"
                  data-pg-drag-region={tab.titleBarOverlay ? undefined : ""}
                >
                  <span className="truncate">{tab.title}</span>
                  {tab instanceof ComponentTab && tab.contextTarget === "activeResourceTab" && (
                    <span className="bg-muted text-muted-foreground max-w-48 shrink truncate rounded px-1.5 py-0.5 text-xs">
                      作用于：{activeResourceTab?.title ?? "无项目"}
                    </span>
                  )}
                </div>
              </TabContextMenu>
              {tab.closable && (
                <X
                  className="pointer-events-auto"
                  onClick={() => {
                    void onTabClose(tab);
                  }}
                />
              )}
            </div>
            <div className="relative min-h-0 flex-1 overflow-auto">{React.createElement(tab.getComponent())}</div>
            {/* 添加一个可调整大小的边缘，这里以右下角为例 */}
            <div
              className="bg-sub-window-resize-bg hover:bg-foreground/50 absolute right-0 bottom-0 h-4 w-4 cursor-se-resize"
              onMouseDown={(e) => {
                const start = new Vector(e.clientX, e.clientY);
                const originalRect = tab.floatingRect;
                const onMouseUp = () => {
                  window.removeEventListener("mouseup", onMouseUp);
                  window.removeEventListener("mousemove", onMouseMove);
                };
                const onMouseMove = (e: MouseEvent) => {
                  const delta = new Vector(e.clientX, e.clientY).subtract(start);
                  TabWorkspace.update(tab.id, {
                    rect: new Rectangle(originalRect.location, originalRect.size.add(delta)),
                  });
                };
                window.addEventListener("mouseup", onMouseUp);
                window.addEventListener("mousemove", onMouseMove);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 1) return;
                const touch = e.touches[0];
                const start = new Vector(touch.clientX, touch.clientY);
                const originalRect = tab.floatingRect;
                const onTouchEnd = () => {
                  window.removeEventListener("touchend", onTouchEnd);
                  window.removeEventListener("touchmove", onTouchMove);
                };
                const onTouchMove = (e: TouchEvent) => {
                  if (e.touches.length > 1) return;
                  const touch = e.touches[0];
                  const delta = new Vector(touch.clientX, touch.clientY).subtract(start);
                  TabWorkspace.update(tab.id, {
                    rect: new Rectangle(originalRect.location, originalRect.size.add(delta)),
                  });
                };
                window.addEventListener("touchend", onTouchEnd);
                window.addEventListener("touchmove", onTouchMove);
              }}
            />
            {/* 左下角 */}
            <div
              className="bg-sub-window-resize-bg hover:bg-foreground/50 absolute bottom-0 left-0 h-4 w-4 cursor-sw-resize"
              onMouseDown={(e) => {
                const start = new Vector(e.clientX, e.clientY);
                const originalRect = tab.floatingRect;
                const onMouseUp = () => {
                  window.removeEventListener("mouseup", onMouseUp);
                  window.removeEventListener("mousemove", onMouseMove);
                };
                const onMouseMove = (e: MouseEvent) => {
                  const delta = new Vector(e.clientX, e.clientY).subtract(start);
                  TabWorkspace.update(tab.id, {
                    rect: new Rectangle(
                      new Vector(originalRect.left + delta.x, originalRect.top),
                      new Vector(originalRect.width - delta.x, originalRect.height + delta.y),
                    ),
                  });
                };
                window.addEventListener("mouseup", onMouseUp);
                window.addEventListener("mousemove", onMouseMove);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 1) return;
                const touch = e.touches[0];
                const start = new Vector(touch.clientX, touch.clientY);
                const originalRect = tab.floatingRect;
                const onTouchEnd = () => {
                  window.removeEventListener("touchend", onTouchEnd);
                  window.removeEventListener("touchmove", onTouchMove);
                };
                const onTouchMove = (e: TouchEvent) => {
                  if (e.touches.length > 1) return;
                  const touch = e.touches[0];
                  const delta = new Vector(touch.clientX, touch.clientY).subtract(start);
                  TabWorkspace.update(tab.id, {
                    rect: new Rectangle(
                      new Vector(originalRect.left + delta.x, originalRect.top),
                      new Vector(originalRect.width - delta.x, originalRect.height + delta.y),
                    ),
                  });
                };
                window.addEventListener("touchend", onTouchEnd);
                window.addEventListener("touchmove", onTouchMove);
              }}
            />
          </SimpleCard>
        </Transition>
      ))}
    </div>
  );
}
