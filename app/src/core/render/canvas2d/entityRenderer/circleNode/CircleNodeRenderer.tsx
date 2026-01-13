import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { CircleNode } from "@/core/stage/stageObject/entity/CircleNode";
import { Color, colorInvert } from "@graphif/data-structures";

@service("circleNodeRenderer")
export class CircleNodeRenderer {
  constructor(private readonly project: Project) {}

  renderCircleNode(node: CircleNode) {
    // 节点身体圆形
    let fillColor = node.color;
    let renderedFontSize = node.getFontSize() * this.project.camera.currentScale;
    if (renderedFontSize < Settings.ignoreTextNodeTextRenderLessThanFontSize && fillColor.a === 0) {
      const color = this.project.stageStyleManager.currentStyle.StageObjectBorder.clone();
      color.a = 0.2;
      fillColor = color;
    }
    const borderColor = Settings.showTextNodeBorder
      ? this.project.stageStyleManager.currentStyle.StageObjectBorder
      : Color.Transparent;

    // 渲染节点背景（圆形）
    const circle = node.circle;
    const viewCenter = this.project.renderer.transformWorld2View(circle.location);
    const viewRadius = circle.radius * this.project.camera.currentScale;
    this.project.shapeRenderer.renderCircle(
      viewCenter,
      viewRadius,
      fillColor,
      borderColor,
      2 * this.project.camera.currentScale,
    );

    // 视野缩放过小就不渲染内部文字
    renderedFontSize = node.getFontSize() * this.project.camera.currentScale;
    if (renderedFontSize > Settings.ignoreTextNodeTextRenderLessThanFontSize) {
      this.renderCircleNodeTextLayer(node);
    }

    if (node.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        node.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
      // 改变大小的拖拽
      if (node.sizeAdjust === "manual") {
        const resizeHandleRect = node.getResizeHandleRect();
        const viewResizeHandleRect = this.project.renderer.transformWorld2View(resizeHandleRect);
        this.project.shapeRenderer.renderRect(
          viewResizeHandleRect,
          this.project.stageStyleManager.currentStyle.CollideBoxSelected,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2 * this.project.camera.currentScale,
          8 * this.project.camera.currentScale,
        );
        // 渲染箭头指示
        this.project.shapeRenderer.renderResizeArrow(
          viewResizeHandleRect,
          this.project.stageStyleManager.currentStyle.StageObjectBorder,
          2 * this.project.camera.currentScale,
        );
      }
    }
  }

  /**
   * 画节点文字层信息
   */
  private renderCircleNodeTextLayer(node: CircleNode) {
    if (node.isEditing) {
      return;
    }

    const fontSize = node.getFontSize() * this.project.camera.currentScale;
    const center = this.project.renderer.transformWorld2View(node.geometryCenter);

    if (node.text === undefined) {
      this.project.textRenderer.renderTextFromCenter(
        "undefined",
        center,
        fontSize,
        node.color.a === 1
          ? colorInvert(node.color)
          : colorInvert(this.project.stageStyleManager.currentStyle.Background),
      );
    } else {
      // 圆形节点文本居中显示
      this.project.textRenderer.renderMultiLineTextFromCenter(
        node.text,
        center,
        fontSize,
        Infinity,
        node.color.a === 1
          ? colorInvert(node.color)
          : colorInvert(this.project.stageStyleManager.currentStyle.Background),
        1.5,
      );
    }
  }
}
