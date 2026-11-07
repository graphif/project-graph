import { Project } from "@/core/Project";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Color } from "@graphif/data-structures";

export namespace ColorSmartTools {
  export function increaseBrightness(project: Project) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        obj.color = new Color(
          Math.min(255, obj.color.r + 20),
          Math.min(255, obj.color.b + 20),
          Math.min(255, obj.color.g + 20),
          obj.color.a,
        );
      }
    }
  }

  export function decreaseBrightness(project: Project) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        obj.color = new Color(
          Math.max(0, obj.color.r - 20),
          Math.max(0, obj.color.b - 20),
          Math.max(0, obj.color.g - 20),
          obj.color.a,
        );
      }
    }
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

  export function changeColorHueUp(project: Project) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        const oldColor = obj.color.clone();
        obj.color = oldColor.changeHue(30);
      }
    }
  }

  export function changeColorHueDown(project: Project) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        const oldColor = obj.color.clone();
        console.log(obj.color);
        obj.color = oldColor.changeHue(-30);
        console.log(obj.color);
      }
    }
  }

  export function changeColorHueMajorUp(project: Project) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        const oldColor = obj.color.clone();
        obj.color = oldColor.changeHue(90);
      }
    }
  }

  export function changeColorHueMajorDown(project: Project) {
    const selectedStageObject = project.stageManager.getStageObjects().filter((obj) => obj.isSelected);
    for (const obj of selectedStageObject) {
      if (obj instanceof TextNode) {
        if (obj.color.a === 0) continue;
        const oldColor = obj.color.clone();
        console.log(obj.color);
        obj.color = oldColor.changeHue(-90);
        console.log(obj.color);
      }
    }
  }
}
