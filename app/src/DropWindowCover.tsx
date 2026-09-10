import { cn } from "./utils/cn";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import { isMac } from "./utils/platform";
import { DragFileIntoStageEngine } from "./core/service/dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";
import { isMediaFilePath } from "./core/service/dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";
import type { Project } from "./core/Project";

/**
 * 拖拽鼠标进入舞台时，覆盖一个提示区域
 * 用于提示用户在不同位置释放有不同的效果
 */
export const DropWindowCover = ({ project }: { project: Project }) => {
  const fadeOutMs = 700;
  const [dropMouseLocation, setDropMouseLocation] = useState<"top" | "middle" | "bottom" | "notInWindowZone">(
    "notInWindowZone",
  );
  const [isFadingOut, setIsFadingOut] = useState(false);
  const isDraft = project.isDraft;

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const cancelAnimation = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      hideTimerRef.current = null;
      rafRef.current = null;
    };

    const unlistenPromise = getCurrentWindow().onDragDropEvent(async (event) => {
      const size = await getCurrentWindow().outerSize();
      const logicalHeight = isMac ? size.height / (await getCurrentWindow().scaleFactor()) : size.height;
      const getDropLocation = (y: number) =>
        y <= logicalHeight / 3 ? "top" : y <= (logicalHeight / 3) * 2 ? "middle" : "bottom";

      if (event.payload.type === "over") {
        cancelAnimation();
        setIsFadingOut(false);
        setDropMouseLocation(getDropLocation(event.payload.position.y));
      } else if (event.payload.type === "leave") {
        cancelAnimation();
        setIsFadingOut(false);
        setDropMouseLocation("notInWindowZone");
      } else if (event.payload.type === "drop") {
        cancelAnimation();
        const dropLocation = getDropLocation(event.payload.position.y);
        setIsFadingOut(false);
        setDropMouseLocation(dropLocation);
        rafRef.current = requestAnimationFrame(() => {
          setIsFadingOut(true);
        });
        hideTimerRef.current = setTimeout(() => {
          setDropMouseLocation("notInWindowZone");
          setIsFadingOut(false);
        }, fadeOutMs);

        if (dropLocation === "top") {
          DragFileIntoStageEngine.handleDrop(project, event.payload.paths);
        } else {
          const mediaPaths = event.payload.paths.filter(isMediaFilePath);
          const otherPaths = event.payload.paths.filter((p) => !isMediaFilePath(p));
          if (mediaPaths.length > 0) {
            DragFileIntoStageEngine.handleDrop(project, mediaPaths);
          }
          if (otherPaths.length > 0) {
            if (dropLocation === "middle") {
              DragFileIntoStageEngine.handleDropFileRelativePath(project, otherPaths);
            } else {
              DragFileIntoStageEngine.handleDropFileAbsolutePath(project, otherPaths);
            }
          }
        }
      }
    });

    return () => {
      cancelAnimation();
      unlistenPromise.then((f) => f()).catch(() => {});
    };
  }, [project]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-5 flex h-screen w-full flex-col transition-opacity duration-700 ease-out",
        dropMouseLocation === "notInWindowZone" ? "opacity-0" : isFadingOut ? "opacity-0" : "opacity-100",
      )}
    >
      <div
        className={cn(
          "bg-card/80 flex flex-1 flex-col items-center justify-center text-xl",
          dropMouseLocation === "top" && "text-destructive bg-transparent",
        )}
      >
        <p>拖拽到这里：追加到舞台</p>
        <span className="text-sm">
          如果是图片文件（png/jpg/jpeg/webp）或音视频文件，则追加到舞台，如果是prg工程文件，则打开标签页
        </span>
      </div>
      <div
        className={cn(
          "bg-card/80 flex flex-1 flex-col items-center justify-center text-xl",
          dropMouseLocation === "middle" && !isDraft && "text-destructive bg-transparent",
          isDraft && "cursor-not-allowed opacity-40",
        )}
      >
        <p>
          拖拽到这里：以 <span className="text-3xl">相对路径</span> 生成文本节点到舞台
        </p>
        {isDraft && <span className="text-sm">（草稿文件无路径，无法使用相对路径）</span>}
        <span className="text-sm">音频/视频文件无论落在哪个区域都会作为媒体节点导入，只有其它文件才会生成路径文本节点</span>
      </div>
      <div
        className={cn(
          "bg-card/80 flex flex-1 flex-col items-center justify-center text-xl",
          dropMouseLocation === "bottom" && "text-destructive bg-transparent",
        )}
      >
        <p>
          拖拽到这里：以 <span className="text-3xl">绝对路径</span> 生成文本节点到舞台
        </p>

        <span className="text-sm">
          这样就可以构建外部文件链接，选中路径为内容的文本节点，直接调用系统默认方式打开此文件了
        </span>
        <span className="text-sm">音频/视频文件无论落在哪个区域都会作为媒体节点导入，只有其它文件才会生成路径文本节点</span>
      </div>
    </div>
  );
};
