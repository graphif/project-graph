import { Button } from "@/components/ui/button";
import { SubWindow } from "@/core/service/SubWindow";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function BackgroundManagerWindow() {
  const [project] = useAtom(activeProjectAtom);
  const [backgroundImages, setBackgroundImages] = useState<ImageNode[]>([]);

  useEffect(() => {
    if (project) {
      // 获取所有背景化的图片
      const images = project.stageManager.getImageNodes().filter((imageNode) => imageNode.isBackground);
      setBackgroundImages(images);
    }
  }, [project]);

  const handleRemoveBackground = (imageNode: ImageNode) => {
    if (project) {
      imageNode.isBackground = false;
      project.historyManager.recordStep();
      toast.success("已取消图片的背景化");
      // 刷新背景图片列表
      const images = project.stageManager.getImageNodes().filter((imageNode) => imageNode.isBackground);
      setBackgroundImages(images);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">背景管理器</h1>
      <div className="flex-1">
        {backgroundImages.length === 0 ? (
          <p className="text-muted-foreground text-center">当前舞台上没有背景化的图片</p>
        ) : (
          <div className="space-y-4">
            {backgroundImages.map((imageNode) => (
              <div key={imageNode.uuid} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-muted flex h-16 w-16 items-center justify-center rounded">
                    <span className="text-muted-foreground text-sm">图片</span>
                  </div>
                  <div>
                    <p className="font-medium">图片节点</p>
                    <p className="text-muted-foreground text-xs">{imageNode.uuid.substring(0, 8)}...</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleRemoveBackground(imageNode)}>
                  取消背景化
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

BackgroundManagerWindow.open = () => {
  SubWindow.create({
    title: "背景管理器",
    children: <BackgroundManagerWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(400, 500)),
  });
};
