import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Vector } from "@graphif/data-structures";
import { Line, Rectangle } from "@graphif/shapes";

/**
 * Section 碰撞管理器：负责检测同级 Section 之间的碰撞，并将重叠的同级分支递归地推离。
 *
 * 集成点：在 updateFatherSectionByMove 的每次 adjustLocationAndSize() 调用后，
 * 调用 solveOverlaps(section) 来消除新产生的重叠。
 * 可通过设置 isEnableSectionCollision 全局开关控制是否启用。
 */
@service("sectionCollisionSolver")
export class SectionCollisionSolver {
  constructor(private readonly project: Project) {}

  /**
   * 当 grownSection 刚刚通过 adjustLocationAndSize() 增大后，
   * 检测其与同级 Section 的重叠，并将重叠的同级分支推离。
   * 递归地向上传播，确保每一层级的同级冲突都被解决。
   *
   * @param grownSection 刚刚增大或移动的 Section
   * @param visited      本次求解链中已处理过的 Section uuid（防止循环）
   */
  solveOverlaps(grownSection: Section, visited: Set<string> = new Set()): void {
    if (!Settings.isEnableSectionCollision) return;
    if (visited.has(grownSection.uuid)) return;
    visited.add(grownSection.uuid);

    const siblings = this.getSiblingsSections(grownSection);
    const grownRect = grownSection.collisionBox.getRectangle();

    for (const sibling of siblings) {
      // 跳过被锁定的同级 Section（无法安全地原地修改其位置数据）
      if (sibling.locked) continue;
      if (visited.has(sibling.uuid)) continue;

      const siblingRect = sibling.collisionBox.getRectangle();
      if (!grownRect.isCollideWith(siblingRect)) continue;

      const delta = this.computePushDelta(grownRect, siblingRect);
      if (delta.x === 0 && delta.y === 0) continue;

      // 直接平移 sibling 整棵子树，不触发父级更新或碰撞事件链
      this.rawShiftEntityTree(sibling, delta);

      // 向上更新包围盒，并在每一层继续检测新的同级碰撞
      this.updateAncestorsAfterShift(sibling, visited);
    }
  }

  // ─────────────────────────────────────────────
  // 私有辅助方法
  // ─────────────────────────────────────────────

  /**
   * 在 sibling 被推移后，沿父级链向上依次 adjustLocationAndSize，
   * 并对每个扩大的父框再次检测同级碰撞（递归向上传播）。
   */
  private updateAncestorsAfterShift(entity: Entity, visited: Set<string>): void {
    const fathers = this.project.sectionMethods.getFatherSections(entity);
    for (const father of fathers) {
      father.adjustLocationAndSize();
      // 父框扩大后可能与其自身的同级 Section 碰撞，继续向上求解
      this.solveOverlaps(father, visited);
      this.updateAncestorsAfterShift(father, visited);
    }
  }

  /**
   * 获取与给定 Section 共享直接父框的所有同级 Section。
   * 若 section 处于根层级（无父框），则返回所有其他根层级 Section。
   */
  private getSiblingsSections(section: Section): Section[] {
    const parents = this.project.sectionMethods.getFatherSections(section);

    if (parents.length === 0) {
      // 根层级：所有无父框的其他 Section 都是同级
      return this.project.stageManager.getSections().filter((s) => {
        if (s === section) return false;
        return this.project.sectionMethods.getFatherSections(s).length === 0;
      });
    }

    // 从各个父框的直接子节点中收集同级 Section（去重）
    const seen = new Set<string>();
    const siblings: Section[] = [];
    for (const parent of parents) {
      for (const child of parent.children) {
        if (child instanceof Section && child !== section && !seen.has(child.uuid)) {
          seen.add(child.uuid);
          siblings.push(child);
        }
      }
    }
    return siblings;
  }

  /**
   * 计算将 siblingRect 从 grownRect 推离所需的最小分离向量。
   * 选择重叠量较小的轴方向推移（与 collideWithOtherEntity 逻辑一致）。
   */
  private computePushDelta(grownRect: Rectangle, siblingRect: Rectangle): Vector {
    const overlapSize = grownRect.getOverlapSize(siblingRect);
    if (overlapSize.x === 0 && overlapSize.y === 0) {
      return Vector.getZero();
    }

    if (overlapSize.x <= overlapSize.y) {
      // 水平方向推移（重叠宽度更小）
      const cx = siblingRect.center.x - grownRect.center.x;
      const dir = cx === 0 ? 1 : Math.sign(cx);
      return new Vector(overlapSize.x * dir, 0);
    } else {
      // 垂直方向推移（重叠高度更小）
      const cy = siblingRect.center.y - grownRect.center.y;
      const dir = cy === 0 ? 1 : Math.sign(cy);
      return new Vector(0, overlapSize.y * dir);
    }
  }

  /**
   * 对 entity 及其所有后代（子树）直接施加位移，
   * 不触发 updateFatherSectionByMove / updateOtherEntityLocationByMove 等事件链，
   * 从而避免在批量推移过程中引发循环或振荡。
   *
   * 注意：对锁定 Section，collisionBox 返回临时对象，无法有效修改底层数据，
   * 因此跳过。调用方应在调用前过滤掉锁定的同级 Section。
   */
  private rawShiftEntityTree(entity: Entity, delta: Vector): void {
    // 锁定 Section 的 collisionBox 是每次重新计算的临时值，无法原地修改
    if (entity instanceof Section && entity.locked) return;

    for (const shape of entity.collisionBox.shapes) {
      if (shape instanceof Line) {
        shape.start = shape.start.add(delta);
        shape.end = shape.end.add(delta);
      } else if (shape instanceof Rectangle) {
        shape.location = shape.location.add(delta);
      }
    }

    // Section 需要递归平移所有子节点
    if (entity instanceof Section) {
      for (const child of entity.children) {
        this.rawShiftEntityTree(child, delta);
      }
    }
  }
}
