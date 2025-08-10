import { NumberFunctions } from "@/core/algorithm/numberFunctions";
import { Project, service } from "@/core/Project";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Vector } from "@graphif/data-structures";
/**
 * 仅仅渲染一个节点右上角的按钮
 */
@service("entityDetailsButtonRenderer")
export class EntityDetailsButtonRenderer {
  constructor(private readonly project: Project) {}

  render(entity: Entity) {
    if (!entity.details.trim()) {
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
      if (!entity.isEditingDetails)
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
    this.project.textRenderer.renderText(
      entity.isEditingDetails ? "✏️" : "📃",
      this.project.renderer.transformWorld2View(entity.detailsButtonRectangle().leftTop),
      (isMouseHovering ? getFontSizeByTime() : 20) * this.project.camera.currentScale,
    );
  }
}

function getFontSizeByTime() {
  const r = NumberFunctions.sinNumberByTime(19, 21, 0.25);
  return r;
}
