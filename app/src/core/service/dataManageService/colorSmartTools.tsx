import { Project } from "@/core/Project";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color } from "@graphif/data-structures";

export namespace ColorSmartTools {
  export function adjustBrightness(project: Project, delta: number) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        obj.color = new Color(
          Math.max(0, Math.min(255, obj.color.r + delta)),
          Math.max(0, Math.min(255, obj.color.g + delta)),
          Math.max(0, Math.min(255, obj.color.b + delta)),
          obj.color.a,
        );
      }
    }
  }
  export function increaseBrightness(project: Project) {
    adjustBrightness(project, 20);
  }
  export function decreaseBrightness(project: Project) {
    adjustBrightness(project, -20);
  }

  export function gradientColor(project: Project) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        const oldColor = obj.color.clone();
        obj.color = new Color(Math.max(oldColor.a - 20, 0), Math.min(255, oldColor.g + 20), oldColor.b, oldColor.a);
      }
    }
  }

  export function adjustHue(project: Project, delta: number) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        const oldColor = obj.color.clone();
        obj.color = oldColor.changeHue(delta);
      }
    }
  }
  export function changeColorHueUp(project: Project) {
    adjustHue(project, 30);
  }
  export function changeColorHueDown(project: Project) {
    adjustHue(project, -30);
  }
  export function changeColorHueMajorUp(project: Project) {
    adjustHue(project, 90);
  }
  export function changeColorHueMajorDown(project: Project) {
    adjustHue(project, -90);
  }
}
