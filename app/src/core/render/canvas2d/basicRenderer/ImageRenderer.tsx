import { Project, service } from "@/core/Project";
import { Vector } from "@graphif/data-structures";

/**
 * 图片渲染器
 * 基于View坐标系
 */
@service("imageRenderer")
export class ImageRenderer {
  constructor(private readonly project: Project) {}

  /**
   * 根据图片HTML元素来渲染图片到canvas指定位置
   * @param imageElement
   * @param location 图片左上角位置
   * @param scale 1 表示正常，0.5 表示缩小一半，2 表示放大两倍
   */
  renderImageElement(
    source: Exclude<CanvasImageSource, VideoFrame | SVGElement>,
    location: Vector,
    scale: number = 1 / (window.devicePixelRatio || 1),
  ) {
    this.project.canvas.ctx.drawImage(
      source,
      location.x,
      location.y,
      source.width * scale * this.project.camera.currentScale,
      source.height * scale * this.project.camera.currentScale,
    );
  }

  /**
   * 根据ImageBitmap来渲染图片到canvas指定位置
   * @param bitmap ImageBitmap对象
   * @param location 图片左上角位置
   * @param scale 1 表示正常，0.5 表示缩小一半，2 表示放大两倍
   */
  renderImageBitmap(
    bitmap: ImageBitmap | undefined,
    location: Vector,
    scale: number = 1 / (window.devicePixelRatio || 1),
  ) {
    if (!bitmap) {
      return;
    }
    this.project.canvas.ctx.drawImage(
      bitmap,
      location.x,
      location.y,
      bitmap.width * scale * this.project.camera.currentScale,
      bitmap.height * scale * this.project.camera.currentScale,
    );
  }
}
