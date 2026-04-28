import { Dialog } from "@/components/ui/dialog";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Vector } from "@graphif/data-structures";
import { toast } from "sonner";

/**
 * 包含编辑节点文字，编辑详细信息等功能的控制器
 *
 * 当有节点编辑时，会把摄像机锁定住
 */
export class ControllerSectionEditClass extends ControllerClass {
  constructor(protected readonly project: Project) {
    super(project);
  }

  mouseDoubleClick = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    const firstHoverSection = this.project.mouseInteraction.firstHoverSection;
    if (!firstHoverSection) {
      return;
    }

    // 编辑文字
    this.editSectionTitle(firstHoverSection);
    return;
  };

  mousemove = (event: MouseEvent) => {
    const worldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    this.project.mouseInteraction.updateByMouseMove(worldLocation);
  };

  keydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const selectedSections = this.project.stageManager.getSections().filter((section) => section.isSelected);
      if (selectedSections.length === 0) {
        return;
      }
      // 检查是否有选中的section被锁定（包括祖先section的锁定状态）
      const lockedSections = selectedSections.filter((section) =>
        this.project.sectionMethods.isObjectBeLockedBySection(section),
      );
      if (lockedSections.length > 0) {
        toast.error("无法编辑已锁定的section");
        return;
      }
      Dialog.input("重命名 Section").then((value) => {
        if (value) {
          for (const section of selectedSections) {
            section.rename(value);
          }
        }
      });
    }
  };

  private editSectionTitle(section: Section) {
    // 检查section是否被锁定（包括祖先section的锁定状态）
    if (this.project.sectionMethods.isObjectBeLockedBySection(section)) {
      toast.error("无法编辑已锁定的section");
      return;
    }
    this.project.controller.isCameraLocked = true;
    // 停止摄像机漂移
    this.project.camera.stopImmediately();
    // 编辑节点
    section.isEditingTitle = true;
    this.project.inputElement
      .input(
        this.project.renderer
          .transformWorld2View(section.rectangle.location.subtract(new Vector(0, section.text === "" ? 50 : 0)))
          .add(Vector.same(Renderer.NODE_PADDING).multiply(this.project.camera.currentScale)),
        section.text,
        (text) => {
          section.rename(text);
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          fontSize: `${Renderer.FONT_SIZE * this.project.camera.currentScale}px`,
          backgroundColor: "transparent",
          color: this.project.stageStyleManager.currentStyle.StageObjectBorder.toString(),
          outline: `solid ${2 * this.project.camera.currentScale}px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.25).toString()}`,
          marginTop: `${-8 * this.project.camera.currentScale}px`,
        },
      )
      .then(() => {
        section.isEditingTitle = false;
        this.project.controller.isCameraLocked = false;
        this.project.historyManager.recordStep();
      });
  }
}
