import { Project, service } from "@/core/Project";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 仅仅渲染一个节点右上角的按钮
 */
@service("entityDetailsButtonRenderer")
export class EntityDetailsButtonRenderer {
  constructor(private readonly project: Project) {}

  render(entity: Entity) {
    if (entity.detailsManager.isEmpty()) {
      return;
    }
    // this.project.shapeRenderer.renderRect(
    //   entity.detailsButtonRectangle().transformWorld2View(),
    //   this.project.stageStyleManager.currentStyle.DetailsDebugTextColor,
    //   this.project.stageStyleManager.currentStyle.DetailsDebugTextColor,
    //   2 * Camera.currentScale,
    //   Renderer.NODE_ROUNDED_RADIUS * Camera.currentScale,
    // );
    let isMouseHovering = false;
    // 鼠标悬浮在按钮上提示文字
    if (entity.detailsButtonRectangle().isPointIn(this.project.renderer.transformView2World(MouseLocation.vector()))) {
      isMouseHovering = true;
      // 鼠标悬浮在这上面
      this.project.textRenderer.renderText(
        "点击展开或关闭节点注释详情",
        this.project.renderer.transformWorld2View(
          entity.detailsButtonRectangle().topCenter.subtract(new Vector(0, 12)),
        ),
        12 * this.project.camera.currentScale,
        this.project.stageStyleManager.currentStyle.DetailsDebugText,
      );
    }
    const rect = entity.detailsButtonRectangle();
    const color = isMouseHovering ? this.project.stageStyleManager.currentStyle.CollideBoxSelected : Color.Transparent;
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(rect.leftTop),
        rect.size.multiply(this.project.camera.currentScale),
      ),
      color,
      this.project.stageStyleManager.currentStyle.StageObjectBorder.toNewAlpha(0.5),
      2 * this.project.camera.currentScale,
      5 * this.project.camera.currentScale,
    );
  }
}
