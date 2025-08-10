import { Color } from "@graphif/color";
import { Project, service } from "@/core/Project";

/**
 * 管理所有 节点/连线 的颜色
 * 不仅包括添加颜色和去除颜色，还包括让颜色变暗和变亮等
 */
@service("stageManagerColorManager")
export class StageObjectColorManager {
  constructor(private readonly project: Project) {}

  setSelectedStageObjectColor(color: Color) {
    for (const node of this.project.stageManager.getTextNodes()) {
      if (node.isSelected) {
        node.color = color;
      }
    }
    for (const node of this.project.stageManager.getSections()) {
      if (node.isSelected) {
        node.color = color;
      }
    }
    for (const entity of this.project.stageManager.getPenStrokes()) {
      if (entity.isSelected) {
        entity.setColor(color);
      }
    }
    for (const entity of this.project.stageManager.getSvgNodes()) {
      if (entity.isSelected) {
        entity.changeColor(color);
      }
    }
    for (const edge of this.project.stageManager.getAssociations()) {
      if (edge.isSelected) {
        edge.color = color;
      }
    }
    // 特性：统一取消框选
    // this.project.stageManager.clearSelectAll();  // 不能统一取消全选，因为填充后可能会发现颜色不合适
    this.project.historyManager.recordStep();
  }

  darkenNodeColor() {
    for (const node of this.project.stageManager.getTextNodes()) {
      if (node.isSelected && node.color) {
        const darkenedColor = node.color.clone();
        darkenedColor.r = Math.max(darkenedColor.r - 20, 0);
        darkenedColor.g = Math.max(darkenedColor.g - 20, 0);
        darkenedColor.b = Math.max(darkenedColor.b - 20, 0);
        node.color = darkenedColor;
      }
    }
    this.project.historyManager.recordStep();
  }

  lightenNodeColor() {
    for (const node of this.project.stageManager.getTextNodes()) {
      if (node.isSelected && node.color) {
        const lightenedColor = node.color.clone();
        lightenedColor.r = Math.min(lightenedColor.r + 20, 255);
        lightenedColor.g = Math.min(lightenedColor.g + 20, 255);
        lightenedColor.b = Math.min(lightenedColor.b + 20, 255);
        node.color = lightenedColor;
      }
    }
    this.project.historyManager.recordStep();
  }
}
