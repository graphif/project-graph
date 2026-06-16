import { Vector } from "@graphif/data-structures";
import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";

@service("sectionMethods")
export class SectionMethods {
  constructor(protected readonly project: Project) {}

  /**
   * 获取一个实体的它自己的父亲Sections、是第一层所有父亲Sections
   * 在废除交叉嵌套后，实体只会有一个直接父 Section。
   * @param entity
   */
  getFatherSections(entity: Entity): Section[] {
    if (entity.parentSection) {
      return [entity.parentSection];
    }
    return [];
  }

  /**
   * 检查舞台对象是否在锁定的Section内
   * 对于实体：检查它的所有父Section是否有锁定的
   * 对于连线：检查它连接的所有实体是否在锁定的Section内
   * @param object 舞台对象（实体或连线）
   * @returns 如果对象连接了锁定的Section内物体，返回true
   */
  isObjectBeLockedBySection(object: StageObject): boolean {
    if (object instanceof Entity) {
      if (object instanceof Section && object.locked) {
        return true;
      }
      return object.nearestLockedAncestorSection !== null;
    } else if (object instanceof Edge) {
      return object.source.nearestLockedAncestorSection !== null || object.target.nearestLockedAncestorSection !== null;
    } else if (object instanceof MultiTargetUndirectedEdge) {
      for (const entity of object.associationList) {
        if (entity.nearestLockedAncestorSection !== null) {
          return true;
        }
      }
      return false;
    }
    return false;
  }

  /**
   * 获取一个实体被他包围的全部实体，一层一层的包含并以数组返回
   * A{B{C{entity}}}
   * 会返回 [C, B, A]
   * @param entity
   */
  getFatherSectionsList(entity: Entity): Section[] {
    const result: Section[] = [];
    let current = entity.parentSection;
    while (current) {
      result.push(current);
      current = current.parentSection;
    }
    return result;
  }

  /**
   * 根据一个位置，获取包含这个位置的所有Section（深Section优先）
   * 例如在十字位置上，获取到的结果是 [B]
   *               │
   *     ┌─────────┼────────────────────────┐
   *     │A        │                        │
   *     │  ┌──────┼──────┐   ┌───────┐     │
   *     │  │B     │      │   │C      │     │
   *─────┼──┼──────┼──────┼───┼───────┼─────┼─────
   *     │  │      │      │   │       │     │
   *     │  └──────┼──────┘   └───────┘     │
   *     │         │                        │
   *     └─────────┼────────────────────────┘
   *               │
   * @returns
   */
  getSectionsByInnerLocation(location: Vector): Section[] {
    const result: Section[] = [];
    for (const rootSection of this.project.stageManager.getRootSections()) {
      result.push(...this.getDeepestSectionsAtLocation(rootSection, location));
    }
    return this.getSortedSectionsByZ(result).reverse();
  }

  /**
   * 获取某个位置所在的最内层 Section。
   * 在单父树结构下，命中结果只会有一个优先目标。
   */
  getInnermostSectionByLocation(location: Vector): Section | null {
    return this.getSectionsByInnerLocation(location)[0] ?? null;
  }

  /**
   * 当前视野下，这个 Section 是否进入了大标题覆盖形态。
   * 进入该形态后，交互应优先命中 Section 本身，而不是内部普通实体。
   */
  isSectionBigTitleActive(section: Section): boolean {
    if (section.isCollapsed || section.isHiddenBySectionCollapse) {
      return false;
    }
    if (Settings.sectionBitTitleRenderType === "none") {
      return false;
    }
    const viewRect = this.project.renderer.getCoverWorldRectangle();
    const sectionMaxSide = Math.max(section.rectangle.size.x, section.rectangle.size.y);
    const viewMaxSide = Math.max(viewRect.size.x, viewRect.size.y);
    return (
      sectionMaxSide < viewMaxSide * Settings.sectionBigTitleThresholdRatio &&
      this.project.camera.currentScale <= Settings.sectionBigTitleCameraScaleThreshold
    );
  }

  /**
   * 如果某个实体被处于大标题形态的祖先 Section 覆盖，返回这个最近的祖先。
   * 该判断只用于交互与渲染层，不会改变实体本身的可见性数据。
   */
  getBigTitleCoveringAncestorSection(entity: Entity): Section | null {
    let current = entity.parentSection;
    while (current) {
      if (this.isSectionBigTitleActive(current)) {
        return current;
      }
      current = current.parentSection;
    }
    return null;
  }

  isEntityHiddenByBigTitleSection(entity: Entity): boolean {
    if (!Settings.hideSectionContentsWhenBigTitleActive) {
      return false;
    }
    return this.getBigTitleCoveringAncestorSection(entity) !== null;
  }

  isEntityCoveredByBigTitleSection(entity: Entity): boolean {
    return this.getBigTitleCoveringAncestorSection(entity) !== null;
  }

