import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { DiamondNode } from "@/core/stage/stageObject/entity/DiamondNode";
import { Color, colorInvert } from "@graphif/data-structures";

@service("diamondNodeRenderer")
export class DiamondNodeRenderer {
  constructor(private readonly project: Project) {}

  renderDiamondNode(node: DiamondNode) {
    // 节点身体菱形
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

    // 渲染节点背景（菱形）
    const diamond = node.diamond;
    const vertices = diamond.getVertices();
    const viewVertices = vertices.map((v) => this.project.renderer.transformWorld2View(v));
    this.project.shapeRenderer.renderPolygonAndFill(
      viewVertices,
      fillColor,
      borderColor,
      2 * this.project.camera.currentScale,
    );

    // 视野缩放过小就不渲染内部文字
    renderedFontSize = node.getFontSize() * this.project.camera.currentScale;
    if (renderedFontSize > Settings.ignoreTextNodeTextRenderLessThanFontSize) {
      this.renderDiamondNodeTextLayer(node);
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
  private renderDiamondNodeTextLayer(node: DiamondNode) {
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
      // 菱形节点文本居中显示
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
