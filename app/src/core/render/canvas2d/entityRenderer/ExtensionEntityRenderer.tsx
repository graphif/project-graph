import { extensionObjectRegistry } from "@/core/extension/ExtensionObjectRegistry";
import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { ExtensionEntity } from "@/core/stage/stageObject/entity/ExtensionEntity";
import { Vector } from "@graphif/data-structures";

/** scale 变化超过此比例时重新渲染（避免频繁重渲） */
const SCALE_REDRAW_THRESHOLD = 0.25;

export class ExtensionEntityRenderer {
  constructor(private readonly project: Project) {}

  public render(entity: ExtensionEntity) {
    const ctx = this.project.canvas.ctx;
    const scale = this.project.camera.currentScale;
    const dpr = window.devicePixelRatio || 1;
    const pixelRatio = scale * dpr;

    const { x, y } = this.project.renderer.transformWorld2View(entity.location);
    const rect = entity.collisionBox.getRectangle();
    const w = rect.size.x * scale;
    const h = rect.size.y * scale;
    if (w <= 0 || h <= 0) return;

    const renderFn = extensionObjectRegistry.getRenderFn(entity.extensionId, entity.typeName);

    // 检测 scale 变化是否超过阈值，超过则重新渲染高分辨率版本
    if (
      !entity._isDirty &&
      entity._bitmapCache &&
      entity._lastRenderedPixelRatio > 0 &&
      Math.abs(pixelRatio - entity._lastRenderedPixelRatio) / entity._lastRenderedPixelRatio > SCALE_REDRAW_THRESHOLD
    ) {
      entity._isDirty = true;
    }

    if (entity._bitmapCache) {
      ctx.save();
      // 关闭双线性插值，保留清晰边缘（像素级渲染）
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(entity._bitmapCache, x, y, w, h);
      ctx.restore();
    } else if (!renderFn) {
      this.drawErrorBox(ctx, x, y, w, h, "扩展未找到", entity.extensionId, "#ff9800");
    } else if (entity._renderFailed) {
      this.drawErrorBox(ctx, x, y, w, h, "渲染失败", entity.extensionId, "#e53935");
    } else {
      this.drawPendingBox(ctx, x, y, w, h);
    }

    if (entity.isSelected) {
      this.renderSelectionOutline(ctx, entity, scale);
    }

    if (Settings.showDebug) {
      this.drawCollisionBox(ctx, entity, scale);
    }

    if (renderFn && entity._isDirty && !entity._isRendering) {
      this.triggerWorkerRender(entity, pixelRatio);
    }
  }

  private drawPendingBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.strokeStyle = "#888";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  private drawErrorBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    extensionId: string,
    color: string,
  ) {
    this.drawPendingBox(ctx, x, y, w, h);
    ctx.fillStyle = color;
    const fs = Math.max(10, 12 * this.project.camera.currentScale);
    ctx.font = `${fs}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(text, x + w / 2, y + h / 2 - fs * 0.3);
    ctx.font = `${Math.max(8, 10 * this.project.camera.currentScale)}px sans-serif`;
    ctx.fillText(extensionId, x + w / 2, y + h / 2 + fs * 0.5);
  }

  private drawCollisionBox(ctx: CanvasRenderingContext2D, entity: ExtensionEntity, scale: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(100, 149, 237, 0.3)";
    ctx.lineWidth = scale;
    for (const shape of entity.collisionBox.shapes) {
      const r = shape.getRectangle();
      const vl = this.project.renderer.transformWorld2View(r.location);
      ctx.strokeRect(vl.x, vl.y, r.size.x * scale, r.size.y * scale);
    }
    ctx.restore();
  }

  private renderSelectionOutline(ctx: CanvasRenderingContext2D, entity: ExtensionEntity, scale: number) {
    const color = this.project.stageStyleManager.currentStyle.CollideBoxSelected;
    const PAD = 7.5;
    const lw = scale > 0.02 ? 8 * scale : 8 * scale * 20;
    ctx.save();
    ctx.strokeStyle = color.toString();
    ctx.lineWidth = lw;
    for (const shape of entity.collisionBox.shapes) {
      const r = shape.getRectangle();
      const vl = this.project.renderer.transformWorld2View(r.location.subtract(new Vector(PAD, PAD)));
      const vs = r.size.add(new Vector(PAD * 2, PAD * 2)).multiply(scale);
      ctx.strokeRect(vl.x, vl.y, vs.x, vs.y);
    }
    ctx.restore();
  }

  private async triggerWorkerRender(entity: ExtensionEntity, pixelRatio: number) {
    const renderFn = extensionObjectRegistry.getRenderFn(entity.extensionId, entity.typeName);
    if (!renderFn) return;

    entity._isRendering = true;
    entity._lastRenderedPixelRatio = pixelRatio;
    try {
      entity._bitmapCache = await renderFn(entity.customData, pixelRatio);
      entity._renderFailed = false;
      entity._isDirty = false;
    } catch (e) {
      console.error("Extension rendering failed:", e);
      entity._renderFailed = true;
    } finally {
      entity._isRendering = false;
    }
  }
}
