import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { SvgNode } from "@/core/stage/stageObject/entity/SvgNode";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";

export class ControllerImageScaleClass extends ControllerClass {
  mousewheel = (event: WheelEvent) => {
    if (
      isMac ? this.project.controller.pressingKeySet.has("meta") : this.project.controller.pressingKeySet.has("control")
    ) {
      const location = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
      const hoverEntity = this.project.stageManager.findEntityByLocation(location);
      if (hoverEntity === null) {
        return;
      }
      if (
        hoverEntity instanceof ImageNode ||
        hoverEntity instanceof SvgNode ||
        hoverEntity instanceof ReferenceBlockNode
      ) {
        // 需要注意缩放逻辑和视野缩放逻辑保持一致性
        for (const entity of this.project.stageManager.getSelectedEntities()) {
          if (entity instanceof ImageNode || entity instanceof SvgNode || entity instanceof ReferenceBlockNode) {
            if (event.deltaY > 0) {
              // 放大图片
              entity.scaleUpdate(-0.1);
            } else if (event.deltaY < 0) {
              entity.scaleUpdate(+0.1);
            }
          }
        }
      }
    }
  };
}
