import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { TextNode } from "@/core/sprites/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";
import { open } from "@tauri-apps/plugin-shell";
/**
 * 包含编辑节点文字，编辑详细信息等功能的控制器
 *
 * 当有节点编辑时，会把摄像机锁定住
 */
export class ControllerNodeEditClass extends ControllerClass {
  constructor(protected readonly project: Project) {
    super(project);
  }

  mouseDoubleClick = async (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }

    const pressLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    const clickedEntity = this.project.stageManager.findEntityByLocation(pressLocation);

    if (clickedEntity === null) {
      return;
    }

    if (this.project.controller.pressingKeySet.has(isMac ? "meta" : "control")) {
      this.project.controllerUtils.editNodeDetails(clickedEntity);
      return;
    }

    if (clickedEntity instanceof TextNode) {
      this.project.controllerUtils.editTextNode(clickedEntity, Settings.textNodeSelectAllWhenStartEditByMouseClick);
    } else if (clickedEntity instanceof UrlNode) {
      const diffNodeLeftTopLocation = pressLocation.subtract(clickedEntity.rectangle.leftTop);
      if (diffNodeLeftTopLocation.y < UrlNode.titleHeight) {
        this.project.controllerUtils.editUrlNodeTitle(clickedEntity);
      } else {
        // 跳转链接
        open(clickedEntity.url);
      }
    }
  };

  mouseup = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }

    const pressLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    for (const entity of this.project.stageManager.getEntities()) {
      // 必须有详细信息才显示详细信息按钮，进而点进去，否则会误触
      if (entity.isMouseInDetailsButton(pressLocation) && entity.details.length > 0) {
        this.project.controllerUtils.editNodeDetails(entity);
        return;
      }
    }
  };

  mousemove = (event: MouseEvent) => {
    this.project.controller.resetCountdownTimer();
    /**
     * 如果一直显示详细信息，则不显示鼠标悬停效果
     */
    if (Settings.alwaysShowDetails) {
      return;
    }

    const location = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    for (const node of this.project.stageManager.getTextNodes()) {
      node.isMouseHover = false;
      if (node.collisionBox.isContainsPoint(location)) {
        node.isMouseHover = true;
      }
    }
  };
}
