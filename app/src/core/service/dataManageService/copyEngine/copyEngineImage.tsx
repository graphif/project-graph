import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { MouseLocation } from "../../controlService/MouseLocation";

export class CopyEngineImage {
  constructor(private project: Project) {}

  public async processClipboardImage(): Promise<boolean> {
    const image = await readImage();
    const { width, height } = await image.size();

    if (width <= 0 || height <= 0) return false;

    const rgba = await image.rgba();
    const expectedLength = width * height * 4;
    const clamped = rgba instanceof Uint8ClampedArray ? rgba : new Uint8ClampedArray(rgba);
    const data =
      clamped.length === expectedLength
        ? clamped
        : (() => {
            const fixed = new Uint8ClampedArray(expectedLength);
            fixed.set(clamped.slice(0, Math.min(clamped.length, expectedLength)));
            return fixed;
          })();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(new ImageData(data, width, height), 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("canvas.toBlob returned null"));
      }, "image/png");
    });

    await this.pasteImageBlob(blob);
    return true;
  }

  public async pasteImageBlob(blob: Blob) {
    const attachmentId = this.project.addAttachment(blob);
    const location = this.project.renderer.transformView2World(MouseLocation.vector());

    const imageNode = new ImageNode(this.project, {
      attachmentId,
      collisionBox: new CollisionBox([new Rectangle(location, new Vector(300, 150))]),
    });

    this.project.stageManager.add(imageNode);
  }
}
