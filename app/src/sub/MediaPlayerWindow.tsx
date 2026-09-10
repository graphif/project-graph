import { Project } from "@/core/Project";
import { createSubWindow } from "@/core/subWindowOpen";
import { MediaNode } from "@/core/stage/stageObject/entity/MediaNode";
import { TabWorkspace } from "@/core/TabWorkspace";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { store, tabsAtom } from "@/state";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const mediaPlayerTabIds = new Set<string>();

function MediaPlayerWindowContent({
  tabId,
  project,
  node,
}: {
  tabId: string;
  project: Project;
  node: MediaNode;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const blob = useMemo(
    () => project.attachments.get(node.attachmentId),
    [project, node.attachmentId],
  );

  useEffect(() => {
    return () => {
      mediaPlayerTabIds.delete(tabId);
    };
  }, [tabId]);

  useEffect(() => {
    if (!blob) {
      setError(true);
      return;
    }
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  if (!blob || error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm opacity-50">
        文件缺失
      </div>
    );
  }

  if (!blobUrl) return null;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="truncate px-2 py-1 text-xs opacity-60">
        {node.title || "媒体播放"}
      </div>
      <div className="flex-1 overflow-hidden">
        {node.mediaKind === "video" ? (
          <video
            controls
            autoPlay
            className="h-full w-full object-contain"
            src={blobUrl}
            onError={() => {
              setError(true);
              toast.error("视频播放失败");
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <audio
              controls
              autoPlay
              src={blobUrl}
              onError={() => {
                setError(true);
                toast.error("音频播放失败");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

MediaPlayerWindowContent.open = (project: Project, node: MediaNode) => {
  const existing = store
    .get(tabsAtom)
    .find((tab) => !tab.closing && mediaPlayerTabIds.has(tab.id));
  if (existing) {
    void TabWorkspace.close(existing.id);
  }

  const w = node.mediaKind === "video" ? 640 : 480;
  const h = node.mediaKind === "video" ? 400 : 160;

  const win = createSubWindow("MediaPlayerWindow", {
    title: node.title || "媒体播放",
    rect: new Rectangle(
      new Vector(
        Math.max(0, (innerWidth - w) / 2),
        Math.max(0, (innerHeight - h) / 2),
      ),
      new Vector(w, h),
    ),
    closeWhenClickOutside: false,
    closable: true,
    children: null,
  });

  mediaPlayerTabIds.add(win.id);

  TabWorkspace.update(win.id, {
    children: (
      <MediaPlayerWindowContent
        tabId={win.id}
        project={project}
        node={node}
      />
    ),
  });
};

export default MediaPlayerWindowContent;
