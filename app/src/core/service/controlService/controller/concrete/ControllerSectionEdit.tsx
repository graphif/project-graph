import { Dialog } from "@/components/ui/dialog";
import { Project } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { textToTextArray } from "@/utils/font";
import { colorInvert, Vector } from "@graphif/data-structures";
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
    if (this.project.sectionMethods.isObjectBeLockedBySection(section)) {
      toast.error("无法编辑已锁定的section");
      return;
    }
    this.project.controller.isCameraLocked = true;
    this.project.camera.stopImmediately();
    section.isEditingTitle = true;

    if (section.mode === "caption") {
      this.editCaptionTitle(section);
    } else {
      this.editGroupTitle(section);
    }
  }

  private editGroupTitle(section: Section) {
    const inputLocation = section.rectangle.location.subtract(new Vector(0, section.text === "" ? 50 : 0));

    this.project.inputElement
      .input(
        this.project.renderer
          .transformWorld2View(inputLocation)
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

  private editCaptionTitle(section: Section) {
    const padding = 10;
    const lineHeight = 1.2;
    const rect = section.rectangle;
    const scale = this.project.camera.currentScale;

    // 计算 caption 区域位置，与 renderCaption 中的逻辑一致
    const limitWidth = rect.size.x - padding * 2;
    const lines = section.text === "" ? [] : textToTextArray(section.text, Renderer.FONT_SIZE, limitWidth);
    const captionHeight = lines.length === 0 ? 0 : lines.length * Renderer.FONT_SIZE * lineHeight + padding * 2;

    // caption 文本起始位置（世界坐标），与 renderCaption 中的 captionLocation 一致
    const captionLocation = new Vector(
      rect.location.x + padding,
      rect.location.y + rect.size.y - captionHeight + padding,
    );
    const captionViewLocation = this.project.renderer.transformWorld2View(captionLocation);
    const captionViewWidth = limitWidth * scale;

    this.project.inputElement
      .textarea(
        section.text,
        (text, ele) => {
          section.rename(text);
          ele.style.height = "auto";
          ele.style.height = `${ele.scrollHeight}px`;
        },
        {
          position: "fixed",
          resize: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          left: `${captionViewLocation.x}px`,
          top: `${captionViewLocation.y}px`,
          width: `${captionViewWidth}px`,
          minWidth: `${captionViewWidth}px`,
          fontSize: `${Renderer.FONT_SIZE * scale}px`,
          backgroundColor: "transparent",
          color: (section.color.a === 1
            ? colorInvert(section.color)
            : colorInvert(this.project.stageStyleManager.currentStyle.Background)
          ).toHexStringWithoutAlpha(),
          outline: `solid ${1 * scale}px ${this.project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.1).toString()}`,
          padding: `${padding * scale}px`,
        },
        true,
      )
      .then(() => {
        section.isEditingTitle = false;
        this.project.controller.isCameraLocked = false;
        this.project.historyManager.recordStep();
      });
  }
}
