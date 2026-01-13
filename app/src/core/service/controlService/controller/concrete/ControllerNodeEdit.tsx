import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { CircleNode } from "@/core/stage/stageObject/entity/CircleNode";
import { DiamondNode } from "@/core/stage/stageObject/entity/DiamondNode";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";
import { open } from "@tauri-apps/plugin-shell";
import { MouseLocation } from "../../MouseLocation";
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
    } else if (clickedEntity instanceof DiamondNode) {
      this.project.controllerUtils.editDiamondNode(clickedEntity, Settings.textNodeSelectAllWhenStartEditByMouseClick);
    } else if (clickedEntity instanceof CircleNode) {
      this.project.controllerUtils.editCircleNode(clickedEntity, Settings.textNodeSelectAllWhenStartEditByMouseClick);
    } else if (clickedEntity instanceof UrlNode) {
      const diffNodeLeftTopLocation = pressLocation.subtract(clickedEntity.rectangle.leftTop);
      if (diffNodeLeftTopLocation.y < UrlNode.titleHeight) {
        this.project.controllerUtils.editUrlNodeTitle(clickedEntity);
      } else {
        // 跳转链接
        open(clickedEntity.url);
      }
    } else if (clickedEntity instanceof ReferenceBlockNode) {
      // 双击引用块跳转到源头
      clickedEntity.goToSource();
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
    // 处理引用按钮点击事件
    this.project.referenceManager.onClickReferenceNumber(
      this.project.renderer.transformView2World(MouseLocation.vector()),
    );
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
