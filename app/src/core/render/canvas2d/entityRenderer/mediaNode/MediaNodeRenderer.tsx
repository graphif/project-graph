import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { MediaPlaybackManager } from "@/core/service/mediaPlaybackService/MediaPlaybackManager";
import { MediaNode } from "@/core/stage/stageObject/entity/MediaNode";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

@service("mediaNodeRenderer")
export class MediaNodeRenderer {
  constructor(private readonly project: Project) {}

  render(entity: MediaNode) {
    if (Settings.protectingPrivacy) {
      this.project.collisionBoxRenderer.render(
        entity.collisionBox,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
      if (entity.isSelected) {
        this.renderSelectedState(entity);
      }
      return;
    }

    const scale = this.project.camera.currentScale;
    const viewLocation = this.project.renderer.transformWorld2View(
      entity.rectangle.location,
    );
    const viewSize = entity.rectangle.size.multiply(scale);

    if (entity.state === "loading") {
      this.renderLoadingState(viewLocation, viewSize, scale);
    } else if (entity.state === "notFound") {
      this.renderNotFoundState(viewLocation, viewSize, scale);
    } else if (entity.state === "unsupported") {
      this.renderUnsupportedState(entity, viewLocation, viewSize, scale);
    } else if (entity.state === "ready") {
      if (entity.mediaKind === "video") {
        this.renderVideoReady(entity, viewLocation, viewSize, scale);
      } else {
        this.renderAudioReady(entity, viewLocation, viewSize, scale);
      }
    }

    if (entity.isSelected) {
      this.renderSelectedState(entity);
    }
  }

  private renderLoadingState(
    viewLocation: Vector,
    viewSize: Vector,
    scale: number,
  ) {
    this.project.shapeRenderer.renderRect(
      new Rectangle(viewLocation, viewSize),
      new Color(128, 128, 128, 0.1),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * scale,
      4 * scale,
    );
    this.project.textRenderer.renderTextFromCenter(
      "加载中...",
      viewLocation.add(viewSize.multiply(0.5)),
      14 * scale,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
    );
  }

  private renderNotFoundState(
    viewLocation: Vector,
    viewSize: Vector,
    scale: number,
  ) {
    this.project.shapeRenderer.renderRect(
      new Rectangle(viewLocation, viewSize),
      Color.Red.toNewAlpha(0.15),
      Color.Red.clone(),
      2 * scale,
      4 * scale,
    );
    this.project.textRenderer.renderTextFromCenter(
      "媒体文件缺失",
      viewLocation.add(viewSize.multiply(0.5)),
      14 * scale,
      Color.Red.clone(),
    );
  }

  private renderUnsupportedState(
    entity: MediaNode,
    viewLocation: Vector,
    viewSize: Vector,
    scale: number,
  ) {
    this.project.shapeRenderer.renderRect(
      new Rectangle(viewLocation, viewSize),
      new Color(128, 128, 128, 0.15),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * scale,
      4 * scale,
    );
    this.project.textRenderer.renderTextFromCenter(
      entity.title || "不支持的媒体格式",
      viewLocation.add(viewSize.multiply(0.5)),
      12 * scale,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
    );
  }

  private renderVideoReady(
    entity: MediaNode,
    viewLocation: Vector,
    viewSize: Vector,
    scale: number,
  ) {
    if (entity.poster) {
      this.renderCoverImage(entity.poster, viewLocation, viewSize);
    } else {
      this.project.shapeRenderer.renderRect(
        new Rectangle(viewLocation, viewSize),
        new Color(30, 30, 30, 1),
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
        2 * scale,
        4 * scale,
      );
    }

    const titleFontSize = 10 * scale;
    if (titleFontSize > 2) {
      const titleBarHeight = titleFontSize + 6 * scale;
      this.project.shapeRenderer.renderRect(
        new Rectangle(
          viewLocation,
          new Vector(viewSize.x, titleBarHeight),
        ),
        new Color(0, 0, 0, 0.5),
        Color.Transparent,
        0,
        0,
      );
      const displayTitle =
        entity.title.length > 20
          ? entity.title.slice(0, 20) + "..."
          : entity.title;
      this.project.textRenderer.renderText(
        displayTitle,
        viewLocation.add(new Vector(4 * scale, titleBarHeight / 2)),
        titleFontSize,
        Color.White.clone(),
      );
    }

    if (entity.duration !== undefined && entity.duration > 0) {
      const mm = Math.floor(entity.duration / 60);
      const ss = Math.floor(entity.duration % 60);
      const durationText = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
      const durFontSize = 9 * scale;
      if (durFontSize > 2) {
        const durTextSize = this.project.textRenderer.measureMultiLineTextSize(
          durationText,
          durFontSize,
          Infinity,
        );
        const padding = 3 * scale;
        const durRect = new Rectangle(
          new Vector(
            viewLocation.x + viewSize.x - durTextSize.x - padding * 2,
            viewLocation.y + viewSize.y - durTextSize.y - padding * 2,
          ),
          new Vector(durTextSize.x + padding * 2, durTextSize.y + padding * 2),
        );
        this.project.shapeRenderer.renderRect(
          durRect,
          new Color(0, 0, 0, 0.6),
          Color.Transparent,
          0,
          2 * scale,
        );
        this.project.textRenderer.renderText(
          durationText,
          durRect.location.add(new Vector(padding, padding)),
          durFontSize,
          Color.White.clone(),
        );
      }
    }
  }

  private renderAudioReady(
    entity: MediaNode,
    viewLocation: Vector,
    viewSize: Vector,
    scale: number,
  ) {
    this.project.shapeRenderer.renderRect(
      new Rectangle(viewLocation, viewSize),
      new Color(45, 45, 55, 1),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * scale,
      6 * scale,
    );

    const iconSize = Math.min(viewSize.x * 0.15, viewSize.y * 0.5);
    const iconCenter = new Vector(
      viewLocation.x + viewSize.x * 0.1 + iconSize * 0.5,
      viewLocation.y + viewSize.y * 0.5,
    );
    this.project.textRenderer.renderTextFromCenter(
      "\u266A",
      iconCenter,
      iconSize,
      Color.White.clone(),
    );

    const durationTextRightX = viewLocation.x + viewSize.x * 0.92;
    if (entity.duration !== undefined && entity.duration > 0) {
      const mm = Math.floor(entity.duration / 60);
      const ss = Math.floor(entity.duration % 60);
      const durationText = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
      const durFontSize = 9 * scale;
      if (durFontSize > 2) {
        const durTextSize = this.project.textRenderer.measureMultiLineTextSize(
          durationText,
          durFontSize,
          Infinity,
        );
        this.project.textRenderer.renderTextFromCenter(
          durationText,
          new Vector(durationTextRightX - durTextSize.x * 0.5, viewLocation.y + viewSize.y * 0.5),
          durFontSize,
          new Color(200, 200, 200, 1),
        );
      }
    }

    const titleX = viewLocation.x + viewSize.x * 0.1 + iconSize + 4 * scale;
    const maxTitleWidth = viewLocation.x + viewSize.x * 0.62 - titleX;
    const titleFontSize = 11 * scale;
    if (titleFontSize > 2 && maxTitleWidth > 10) {
      const displayTitle =
        entity.title.length > 15
          ? entity.title.slice(0, 15) + "..."
          : entity.title;
      this.project.textRenderer.renderText(
        displayTitle,
        new Vector(titleX, viewLocation.y + viewSize.y * 0.5 - titleFontSize * 0.5),
        titleFontSize,
        Color.White.clone(),
      );
    }

    const isActive = MediaPlaybackManager.isActive(entity);
    const isPaused = MediaPlaybackManager.isPaused(entity);

    const ctx = this.project.canvas.ctx;

    if (isActive) {
      const smallSize = 8 * scale;
      const iconX = viewLocation.x + 12 * scale;
      const barY = viewLocation.y + viewSize.y - Math.max(12, viewSize.y * 0.16);
      const iconY = barY - 8 * scale;
      ctx.save();
      ctx.fillStyle = Color.White.toString();
      if (!isPaused) {
        const barW = smallSize * 0.25;
        const barH = smallSize * 0.6;
        ctx.fillRect(iconX - barW * 1.2, iconY - barH / 2, barW, barH);
        ctx.fillRect(iconX + barW * 0.2, iconY - barH / 2, barW, barH);
      } else {
        const triS = smallSize * 0.4;
        ctx.beginPath();
        ctx.moveTo(iconX - triS * 0.4, iconY - triS * 0.5);
        ctx.lineTo(iconX - triS * 0.4, iconY + triS * 0.5);
        ctx.lineTo(iconX + triS * 0.5, iconY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (isActive) {
      const progress = MediaPlaybackManager.getProgress(entity);
      if (progress && progress.total > 0) {
        const barLeft = viewLocation.x + viewSize.x * 0.08;
        const barRight = viewLocation.x + viewSize.x * 0.92;
        const barWidth = barRight - barLeft;
        const barY = viewLocation.y + viewSize.y - Math.max(12, viewSize.y * 0.16);
        const barHeight = Math.max(6, viewSize.y * 0.08);
        const ratio = progress.current / progress.total;

        ctx.save();
        ctx.fillStyle = new Color(255, 255, 255, 0.1).toString();
        ctx.beginPath();
        ctx.roundRect(barLeft, barY, barWidth, barHeight, barHeight / 2);
        ctx.fill();

        const fillColor =
          this.project.stageStyleManager.currentStyle.CollideBoxSelected;
        ctx.fillStyle = fillColor.toString();
        ctx.beginPath();
        ctx.roundRect(barLeft, barY, barWidth * ratio, barHeight, barHeight / 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderCoverImage(
    bitmap: ImageBitmap,
    viewLocation: Vector,
    viewSize: Vector,
  ) {
    const imgAspect = bitmap.width / bitmap.height;
    const boxAspect = viewSize.x / viewSize.y;
    let sx: number, sy: number, sw: number, sh: number;

    if (imgAspect > boxAspect) {
      sh = bitmap.height;
      sw = sh * boxAspect;
      sx = (bitmap.width - sw) / 2;
      sy = 0;
    } else {
      sw = bitmap.width;
      sh = sw / boxAspect;
      sx = 0;
      sy = (bitmap.height - sh) / 2;
    }

    const ctx = this.project.canvas.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      viewLocation.x,
      viewLocation.y,
      viewSize.x,
      viewSize.y,
      4 * this.project.camera.currentScale,
    );
    ctx.clip();
    ctx.drawImage(
      bitmap,
      sx,
      sy,
      sw,
      sh,
      viewLocation.x,
      viewLocation.y,
      viewSize.x,
      viewSize.y,
    );
    ctx.restore();
  }

  private renderSelectedState(entity: MediaNode) {
    this.project.collisionBoxRenderer.render(
      entity.collisionBox,
      this.project.stageStyleManager.currentStyle.CollideBoxSelected,
    );

    const resizeHandleRect = entity.getResizeHandleRect();
    const viewResizeHandleRect = new Rectangle(
      this.project.renderer.transformWorld2View(resizeHandleRect.location),
      resizeHandleRect.size.multiply(this.project.camera.currentScale),
    );
    this.project.shapeRenderer.renderRect(
      viewResizeHandleRect,
      this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * this.project.camera.currentScale,
      8 * this.project.camera.currentScale,
    );
    this.project.shapeRenderer.renderResizeArrow(
      viewResizeHandleRect,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * this.project.camera.currentScale,
    );
  }
}
