import { SimpleCard } from "@/components/ui/card";
import { SubWindow } from "@/core/service/SubWindow";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Transition } from "@headlessui/react";
import { X } from "lucide-react";

/**
 * 这个组件中管理了所有的 子窗口
 * @returns
 */
export default function RenderSubWindows() {
  const subWindows = SubWindow.use();

  const onClickInner = (win: SubWindow.Window) => {
    if (win.closeWhenClickInside) {
      SubWindow.close(win.id);
    }
  };

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-40 h-full w-full">
      {subWindows.map((win: SubWindow.Window) => (
        // transition 组件可以让关闭流程更平滑
        <Transition key={win.id} appear={true} show={!win.closing}>
          <SimpleCard
            data-pg-window-id={win.id}
            style={{
              top: win.rect.top + "px",
              left: win.rect.left + "px",
              zIndex: win.zIndex,
              width: win.rect.width + "px",
              height: win.rect.height + "px",
            }}
            className={cn(
              "pointer-events-auto absolute flex flex-col overflow-hidden outline-0 transition",
              "data-closed:scale-90 data-closed:opacity-0",
            )}
            onClick={() => onClickInner(win)}
            onMouseDown={(e) => {
              SubWindow.focus(win.id);
              // 如果按到的元素的父元素都没有data-pg-drag-region属性，就不移动窗口
              if (!(e.target as HTMLElement).closest("[data-pg-drag-region]")) {
                return;
              }
              const start = new Vector(e.clientX, e.clientY);
              const onMouseUp = () => {
                window.removeEventListener("mouseup", onMouseUp);
                window.removeEventListener("mousemove", onMouseMove);
              };
              const onMouseMove = (e: MouseEvent) => {
                const delta = new Vector(e.clientX, e.clientY).subtract(start);
                const newRect = win.rect.translate(delta);
                SubWindow.update(win.id, { rect: newRect });
              };
              window.addEventListener("mouseup", onMouseUp);
              window.addEventListener("mousemove", onMouseMove);
            }}
            onTouchStart={(e) => {
              SubWindow.focus(win.id);
              if (e.touches.length > 1) return;
              const touch = e.touches[0];
              // 如果按到的元素的父元素都没有data-pg-drag-region属性，就不移动窗口
              if (!(e.target as HTMLElement).closest("[data-pg-drag-region]")) {
                return;
              }
              const start = new Vector(touch.clientX, touch.clientY);
              const onTouchEnd = () => {
                window.removeEventListener("touchend", onTouchEnd);
                window.removeEventListener("touchmove", onTouchMove);
              };
              const onTouchMove = (e: TouchEvent) => {
                if (e.touches.length > 1) return;
                const touch = e.touches[0];
                const delta = new Vector(touch.clientX, touch.clientY).subtract(start);
                const newRect = win.rect.translate(delta);
                SubWindow.update(win.id, { rect: newRect });
              };
              window.addEventListener("touchend", onTouchEnd);
              window.addEventListener("touchmove", onTouchMove);
            }}
          >
            <div
              className={cn(
                "flex p-1",
                win.titleBarOverlay && "pointer-events-none absolute left-0 top-0 z-[100] w-full",
              )}
            >
              <div
                className="hover:bg-sidebar-accent hover:outline-sidebar-ring flex-1 cursor-grab rounded-sm px-1 transition-all hover:outline hover:outline-dashed active:cursor-grabbing"
                data-pg-drag-region={win.titleBarOverlay ? undefined : ""}
              >
                {win.title}
              </div>
              {win.closable && (
                <X
                  className="pointer-events-auto"
                  onClick={() => {
                    SubWindow.close(win.id);
                  }}
                />
              )}
            </div>
            <div className="flex-1 overflow-auto">
              {win.children && win.children instanceof Object && "props" in win.children
                ? {
                    ...win.children,
                    props: {
                      ...(win.children.props || {}),
                      winId: win.id,
                    },
                  }
                : win.children}
            </div>
            {/* 添加一个可调整大小的边缘，这里以右下角为例 */}
            <div
              className="bg-sub-window-resize-bg hover:bg-foreground/50 absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
              onMouseDown={(e) => {
                const start = new Vector(e.clientX, e.clientY);
                const onMouseUp = () => {
                  window.removeEventListener("mouseup", onMouseUp);
                  window.removeEventListener("mousemove", onMouseMove);
                };
                const onMouseMove = (e: MouseEvent) => {
                  const delta = new Vector(e.clientX, e.clientY).subtract(start);
                  SubWindow.update(win.id, {
                    rect: new Rectangle(win.rect.location, win.rect.size.add(delta)),
                  });
                };
                window.addEventListener("mouseup", onMouseUp);
                window.addEventListener("mousemove", onMouseMove);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 1) return;
                const touch = e.touches[0];
                const start = new Vector(touch.clientX, touch.clientY);
                const onTouchEnd = () => {
                  window.removeEventListener("touchend", onTouchEnd);
                  window.removeEventListener("touchmove", onTouchMove);
                };
                const onTouchMove = (e: TouchEvent) => {
                  if (e.touches.length > 1) return;
                  const touch = e.touches[0];
                  const delta = new Vector(touch.clientX, touch.clientY).subtract(start);
                  SubWindow.update(win.id, {
                    rect: new Rectangle(win.rect.location, win.rect.size.add(delta)),
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
                const onMouseUp = () => {
                  window.removeEventListener("mouseup", onMouseUp);
                  window.removeEventListener("mousemove", onMouseMove);
                };
                const onMouseMove = (e: MouseEvent) => {
                  const delta = new Vector(e.clientX, e.clientY).subtract(start);
                  SubWindow.update(win.id, {
                    rect: new Rectangle(
                      new Vector(win.rect.left + delta.x, win.rect.top),
                      new Vector(win.rect.width - delta.x, win.rect.height + delta.y),
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
                const onTouchEnd = () => {
                  window.removeEventListener("touchend", onTouchEnd);
                  window.removeEventListener("touchmove", onTouchMove);
                };
                const onTouchMove = (e: TouchEvent) => {
                  if (e.touches.length > 1) return;
                  const touch = e.touches[0];
                  const delta = new Vector(touch.clientX, touch.clientY).subtract(start);
                  SubWindow.update(win.id, {
                    rect: new Rectangle(
                      new Vector(win.rect.left + delta.x, win.rect.top),
                      new Vector(win.rect.width - delta.x, win.rect.height + delta.y),
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
