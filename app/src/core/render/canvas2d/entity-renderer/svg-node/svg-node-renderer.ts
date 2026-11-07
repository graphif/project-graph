import { Project, service } from "@/core/Project";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { Rectangle } from "@graphif/shapes";

/**
 * 渲染SVG节点
 */
@service("svgNodeRenderer")
export class SvgNodeRenderer {
  constructor(private readonly project: Project) {}

  // 渲染SVG节点
  render(svgNode: SvgNode) {
    if (svgNode.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        svgNode.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );

      // 渲染右下角缩放控制点
      const resizeHandleRect = svgNode.getResizeHandleRect();
      const viewResizeHandleRect = new Rectangle(
        this.project.renderer.transformWorld2View(resizeHandleRect.location),
        resizeHandleRect.size.multiply(this.project.camera.currentScale),
      );
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
    this.project.imageRenderer.renderImageElement(
      svgNode.image,
      this.project.renderer.transformWorld2View(svgNode.collisionBox.getRectangle().location),
      svgNode.scale,
    );
  }
}