  isAssociationHiddenByBigTitleSection(association: Association): boolean {
    if (!Settings.hideSectionContentsWhenBigTitleActive) {
      return false;
    }
    return association.associationList.some((stageObject) => {
      return stageObject instanceof Entity && this.isEntityHiddenByBigTitleSection(stageObject);
    });
  }

  isAssociationCoveredByBigTitleSection(association: Association): boolean {
    return association.associationList.some((stageObject) => {
      return stageObject instanceof Entity && this.isEntityCoveredByBigTitleSection(stageObject);
    });
  }

  /**
   * 获取实体最外层的锁定祖先 Section。
   * 返回值用于交互层决定应该把选中/拖拽重定向到哪个锁定框。
   */
  getOutermostLockedAncestorSection(entity: Entity): Section | null {
    const ancestors = this.getFatherSectionsList(entity).filter((section) => section.locked);
    return ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
  }

  /**
   * 通过多个Section，获取最外层的Section（即没有父亲的Section）
   * @param sections
   * @returns
   */
  shallowerSection(sections: Section[]): Section[] {
    const sectionUUIDSet = new Set(sections.map((section) => section.uuid));
    return sections.filter((section) => {
      const parent = section.parentSection;
      return !parent || !sectionUUIDSet.has(parent.uuid);
    });
  }

  shallowerNotSectionEntities(entities: Entity[]): Entity[] {
    const sections = entities.filter((entity) => entity instanceof Section) as Section[];
    const sectionUUIDSet = new Set(sections.map((section) => section.uuid));
    const result: Entity[] = [];
    for (const entity of entities) {
      if (entity instanceof Section) {
        continue;
      }
      let current = entity.parentSection;
      let isAnyChild = false;
      while (current) {
        if (sectionUUIDSet.has(current.uuid)) {
          isAnyChild = true;
          break;
        }
        current = current.parentSection;
      }
      if (!isAnyChild) {
        result.push(entity);
      }
    }
    result.push(...sections);
    return result;
  }

  /**
   * 检测某个实体是否在某个集合内，跨级也算
   * @param entity
   * @param section
   */
  isEntityInSection(entity: Entity, section: Section): boolean {
    let current = entity.parentSection;
    while (current) {
      if (current === section) {
        return true;
      }
      current = current.parentSection;
    }
    return false;
  }

  /**
   * 检测一个Section内部是否符合树形嵌套结构
   * @param rootNode
   */
  isTreePack(rootNode: Section) {
    const dfs = (node: Entity, visited: Entity[]): boolean => {
      if (visited.includes(node)) {
        return false;
      }
      visited.push(node);
      if (node instanceof Section) {
        for (const child of node.children) {
          if (!dfs(child, visited)) {
            return false;
          }
        }
      }
      return true;
    };
    return dfs(rootNode, []);
  }

  /**
   * 返回一个分组框的最大嵌套深度
   * @param section
   */
  getSectionMaxDeep(section: Section): number {
    const visited: Section[] = [];
    const dfs = (node: Section, deep = 1): number => {
      if (visited.includes(node)) {
        return deep;
      }
      visited.push(node);
      for (const child of node.children) {
        if (child instanceof Section) {
          deep = Math.max(deep, dfs(child, deep + 1));
        }
      }
      return deep;
    };
    return dfs(section);
  }

  /**
   * 用途：
   * 根据选中的多个Section，获取所有选中的实体（包括子实体）
   * 可以解决复制多个Section时，内部实体的连线问题
   * @param selectedEntities
   */
  getAllEntitiesInSelectedSectionsOrEntities(selectedEntities: Entity[]): Entity[] {
    const entityUUIDSet = new Set<string>();
    const dfs = (currentEntity: Entity) => {
      if (entityUUIDSet.has(currentEntity.uuid)) {
        return;
      }
      if (currentEntity instanceof Section) {
        for (const child of currentEntity.children) {
          dfs(child);
        }
      }
      entityUUIDSet.add(currentEntity.uuid);
    };
    for (const entity of selectedEntities) {
      dfs(entity);
    }
    return this.project.stageManager.getEntitiesByUUIDs(Array.from(entityUUIDSet));
  }

  getSortedSectionsByZ(sections: Section[]): Section[] {
    // 先按y排序，从上到下，先不管z
    return sections.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);
  }

  private getDeepestSectionsAtLocation(section: Section, location: Vector): Section[] {
    if (section.isCollapsed || section.isHiddenBySectionCollapse) {
      return [];
    }
    if (!section.collisionBox.getRectangle().isPointIn(location)) {
      return [];
    }

    const deeperSections: Section[] = [];
    for (const child of section.children) {
      if (child instanceof Section) {
        deeperSections.push(...this.getDeepestSectionsAtLocation(child, location));
      }
    }

    if (deeperSections.length > 0) {
      return deeperSections;
    }
    return [section];
  }
}
