import { Graphics } from "pixi.js";
import { Project } from "../Project";
import { Settings } from "../service/Settings";

/**
 * 背景网格
 */
export class BackgroundGrid extends Graphics {
  constructor(private project: Project) {
    super();
    this.project.viewport.on("moved", () => this.update());
    this.project.viewport.on("zoomed", () => this.update());
    this.update();
  }

  private update() {
    this.clear();

    if (!Settings.showGrid) return;

    const viewport = this.project.viewport;
    const scale = viewport.scaled || viewport.scale.x;
    const bounds = viewport.getVisibleBounds();

    // 基础网格大小
    let gridSize = 50;

    // 动态调整网格大小
    if (scale < 1) {
      while (gridSize * scale < 50) {
        gridSize *= 2;
      }
    }

    const startX = Math.floor(bounds.x / gridSize) * gridSize;
    const endX = Math.ceil((bounds.x + bounds.width) / gridSize) * gridSize;
    const startY = Math.floor(bounds.y / gridSize) * gridSize;
    const endY = Math.ceil((bounds.y + bounds.height) / gridSize) * gridSize;

    const lineWidth = 1 / scale;
    const lineColor = 0x333333;

    // 绘制点阵
    if (Settings.showBackgroundDots) {
      for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
          this.circle(x, y, 1.5 / scale);
          this.fill(lineColor);
        }
      }
    }

    // 绘制垂直线
    if (Settings.showBackgroundVerticalLines) {
      for (let x = startX; x <= endX; x += gridSize) {
        if (Settings.showBackgroundCartesian && x === 0) continue;
        this.moveTo(x, bounds.y);
        this.lineTo(x, bounds.y + bounds.height);
      }
      this.stroke({ width: lineWidth, color: lineColor });
    }

    // 绘制水平线
    if (Settings.showBackgroundHorizontalLines) {
      for (let y = startY; y <= endY; y += gridSize) {
        if (Settings.showBackgroundCartesian && y === 0) continue;
        this.moveTo(bounds.x, y);
        this.lineTo(bounds.x + bounds.width, y);
      }
      this.stroke({ width: lineWidth, color: lineColor });
    }

    // 绘制坐标轴
    if (Settings.showBackgroundCartesian) {
      const axisWidth = 2 / scale;
      const axisColor = 0x666666;

      // Y轴
      if (bounds.x <= 0 && bounds.x + bounds.width >= 0) {
        this.moveTo(0, bounds.y);
        this.lineTo(0, bounds.y + bounds.height);
        this.stroke({ width: axisWidth, color: axisColor });
      }

      // X轴
      if (bounds.y <= 0 && bounds.y + bounds.height >= 0) {
        this.moveTo(bounds.x, 0);
        this.lineTo(bounds.x + bounds.width, 0);
        this.stroke({ width: axisWidth, color: axisColor });
      }
    }
  }
}
