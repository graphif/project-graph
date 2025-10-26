import { cn } from "./utils/cn";

/**
 * 拖拽鼠标进入舞台时，覆盖一个提示区域
 * 用于提示用户在不同位置释放有不同的效果
 */
export const DropWindowCover = ({
  dropMouseLocation,
}: {
  dropMouseLocation: "top" | "middle" | "bottom" | "notInWindowZone";
}) => {
  //
  return (
    <div className="z-5 absolute left-0 top-0 flex h-screen w-full flex-col">
      <div
        className={cn(
          "bg-card/80 flex flex-1 flex-col items-center justify-center text-xl",
          dropMouseLocation === "top" && "text-destructive bg-transparent",
        )}
      >
        <p>拖拽到这里：追加到舞台</p>
        <span className="text-sm">如果是png图片文件，则追加到舞台，如果是prg工程文件，则打开标签页</span>
      </div>
      <div
        className={cn(
          "bg-card/80 flex flex-1 flex-col items-center justify-center text-xl",
          dropMouseLocation === "middle" && "text-destructive bg-transparent",
        )}
      >
        <p>
          拖拽到这里：以 <span className="text-3xl">相对路径</span> 生成文本节点到舞台
        </p>
        <span className="text-sm">相对路径待完善，还没做好</span>
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
      </div>
    </div>
  );
};
