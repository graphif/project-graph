import { Project, service } from "@/core/Project";
import { sleep } from "@/utils/sleep";
import { Vector } from "@graphif/data-structures";
import EventEmitter from "eventemitter3";

interface EventMap {
  progress: [progress: number];
  complete: [blob: Blob];
  error: [error: Error];
}

@service("stageExportPng")
export class StageExportPng {
  constructor(private readonly project: Project) {}

  /**
   * 将整个舞台导出为png图片
   */
  private async exportStage_(emitter: EventEmitter<EventMap>, signal: AbortSignal) {
    // 创建一个新的画布
    const resultCanvas = this.generateCanvasNode();
    const resultCtx = resultCanvas.getContext("2d")!;
    // 创建完毕
    const stageRect = this.project.stageManager.getBoundingRectangle();
    const topLeft = stageRect.leftTop.subtract(new Vector(100, 100));
    const bottomRight = stageRect.rightBottom.add(new Vector(100, 100));
    const viewRect = this.project.renderer.getCoverWorldRectangle();
    const leftTopLocList: { x: number; y: number }[] = [];
    // 遍历xy，xy是切割分块后的目标视野矩形的左上角
    for (let y = topLeft.y; y <= bottomRight.y; y += viewRect.size.y) {
      for (let x = topLeft.x; x <= bottomRight.x; x += viewRect.size.x) {
        leftTopLocList.push({ x, y });
      }
    }
    let i = 0;
    let lastFrame = this.project.renderer.frameIndex;
    while (i < leftTopLocList.length) {
      const { x, y } = leftTopLocList[i];
      // 先移动再暂停等待
      await sleep(2);
      this.project.camera.location = new Vector(x + viewRect.size.x / 2, y + viewRect.size.y / 2);
      await sleep(2);
      if (this.project.renderer.frameIndex - lastFrame < 2) {
        continue;
      }
      lastFrame = this.project.renderer.frameIndex;
      const imageData = this.project.canvas.ctx.getImageData(
        0,
        0,
        viewRect.size.x * devicePixelRatio,
        viewRect.size.y * devicePixelRatio,
      );
      resultCtx.putImageData(
        imageData,
        (x - topLeft.x) * devicePixelRatio * this.project.camera.targetScale,
        (y - topLeft.y) * devicePixelRatio * this.project.camera.targetScale,
      );
      i++;
      // 计算进度
      const progress = (i + 1) / leftTopLocList.length;
      emitter.emit("progress", progress);
      signal.throwIfAborted();
    }
    const blob = await new Promise<Blob>((resolve) => {
      resultCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(new Blob());
        }
      }, "image/png");
    });
    emitter.emit("complete", blob);
    // 移除画布
    resultCanvas.remove();
  }

  exportStage(signal: AbortSignal) {
    const emitter = new EventEmitter<EventMap>();
    this.exportStage_(emitter, signal).catch((err) => emitter.emit("error", err));
    return emitter;
  }

  generateCanvasNode(): HTMLCanvasElement {
    const resultCanvas = document.createElement("canvas");
    const stageSize = this.project.stageManager.getSize().add(new Vector(100 * 2, 100 * 2));
    // 设置大小
    resultCanvas.width = stageSize.x * devicePixelRatio * this.project.camera.targetScale;
    resultCanvas.height = stageSize.y * devicePixelRatio * this.project.camera.targetScale;
    resultCanvas.style.width = `${stageSize.x * 1 * this.project.camera.targetScale}px`;
    resultCanvas.style.height = `${stageSize.y * 1 * this.project.camera.targetScale}px`;
    const ctx = resultCanvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    return resultCanvas;
  }
}
