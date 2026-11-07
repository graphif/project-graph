import { Project } from "@/core/Project";
import { readImage } from "@/platform/clipboard";
import { MouseLocation } from "../../controlService/MouseLocation";
import { Settings } from "@/core/service/Settings";
import { applyBlackAndWhite, prepareImageBlobForImport } from "../imageUtils";
import { toast } from "sonner";
import { createImageNodeFromBlob } from "../imageNodeFactory";

export class CopyEngineImage {
  constructor(private project: Project) {}

  public async pasteImageFromSystemClipboard() {
    // 从系统粘贴板里读取图片
    const image = await readImage();
    if (!image) return;
    const bitmap = await createImageBitmap(image);
    const { width: origW, height: origH } = bitmap;

    if (origW <= 0 || origH <= 0) return;

    const origCanvas = document.createElement("canvas");
    origCanvas.width = origW;
    origCanvas.height = origH;
    const origCtx = origCanvas.getContext("2d")!;
    origCtx.drawImage(bitmap, 0, 0);
    bitmap.close();

    let w = origW;
    let h = origH;
    if (Settings.resizePastedImages) {
      const maxSize = Settings.maxPastedImageSize;
      const maxDim = Math.max(w, h);
      if (maxDim > maxSize) {
        const scale = maxSize / maxDim;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(origCanvas, 0, 0, w, h);

    if (Settings.compressImageToBlackAndWhite) {
      applyBlackAndWhite(canvas);
    }

    const outputType = Settings.compressImageToBlackAndWhite
      ? "image/png"
      : Settings.compressImageToWebp
        ? "image/webp"
        : "image/png";
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            if (outputType === "image/webp" && !b.type.includes("webp")) {
              toast.warning("当前系统 webview 不支持 WebP 编码，已回退为 PNG");
            }
            resolve(b);
          } else reject(new Error("canvas.toBlob returned null"));
        },
        outputType,
        Settings.compressImageToBlackAndWhite
          ? undefined
          : Settings.compressImageToWebp
            ? Settings.webpQuality
            : undefined,
      );
    });

    await this.pasteImageBlob(blob);
  }

  private async pasteImageBlob(blob: Blob) {
    const location = this.project.renderer.transformView2World(MouseLocation.vector());
    await createImageNodeFromBlob(this.project, blob, {
      location,
    });
  }

  public async pasteImageFromWebClipboard() {
    const clipboard = navigator.clipboard as any;
    if (!clipboard || typeof clipboard.read !== "function") return false;

    const items = (await clipboard.read()) as Array<{
      types: readonly string[];
      getType: (type: string) => Promise<Blob>;
    }>;

    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      const prepared = await prepareImageBlobForImport(blob);
      await this.pasteImageBlob(prepared.blob);
    }
  }
}
