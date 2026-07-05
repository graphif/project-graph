import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

import { ArcEdge } from "@/core/stage/stageObject/association/ArcEdge";
import { Project } from "@/core/Project";

export function renderArcEdge(
  project: Project,
  edge: ArcEdge,
  renderArrowHead: (endPoint: Vector, direction: Vector, size: number, color: Color) => void,
) {
  if (edge.source.isHiddenBySectionCollapse && edge.target.isHiddenBySectionCollapse) {
    return;
  }
  const edgeColor = edge.color.equals(Color.Transparent)
    ? project.stageStyleManager.currentStyle.StageObjectBorder
    : edge.color;
  const ctx = project.canvas.ctx;

  const geo = edge.arcGeometry;
  const startPoint = edge.clippedStart;
  const endPoint = edge.clippedEnd;
  const scaledWidth = edge.edgeWidth * project.camera.currentScale;

  // 安全兜底：offset 过小导致三点共线，radius 巨大 → 直接画直线
  if (geo.radius > 1e6) {
    ctx.beginPath();
    ctx.moveTo(project.renderer.transformWorld2View(startPoint).x, project.renderer.transformWorld2View(startPoint).y);
    ctx.lineTo(project.renderer.transformWorld2View(endPoint).x, project.renderer.transformWorld2View(endPoint).y);
    ctx.strokeStyle = edgeColor.toString();
    ctx.lineWidth = scaledWidth;
    ctx.stroke();

    // 文字（直线中点位置）
    if (edge.text.trim() !== "") {
      const mid = { x: (startPoint.x + endPoint.x) / 2, y: (startPoint.y + endPoint.y) / 2 };
      const textRect = new Rectangle(new Vector(mid.x - 50, mid.y - 10), new Vector(100, 20));
      project.textRenderer.renderMultiLineTextFromCenterWithStroke(
        edge.text,
        project.renderer.transformWorld2View(textRect.center),
        edge.textFontSize * project.camera.currentScale,
        edgeColor,
        project.stageStyleManager.currentStyle.Background,
        Infinity,
      );
    }

    // 箭头
    renderArrowHead(
      endPoint,
      new Vector(endPoint.x - startPoint.x, endPoint.y - startPoint.y).normalize(),
      (15 * edge.edgeWidth) / 2,
      edgeColor,
    );
    return;
  }

  const startAngle = Math.atan2(startPoint.y - geo.center.y, startPoint.x - geo.center.x);
  const endAngle = Math.atan2(endPoint.y - geo.center.y, endPoint.x - geo.center.x);

  // 确定从 startPoint 到 endPoint 的弧的走向（与 arcGeometry 的走向一致）
  let adjustedEndAngle: number;
  let arcCounterclockwise: boolean;

  const geoCw = !geo.counterclockwise;

  if (geoCw) {
    if (startAngle <= endAngle) {
      adjustedEndAngle = endAngle;
    } else {
      adjustedEndAngle = endAngle + 2 * Math.PI;
    }
    arcCounterclockwise = false;
  } else {
    if (startAngle >= endAngle) {
      adjustedEndAngle = endAngle;
    } else {
      adjustedEndAngle = endAngle - 2 * Math.PI;
    }
    arcCounterclockwise = true;
  }

  ctx.save();

  // 菱形箭头时，弧线起点需要从节点边缘往外推到菱形 tip 处
  // ds = size * 1.5，tip 在 ds*2 处，对应弧长角度 = ds*2 / radius
  const arrowType = edge.arrowType || "default";
  const arcSize = (15 * edge.edgeWidth) / 2; // 与 renderArrowHead 调用处一致
  const ds = arcSize * 1.2;
  let adjustedStartAngle = startAngle;
  if ((arrowType === "hollow-diamond" || arrowType === "filled-diamond") && geo.radius < 1e6) {
    const angleOffset = (ds * 2) / geo.radius; // 弧长 / 半径 = 弧度
    // 顺时针弧角度递增，逆时针弧角度递减
    adjustedStartAngle = arcCounterclockwise ? startAngle - angleOffset : startAngle + angleOffset;
  }

  const renderArc = (startA: number, endA: number) => {
    ctx.beginPath();
    ctx.arc(
      project.renderer.transformWorld2View(geo.center).x,
      project.renderer.transformWorld2View(geo.center).y,
      geo.radius * project.camera.currentScale,
      startA,
      endA,
      arcCounterclockwise,
    );
    ctx.strokeStyle = edgeColor.toString();
    ctx.lineWidth = scaledWidth;
    ctx.stroke();
  };

  if (edge.lineType === "dashed") {
    const dashLen = 10 * project.camera.currentScale;
    ctx.setLineDash([dashLen, dashLen]);
    renderArc(adjustedStartAngle, adjustedEndAngle);
    ctx.setLineDash([]);
  } else if (edge.lineType === "double") {
    const gap = 5 * project.camera.currentScale;
    const offsetDist = gap / 2;

    ctx.beginPath();
    ctx.arc(
      project.renderer.transformWorld2View(geo.center).x,
      project.renderer.transformWorld2View(geo.center).y,
      (geo.radius - offsetDist / project.camera.currentScale) * project.camera.currentScale,
      adjustedStartAngle,
      adjustedEndAngle,
      arcCounterclockwise,
    );
    ctx.strokeStyle = edgeColor.toString();
    ctx.lineWidth = scaledWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      project.renderer.transformWorld2View(geo.center).x,
      project.renderer.transformWorld2View(geo.center).y,
      (geo.radius + offsetDist / project.camera.currentScale) * project.camera.currentScale,
      adjustedStartAngle,
      adjustedEndAngle,
      arcCounterclockwise,
    );
    ctx.strokeStyle = edgeColor.toString();
    ctx.lineWidth = scaledWidth;
    ctx.stroke();
  } else {
    renderArc(adjustedStartAngle, adjustedEndAngle);
  }

  // 画文字（已有描边，无需背景矩形）
  if (edge.text.trim() !== "") {
    const textRect = edge.textRectangle;
    project.textRenderer.renderMultiLineTextFromCenterWithStroke(
      edge.text,
      project.renderer.transformWorld2View(textRect.center),
      edge.textFontSize * project.camera.currentScale,
      edgeColor,
      project.stageStyleManager.currentStyle.Background,
      Infinity,
    );
  }

  // 画箭头（在 clippedEnd 处，沿切线方向）
  renderArrowHead(endPoint, edge.getArrowDirection().normalize(), (15 * edge.edgeWidth) / 2, edgeColor);

  // 选中状态：绘制绿色碰撞箱
  if (edge.isSelected) {
    project.collisionBoxRenderer.render(edge.collisionBox, project.stageStyleManager.currentStyle.CollideBoxSelected);
  }

  ctx.restore();
}
