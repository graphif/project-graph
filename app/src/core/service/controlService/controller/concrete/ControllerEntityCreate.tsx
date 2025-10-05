import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Vector } from "@graphif/data-structures";

/**
 * 创建节点的控制器
 */
export class ControllerEntityCreateClass extends ControllerClass {
  constructor(protected readonly project: Project) {
    super(project);
  }

  mouseDoubleClick = (event: MouseEvent) => {
    // 双击只能在左键
    if (!(event.button === 0)) {
      return;
    }
    if (Settings.mouseLeftMode === "draw") {
      // 绘制模式不能使用创建节点
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }

    this.project.rectangleSelect.shutDown();

    const pressLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));

    // 排除：在实体上双击或者在线上双击
    if (
      this.project.stageManager.isEntityOnLocation(pressLocation) ||
      this.project.stageManager.isAssociationOnLocation(pressLocation)
    ) {
      return;
    }

    // 是否是在Section内部双击
    const sections = this.project.sectionMethods.getSectionsByInnerLocation(pressLocation);

    if (this.project.controller.pressingKeySet.has("`") || this.project.controller.pressingKeySet.has("·")) {
      this.createConnectPoint(pressLocation, sections);
    } else {
      // 双击创建节点
      this.project.controllerUtils.addTextNodeByLocation(pressLocation, true);
    }
  };

  createConnectPoint(pressLocation: Vector, addToSections: Section[]) {
    this.project.nodeAdder.addConnectPoint(pressLocation, addToSections);
  }
}
