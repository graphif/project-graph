import type { Project } from "@/core/Project";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";

/**
 * 同步关系渲染器
 *
 * 负责渲染孪生同步关系的视觉表现：
 * - 当选中某个有同步关系的对象时，渲染从该对象中心到所有孪生兄弟中心的虚线
 * - 使用主题成功颜色虚线表示同步关系
 *
 * 注意：此渲染器独立于具体对象类型，可以被任何 StageObject 使用
 */
export namespace SyncAssociationRenderer {
  /**
   * 渲染指定 StageObject 的同步关系虚线
   *
   * 以当前选中对象的中心为起点，向所有孪生兄弟的中心画一条淡色虚线
   *
   * @param project 项目实例
   * @param obj 需要渲染同步关系的舞台对象
   */
  export function renderSyncLines(project: Project, obj: StageObject): void {
    const siblings = project.syncAssociationManager.getSyncSiblings(obj);
    if (siblings.length === 0) return;

    const sourceCenter = project.renderer.transformWorld2View(obj.collisionBox.getRectangle().center);

    // 使用主题成功颜色，半透明
    const lineColor = project.stageStyleManager.currentStyle.effects.successShadow.toNewAlpha(0.6);
    const lineWidth = 1.5 * project.camera.currentScale;
    const dashLength = 8 * project.camera.currentScale;

    for (const sibling of siblings) {
      const siblingRect = sibling.collisionBox.getRectangle();
      const siblingCenter = project.renderer.transformWorld2View(siblingRect.center);
      project.curveRenderer.renderDashedLine(sourceCenter, siblingCenter, lineColor, lineWidth, dashLength);
    }
  }

  /**
   * 渲染所有选中对象的同步关系虚线
   *
   * 遍历所有选中的舞台对象，为每个有同步关系的对象渲染虚线
   *
   * @param project 项目实例
   */
  export function renderAllSelectedSyncLines(project: Project): void {
    const selectedObjects = project.stageManager.getSelectedStageObjects();
    for (const obj of selectedObjects) {
      renderSyncLines(project, obj);
    }
  }
}
