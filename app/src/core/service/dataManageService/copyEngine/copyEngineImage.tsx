import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { MouseLocation } from "../../controlService/MouseLocation";
import { Settings } from "@/core/service/Settings";
import { applyBlackAndWhite } from "../imageUtils";
import { toast } from "sonner";

export class CopyEngineImage {
  constructor(private project: Project) {}

  public async pasteImageFromTauriClipboard() {
    // 从系统粘贴板里读取图片
    const image = await readImage();
    const { width: origW, height: origH } = await image.size();

    if (origW <= 0 || origH <= 0) return;

    const rgba = await image.rgba();
    const expectedLength = origW * origH * 4;
    const clamped = rgba instanceof Uint8ClampedArray ? rgba : new Uint8ClampedArray(rgba);
    const data =
      clamped.length === expectedLength
        ? clamped
        : (() => {
            const fixed = new Uint8ClampedArray(expectedLength);
            fixed.set(clamped.slice(0, Math.min(clamped.length, expectedLength)));
            return fixed;
          })();

    const origCanvas = document.createElement("canvas");
    origCanvas.width = origW;
    origCanvas.height = origH;
    const origCtx = origCanvas.getContext("2d")!;
    origCtx.putImageData(new ImageData(data, origW, origH), 0, 0);

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
    const attachmentId = this.project.addAttachment(blob);
    const location = this.project.renderer.transformView2World(MouseLocation.vector());

    const imageNode = new ImageNode(this.project, {
      attachmentId,
      collisionBox: new CollisionBox([new Rectangle(location, new Vector(300, 150))]),
    });

    this.project.stageManager.add(imageNode);
  }

  private async compressImageBlob(blob: Blob): Promise<Blob> {
    if (!Settings.compressImageToBlackAndWhite && !Settings.resizePastedImages && !Settings.compressImageToWebp)
      return blob;
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        let needCanvas = Settings.compressImageToBlackAndWhite;
        if (Settings.resizePastedImages) {
          const maxSize = Settings.maxPastedImageSize;
          const maxDim = Math.max(w, h);
          if (maxDim > maxSize) {
            const scale = maxSize / maxDim;
            w = Math.round(w * scale);
            h = Math.round(h * scale);
            needCanvas = true;
          }
        } else if (!Settings.compressImageToWebp && !Settings.compressImageToBlackAndWhite) {
          URL.revokeObjectURL(url);
          resolve(blob);
          return;
        }

        if (!needCanvas && !Settings.compressImageToWebp) {
          URL.revokeObjectURL(url);
          resolve(blob);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        if (Settings.compressImageToBlackAndWhite) {
          applyBlackAndWhite(canvas);
        }

        const outputType = Settings.compressImageToBlackAndWhite
          ? "image/png"
          : Settings.compressImageToWebp
            ? "image/webp"
            : "image/png";
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
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for compression"));
      };
      img.src = url;
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
      const compressed = await this.compressImageBlob(blob);
      await this.pasteImageBlob(compressed);
    }
  }
}
