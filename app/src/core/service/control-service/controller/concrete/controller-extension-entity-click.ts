import { extensionObjectRegistry } from "@/core/extension/ExtensionObjectRegistry";
import { Project } from "@/core/Project";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { ExtensionEntity } from "@/core/stage/stageObject/entity/ExtensionEntity";
import { Vector } from "@graphif/data-structures";

export class ControllerExtensionEntityClickClass extends ControllerClass {
  constructor(protected readonly project: Project) {
    super(project);
  }

  mousedown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    if (this.project.controller.camera.isPreGrabbingWhenSpace) return;
    if (this.project.controller.isMouseDown[1] || this.project.controller.isMouseDown[2]) return;

    const pressLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    const clickedEntity = this.project.stageManager.findEntityByLocation(pressLocation);

    if (!(clickedEntity instanceof ExtensionEntity)) return;

    const handler = extensionObjectRegistry.getClickHandler(clickedEntity.extensionId, clickedEntity.typeName);
    if (!handler) return;

    handler({
      relativeWorldX: pressLocation.x - clickedEntity.location.x,
      relativeWorldY: pressLocation.y - clickedEntity.location.y,
      worldX: pressLocation.x,
      worldY: pressLocation.y,
      customData: clickedEntity.customData,
      uuid: clickedEntity.uuid,
    });
  };
}
