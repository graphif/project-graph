import { Vector } from "@graphif/data-structures";
import { Graphics, RenderTexture, TilingSprite } from "pixi.js";
import { Project } from "../Project";

/**
 * 背景网格
 * 同时还用于处理画布的鼠标事件
 */
export class BackgroundGrid extends TilingSprite {
  constructor(private project: Project) {
    const patternGraphics = new Graphics();
    patternGraphics.rect(0, 0, 50, 50);
    patternGraphics.stroke({ width: 1, color: 0x333333 });
    const texture = RenderTexture.create({
      width: 50,
      height: 50,
    });
    project.pixi.renderer.render({ container: patternGraphics, target: texture });
    texture.source.scaleMode = "nearest";
    super({ texture });
    this.project.viewport.on("moved", () => this.update());
    this.project.viewport.on("zoomed", () => {
      this.update();
      this.redraw();
    });
    this.update();

    let lastClickTime = 0;
    this.project.viewport.on("click", (e) => {
      const now = Date.now();
      if (now - lastClickTime < 300) {
        this.project.nodeAdder.addTextNodeByClick(new Vector(this.project.viewport.toWorld(e.client)), [], true);
      }
      lastClickTime = now;
    });
  }

  private update() {
    this.tilePosition.set(-this.project.viewport.left, -this.project.viewport.top);
    this.width = this.project.pixi.renderer.width / this.project.viewport.scale.x;
    this.height = this.project.pixi.renderer.height / this.project.viewport.scale.y;
    this.position.set(this.project.viewport.left, this.project.viewport.top);
  }
  private redraw() {
    let gridSize = 50;
    let lineWidth = 1;
    if (this.project.viewport.scale.x < 1) {
      while (gridSize * this.project.viewport.scale.x < 50) {
        gridSize *= 2;
        lineWidth *= 2;
      }
    }
    const patternGraphics = new Graphics();
    patternGraphics.rect(0, 0, gridSize, gridSize);
    patternGraphics.stroke({ width: lineWidth, color: 0x333333 });
    const texture = RenderTexture.create({
      width: gridSize,
      height: gridSize,
    });
    this.project.pixi.renderer.render({ container: patternGraphics, target: texture });
    texture.source.scaleMode = "nearest";
    this.texture = texture;
  }
}
