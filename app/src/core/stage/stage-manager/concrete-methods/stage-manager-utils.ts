import { Project, service } from "@/core/Project";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";

/**
 * 舞台管理器相关的工具函数
 *
 */
@service("stageUtils")
export class StageUtils {
  constructor(private readonly project: Project) {}

  /**
   * 替换不需要在舞台上做检测的自动生成的名称
   * @param template
   * @returns
   */
  replaceAutoNameWithoutStage(template: string): string {
    if (template.includes("{{date}}")) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      template = template.replaceAll("{{date}}", `${year}-${month}-${date}`);
    }
    if (template.includes("{{time}}")) {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const second = now.getSeconds();
      template = template.replaceAll("{{time}}", `${hour}:${minute}:${second}`);
    }
    return template;
  }

  /**
   * 替换带有{{i}} 命名的自动生成的名称
   * @param template
   * @param targetStageObject
   */
  replaceAutoNameTemplate(currentName: string, targetStageObject: StageObject): string {
    // 先替换掉不需要检测舞台上内容的部分
    currentName = this.replaceAutoNameWithoutStage(currentName);

    if (currentName.includes("{{i}}")) {
      let i = 0;
      while (true) {
        const currentCmpName = currentName.replace("{{i}}", i.toString());
        let isConflict = false;
        if (targetStageObject instanceof TextNode) {
          isConflict = this.isNameConflictWithTextNodes(currentCmpName);
        } else if (targetStageObject instanceof Section) {
          isConflict = this.isNameConflictWithSections(currentCmpName);
        }
        if (isConflict) {
          i++;
          continue;
        } else {
          // 没有冲突，就这样了
          break;
        }
      }
      currentName = currentName.replaceAll("{{i}}", i.toString());
    }
    return currentName;
  }

  isNameConflictWithTextNodes(name: string): boolean {
    // 获取当前视野范围
    const viewportRect = this.project.renderer.getCoverWorldRectangle();
    for (const node of this.project.stageManager.getTextNodes()) {
      // 仅检查视野内的节点
      if (viewportRect.isCollideWith(node.rectangle)) {
        if (node.text === name) {
          return true;
        }
      }
    }
    return false;
  }

  isNameConflictWithSections(name: string): boolean {
    // 获取当前视野范围
    const viewportRect = this.project.renderer.getCoverWorldRectangle();
    for (const section of this.project.stageManager.getSections()) {
      // 仅检查视野内的 section
      if (viewportRect.isCollideWith(section.rectangle)) {
        if (section.text === name) {
          return true;
        }
      }
    }
    return false;
  }
}
