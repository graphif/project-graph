import { Project, service } from "@/core/Project";
import { Vector } from "@graphif/data-structures";
import { Section } from "../../stageObject/entity/Section";
import { toast } from "sonner";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { PathString } from "@/utils/pathString";
import { onOpenFile } from "@/core/service/GlobalMenu";
import { ReferenceBlockNode } from "../../stageObject/entity/ReferenceBlockNode";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import { SectionReferencePanel } from "@/sub/ReferencesWindow";

@service("referenceManager")
export class ReferenceManager {
  constructor(private readonly project: Project) {}

  /**
   * 处理引用按钮点击事件
   * 这个函数需要性能优化，鼠标每次点击都会调用这个函数
   * @param clickLocation 点击位置
   */
  public onClickReferenceNumber(clickLocation: Vector) {
    //
    for (const sectionName in this.project.references.sections) {
      const section = this.findSectionBySectionName(sectionName);
      if (section) {
        if (section.isMouseInReferenceButton(clickLocation)) {
          // 打开这个详细信息的引用弹窗
          this.openSectionReferencePanel(section);
          return;
        }
      }
    }
  }

  /**
   * 从源头 跳转到引用位置
   * @param section
   */
  public async jumpToReferenceLocation(fileName: string, referenceBlockNodeSectionName: string) {
    const recentFiles = await RecentFileManager.getRecentFiles();
    const file = recentFiles.find(
      (file) =>
        PathString.getFileNameFromPath(file.uri.path) === fileName ||
        PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
    );
    if (!file) {
      toast.error(`文件 ${fileName} 未找到`);
      return;
    }
    const project = await onOpenFile(file.uri, "ReferencesWindow跳转打开-prg文件");
    // 从被引用的源头，跳转到引用的地方
    if (project && referenceBlockNodeSectionName) {
      setTimeout(() => {
        const referenceBlockNode = project.stage
          .filter((o) => o instanceof ReferenceBlockNode)
          .find((o) => o.sectionName === referenceBlockNodeSectionName);
        if (referenceBlockNode) {
          const center = referenceBlockNode.collisionBox.getRectangle().center;
          project.camera.location = center;
          // 加一个特效
          project.effects.addEffect(RectangleLittleNoteEffect.fromUtilsSlowNote(referenceBlockNode));
        } else {
          toast.error(`没有找到引用标题为 “${referenceBlockNodeSectionName}” 的引用块节点`);
        }
      }, 100);
    }
  }

  private openSectionReferencePanel(section: Section) {
    // 打开这个详细信息的引用弹窗
    SectionReferencePanel.open(
      this.project.uri,
      section.text,
      this.project.renderer.transformWorld2View(section.rectangle.leftTop),
    );
  }

  private findSectionBySectionName(sectionName: string) {
    const section = this.project.stage
      .filter((object) => object instanceof Section)
      .find((section) => section.text === sectionName);
    if (section) {
      return section;
    }
    return null;
  }
}
