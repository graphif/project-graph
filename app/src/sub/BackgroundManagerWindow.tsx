import { Project } from "@/core/Project";
import { Button } from "@/components/ui/button";
import { SubWindow } from "@/core/service/SubWindow";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { activeTabAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function BackgroundManagerWindow() {
  const [tab] = useAtom(activeTabAtom);
  const project = tab instanceof Project ? tab : undefined;
  const [backgroundImages, setBackgroundImages] = useState<ImageNode[]>([]);
  const [urls, setUrls] = useState(new Map<string, string>());
  const [brokenUuids, setBrokenUuids] = useState(new Set<string>());

  useEffect(() => {
    if (project) {
      // 获取所有背景化的图片
      const images = project.stageManager.getImageNodes().filter((imageNode) => imageNode.isBackground);
      setBackgroundImages(images);
    }
  }, [project]);

  useEffect(() => {
    if (!project) return;
    const newUrls = new Map<string, string>();
    for (const imageNode of backgroundImages) {
      const blob = project.attachments.get(imageNode.attachmentId);
      if (!blob) continue;
      newUrls.set(imageNode.uuid, URL.createObjectURL(blob));
    }
    setUrls(newUrls);
    setBrokenUuids((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const uuid of prev) {
        if (backgroundImages.some((it) => it.uuid === uuid)) next.add(uuid);
      }
      return next;
    });
    return () => {
      newUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [project, backgroundImages]);

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
                  <div className="bg-muted relative flex h-16 w-16 items-center justify-center overflow-hidden rounded">
                    {urls.get(imageNode.uuid) && !brokenUuids.has(imageNode.uuid) ? (
                      <img
                        src={urls.get(imageNode.uuid)}
                        alt={imageNode.uuid}
                        className="h-full w-full object-cover"
                        onError={() => {
                          setBrokenUuids((prev) => new Set(prev).add(imageNode.uuid));
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {imageNode.state === "notFound" ? "找不到" : "无预览"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">图片节点</p>
                    <p className="text-muted-foreground text-xs">{imageNode.uuid.substring(0, 8)}...</p>
                    <p className="text-muted-foreground text-xs">{imageNode.attachmentId.substring(0, 8)}...</p>
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
