import { Color, Vector } from "@graphif/data-structures";

import { CubicCatmullRomSplineEdge } from "@/core/stage/stageObject/association/CubicCatmullRomSplineEdge";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";

export function renderCrEdge(
  project: Project,
  edge: CubicCatmullRomSplineEdge,
  renderArrowHead: (endPoint: Vector, direction: Vector, size: number, color: Color) => void,
) {
  if (edge.source.isHiddenBySectionCollapse && edge.target.isHiddenBySectionCollapse) {
    return;
  }
  const crShape = edge.getShape();
  const edgeColor = edge.color.a === 0 ? project.stageStyleManager.currentStyle.StageObjectBorder : edge.color;
  // 画曲线
  project.worldRenderUtils.renderCubicCatmullRomSpline(crShape, edgeColor, 2);
  if (edge.isSelected) {
    project.collisionBoxRenderer.render(edge.collisionBox, project.stageStyleManager.currentStyle.CollideBoxSelected);
  }
  // 画控制点们
  for (const point of crShape.controlPoints) {
    project.shapeRenderer.renderCircle(
      project.renderer.transformWorld2View(point),
      5 * project.camera.currentScale,
      Color.Transparent,
      edgeColor,
      2 * project.camera.currentScale,
    );
  }
  // 画文字
  if (edge.text !== "") {
    const textRect = edge.textRectangle;
    project.shapeRenderer.renderRect(
      project.renderer.transformWorld2View(textRect),
      project.stageStyleManager.currentStyle.Background,
      Color.Transparent,
      0,
    );
    project.textRenderer.renderMultiLineTextFromCenter(
      edge.text,
      project.renderer.transformWorld2View(textRect.center),
      Renderer.FONT_SIZE * project.camera.currentScale,
      Infinity,
      edgeColor,
    );
  }
  // 画箭头
  const { location, direction } = edge.getArrowHead();
  renderArrowHead(location, direction.normalize(), 15, edgeColor);
}
