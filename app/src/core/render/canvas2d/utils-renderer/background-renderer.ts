import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Project, service } from "@/core/Project";

@service("backgroundRenderer")
export class BackgroundRenderer {
  constructor(private readonly project: Project) {}

  /**
   * 画洞洞板式的背景
   * @param ctx
   * @param width
   * @param height
   */
  renderDotBackground(viewRect: Rectangle) {
    const currentGap = this.getCurrentGap();
    const gridColor = this.project.stageStyleManager.currentStyle.GridNormal;
    const axisColor = this.project.stageStyleManager.currentStyle.GridHeavy;
    const dots = new Path2D();
    const axisDots = new Path2D();

    for (const y of this.getLocationYIterator(viewRect, currentGap)) {
      for (const x of this.getLocationXIterator(viewRect, currentGap)) {
        const location = this.project.renderer.transformWorld2View(new Vector(x, y));
        const onAxis = x === 0 || y === 0;
        const radius = onAxis ? 1.5 : 1;
        const path = onAxis ? axisDots : dots;
        path.moveTo(location.x + radius, location.y);
        path.arc(location.x, location.y, radius, 0, 2 * Math.PI);
      }
    }

    const ctx = this.project.canvas.ctx;
    ctx.fillStyle = gridColor.toString();
    ctx.fill(dots);
    ctx.fillStyle = axisColor.toString();
    ctx.fill(axisDots);
  }

  /**
   * 水平线条式的背景
   */
  renderHorizonBackground(viewRect: Rectangle) {
    const currentGap = this.getCurrentGap();
    const gridColor = this.project.stageStyleManager.currentStyle.GridNormal;
    const mainColor = this.project.stageStyleManager.currentStyle.GridHeavy;

    // 画横线
    for (const y of this.getLocationYIterator(viewRect, currentGap)) {
      const lineStartLocation = new Vector(viewRect.left, y);
      const lineEndLocation = new Vector(viewRect.right, y);

      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(lineStartLocation),
        this.project.renderer.transformWorld2View(lineEndLocation),
        y === 0 ? mainColor : gridColor,
        0.2,
      );
    }
  }

  /**
   * 垂直线条式的背景
   */
  renderVerticalBackground(viewRect: Rectangle) {
    const currentGap = this.getCurrentGap();
    const gridColor = this.project.stageStyleManager.currentStyle.GridNormal;
    const mainColor = this.project.stageStyleManager.currentStyle.GridHeavy;

    // 画竖线
    for (const x of this.getLocationXIterator(viewRect, currentGap)) {
      const lineStartLocation = new Vector(x, viewRect.top);
      const lineEndLocation = new Vector(x, viewRect.bottom);
      this.project.curveRenderer.renderSolidLine(
        this.project.renderer.transformWorld2View(lineStartLocation),
        this.project.renderer.transformWorld2View(lineEndLocation),
        x === 0 ? mainColor : gridColor,
        0.2,
      );
    }
  }

  /**
   * 平面直角坐标系背景
   * 只画一个十字坐标
   */
  renderCartesianBackground(viewRect: Rectangle) {
    // x轴
    this.project.curveRenderer.renderSolidLine(
      this.project.renderer.transformWorld2View(new Vector(viewRect.left, 0)),
      this.project.renderer.transformWorld2View(new Vector(viewRect.right, 0)),
      this.project.stageStyleManager.currentStyle.GridNormal,
      1,
    );
    // y轴
    this.project.curveRenderer.renderSolidLine(
      this.project.renderer.transformWorld2View(new Vector(0, viewRect.top)),
      this.project.renderer.transformWorld2View(new Vector(0, viewRect.bottom)),
      this.project.stageStyleManager.currentStyle.GridNormal,
      1,
    );
    const currentGap = this.getCurrentGap();
    // 画x轴上的刻度
    for (const x of this.getLocationXIterator(viewRect, currentGap)) {
      const renderLocation = this.project.renderer.transformWorld2View(new Vector(x, 0));
      renderLocation.y = Math.max(renderLocation.y, 0);
      renderLocation.y = Math.min(renderLocation.y, this.project.renderer.h - 10);
      this.project.textRenderer.renderText(
        `${x}`,
        renderLocation,
        10,
        this.project.stageStyleManager.currentStyle.GridNormal,
      );
    }
    // 画y轴上的刻度
    for (const y of this.getLocationYIterator(viewRect, currentGap)) {
      const renderLocation = this.project.renderer.transformWorld2View(new Vector(0, y));
      renderLocation.x = Math.max(renderLocation.x, 0);
      renderLocation.x = Math.min(renderLocation.x, this.project.renderer.w - 40);
      this.project.textRenderer.renderText(
        `${y}`,
        renderLocation,
        10,
        this.project.stageStyleManager.currentStyle.GridNormal,
      );
    }
  }

  getCurrentGap(): number {
    const gap = 50;
    let currentGap = gap;
    if (this.project.camera.currentScale < 1) {
      while (currentGap * this.project.camera.currentScale < gap - 1) {
        currentGap *= 2;
      }
    }
    return currentGap;
  }

  *getLocationXIterator(viewRect: Rectangle, currentGap: number): IterableIterator<number> {
    let xStart = viewRect.location.x - (viewRect.location.x % currentGap);
    while (xStart < viewRect.right) {
      yield xStart;
      xStart += currentGap;
    }
  }

  *getLocationYIterator(viewRect: Rectangle, currentGap: number): IterableIterator<number> {
    let yStart = viewRect.location.y - (viewRect.location.y % currentGap);
    while (yStart < viewRect.bottom) {
      yield yStart;
      yStart += currentGap;
    }
  }
}
