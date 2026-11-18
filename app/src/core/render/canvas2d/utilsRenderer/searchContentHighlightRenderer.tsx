import { Color } from "@graphif/data-structures";
import type { Rectangle } from "@graphif/shapes";
import { Project, service } from "@/core/Project";

/**
 * 高亮渲染所有搜索结果
 */
@service("searchContentHighlightRenderer")
export class SearchContentHighlightRenderer {
  constructor(private readonly project: Project) {}

  render(frameTickIndex: number, viewRectangle: Rectangle) {
    const { searchResultNodes } = this.project.contentSearch;
    if (searchResultNodes.length === 0) return;

    const strokeWidth = 4;
    const { currentScale, shakeLocation } = this.project.camera;
    const padding = strokeWidth / 2 + Math.max(Math.abs(shakeLocation.x), Math.abs(shakeLocation.y));
    const visibleBounds = viewRectangle.expandFromCenter(padding / currentScale);
    for (const stageObject of searchResultNodes) {
      const rect = stageObject.collisionBox.getRectangle().expandFromCenter(10);
      if (!visibleBounds.isCollideWith(rect)) continue;

      this.project.shapeRenderer.renderRect(
        this.project.renderer.transformWorld2View(rect),
        Color.Transparent,
        this.project.stageStyleManager.currentStyle.effects.warningShadow.toNewAlpha(
          Math.sin(frameTickIndex * 0.25) * 0.25 + 0.5,
        ),
        strokeWidth,
      );
    }
  }
}
