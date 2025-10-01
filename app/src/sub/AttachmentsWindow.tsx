import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import { Popover } from "@/components/ui/popover";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { useAtom } from "jotai";
import { BrushCleaning, FileOutput, Plus, RefreshCcw, Trash } from "lucide-react";
import mime from "mime";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AttachmentsWindow() {
  const [project] = useAtom(activeProjectAtom);
  if (!project) return <></>;
  const [attachments, setAttachments] = useState(new Map<string, Blob>());
  const [urls, setUrls] = useState(new Map<string, string>());

  function refresh() {
    setAttachments(project!.attachments);
  }
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const newUrls = new Map<string, string>();
    attachments.forEach((blob, id) => {
      const url = URL.createObjectURL(blob);
      newUrls.set(id, url);
    });
    setUrls(newUrls);

    return () => {
      newUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [attachments]);

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex gap-3">
        <Button
          onClick={async () => {
            const path = await open();
            if (!path) return;
            const uuid = await Dialog.input("附件 ID", "如果不需要自定义就直接点确定", {
              defaultValue: crypto.randomUUID(),
            });
            if (!uuid) return;
            const u8a = await readFile(path);
            const blob = new Blob([new Uint8Array(u8a)], { type: mime.getType(path) || "application/octet-stream" });
            project.attachments.set(uuid, blob);
            refresh();
          }}
        >
          <Plus />
          添加
        </Button>
        <Button onClick={refresh} variant="outline">
          <RefreshCcw />
          刷新
        </Button>
        <Popover.Confirm
          title="清理附件"
          description="删除所有未被实体引用的附件，且此操作不可撤销，是否继续？"
          onConfirm={async () => {
            let deletedCount = 0;
            const referencedAttachmentIds = project.stageManager
              .getEntities()
              .map((it) => ("attachmentId" in it ? (it.attachmentId as string) : ""))
              .filter(Boolean);
            for (const id of project.attachments.keys()) {
              if (!referencedAttachmentIds.includes(id)) {
                project.attachments.delete(id);
                deletedCount++;
              }
            }
            toast.success(`已清理 ${deletedCount} 个未被引用的附件`);
            setTimeout(() => {
              refresh();
            }, 500); // TODO: 在windows上未生效
          }}
          destructive
        >
          <Button variant="outline">
            <BrushCleaning />
            清理
          </Button>
        </Popover.Confirm>
      </div>
      <div>
        <span className="text-xs opacity-50">提示：对着附件右键可进行操作</span>
      </div>

      {/* 一个又一个的附件展示 */}
      <div className="flex flex-wrap gap-2">
        {attachments.entries().map(([id, blob]) => (
          <ContextMenu key={id}>
            {/* 非右键的直接展示部分 */}
            <ContextMenuTrigger>
              <Card className="gap-2 p-2">
                {/* <Separator /> */}
                {blob.type.startsWith("image") && (
                  <img src={urls.get(id)} alt={id} className="max-w-full rounded-lg object-contain" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] opacity-50">{id}</span>
                  <div className="flex flex-wrap gap-x-2 text-sm">
                    <span>{blob.type}</span>
                    <span>{formatBytes(blob.size)}</span>
                  </div>
                </div>
              </Card>
            </ContextMenuTrigger>

            {/* 右键内容 */}
            <ContextMenuContent>
              <ContextMenuItem
                onClick={async () => {
                  const path = await save({
                    filters: [
                      {
                        name: blob.type,
                        extensions: [...(mime.getAllExtensions(blob.type) ?? [])],
                      },
                    ],
                  });
                  if (!path) return;
                  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
                }}
              >
                <FileOutput />
                导出
              </ContextMenuItem>
              <ContextMenuItem
                variant="destructive"
                onClick={async () => {
                  if (await Dialog.confirm("删除附件", "所有引用了此附件的实体将无法正常渲染", { destructive: true })) {
                    project.attachments.delete(id);
                    refresh();
                  }
                }}
              >
                <Trash />
                删除
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
}

/** 将bytes转换为人类可读形式 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

AttachmentsWindow.open = () => {
  SubWindow.create({
    title: "附件管理器",
    children: <AttachmentsWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(300, 600)),
  });
};
