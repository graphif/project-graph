import { Project, service } from "@/core/Project";
import { Vector } from "@graphif/data-structures";

@service("svgRenderer")
export class SvgRenderer {
  svgCache: { [key: string]: HTMLImageElement } = {};

  constructor(private readonly project: Project) {}

  renderSvgFromLeftTop(svg: string, location: Vector, width: number, height: number): void {
    if (svg in this.svgCache) {
      this.project.canvas.ctx.drawImage(this.svgCache[svg], location.x, location.y, width, height);
    } else {
      const img = new Image();
      img.src = "data:image/svg+xml," + encodeURIComponent(svg);
      img.onload = () => {
        this.svgCache[svg] = img;
      };
    }
  }

  renderSvgFromCenter(svg: string, centerLocation: Vector, width: number, height: number): void {
    if (svg in this.svgCache) {
      this.project.canvas.ctx.drawImage(
        this.svgCache[svg],
        centerLocation.x - width / 2,
        centerLocation.y - height / 2,
        width,
        height,
      );
    } else {
      const img = new Image();
      img.src = "data:image/svg+xml," + encodeURIComponent(svg);
      img.onload = () => {
        this.svgCache[svg] = img;
      };
    }
  }

  renderSvgFromLeftTopWithoutSize(svg: string, location: Vector, scaleNumber = 1): void {
    if (svg in this.svgCache) {
      const img = this.svgCache[svg];
      this.project.canvas.ctx.drawImage(
        this.svgCache[svg],
        location.x,
        location.y,
        img.naturalWidth * this.project.camera.currentScale * scaleNumber,
        img.naturalHeight * this.project.camera.currentScale * scaleNumber,
      );
    } else {
      const img = new Image();
      img.src = "data:image/svg+xml," + encodeURIComponent(svg);
      img.onload = () => {
        this.svgCache[svg] = img;
      };
    }
  }

  renderSvgFromCenterWithoutSize(svg: string, centerLocation: Vector): void {
    if (svg in this.svgCache) {
      const img = this.svgCache[svg];
      this.project.canvas.ctx.drawImage(
        this.svgCache[svg],
        centerLocation.x - (img.naturalWidth / 2) * this.project.camera.currentScale,
        centerLocation.y - (img.naturalHeight / 2) * this.project.camera.currentScale,
        img.naturalWidth * this.project.camera.currentScale,
        img.naturalHeight * this.project.camera.currentScale,
      );
    } else {
      const img = new Image();
      img.src = "data:image/svg+xml," + encodeURIComponent(svg);
      img.onload = () => {
        this.svgCache[svg] = img;
      };
    }
  }
}
