import { Graphics, RenderTexture, TilingSprite } from "pixi.js";
import { Project } from "../Project";

export class BackgroundGrid extends TilingSprite {
  static GRID_SIZE = 50;

  constructor(project: Project) {
    const patternGraphics = new Graphics();
    patternGraphics.rect(0, 0, BackgroundGrid.GRID_SIZE, BackgroundGrid.GRID_SIZE);
    patternGraphics.stroke({ width: 1, color: 0x333333 });
    const texture = RenderTexture.create({
      width: BackgroundGrid.GRID_SIZE,
      height: BackgroundGrid.GRID_SIZE,
    });
    project.pixi.renderer.render({ container: patternGraphics, target: texture });
    texture.source.scaleMode = "nearest";
    super({ texture });
    const updateGrid = () => {
      this.tilePosition.set(-project.viewport.left, -project.viewport.top);
      this.width = project.pixi.renderer.width / project.viewport.scale.x;
      this.height = project.pixi.renderer.height / project.viewport.scale.y;
      this.position.set(project.viewport.left, project.viewport.top);
    };
    project.viewport.on("moved", updateGrid);
    project.viewport.on("zoomed", updateGrid);
    updateGrid();
  }
}
