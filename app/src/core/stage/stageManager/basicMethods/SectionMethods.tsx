/**
 * 规范：本文件中每个函数的 JSDoc 注释都应包含时间复杂度说明（@complexity 标签）。
 *
 * 常用变量约定：
 *   d  — 实体祖先链的最大深度（Section 嵌套层数）
 *   S  — 舞台上 Section 的总数
 *   E  — 传入实体/Section 列表的长度
 *   k  — 连线端点数（有向边通常为 2，多目标边可更多）
 *   N  — 某个 Section 子树内的后代节点总数
 *
 * 新增函数时请同步补充 @complexity 说明，保持文件风格一致。
 */

import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Vector } from "@graphif/data-structures";

@service("sectionMethods")
export class SectionMethods {
  private bigTitleCacheFrame = -1;
  private readonly bigTitleActiveCache = new Map<Section, boolean>();
  private readonly bigTitleCoveringAncestorCache = new Map<Entity, Section | null>();

  private prepareBigTitleFrameCache(): void {
    if (this.bigTitleCacheFrame === this.project.renderer.frameIndex) {
      return;
    }
    this.bigTitleCacheFrame = this.project.renderer.frameIndex;
    this.bigTitleActiveCache.clear();
    this.bigTitleCoveringAncestorCache.clear();
  }

  constructor(protected readonly project: Project) {}

  /**
   * 获取一个实体的它自己的父亲Sections、是第一层所有父亲Sections
   * 在废除交叉嵌套后，实体只会有一个直接父 Section。
   * @param entity
   * @complexity O(1)
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
   * @complexity O(d)，d 为实体祖先链深度；对多目标边为 O(k·d)，k 为端点数
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
   * @complexity O(d)，d 为实体祖先链深度
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
   * @complexity O(S)，S 为舞台上 Section 总数（需遍历所有根 Section 的子树）
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
   * @complexity O(S)，内部调用 getSectionsByInnerLocation
   */
  getInnermostSectionByLocation(location: Vector): Section | null {
    return this.getSectionsByInnerLocation(location)[0] ?? null;
  }

  /**
   * 当前视野下，这个 Section 是否进入了大标题覆盖形态。
   * 进入该形态后，交互应优先命中 Section 本身，而不是内部普通实体。
   * @complexity O(1)
   */
  isSectionBigTitleActive(section: Section): boolean {
    this.prepareBigTitleFrameCache();
    const cached = this.bigTitleActiveCache.get(section);
    if (cached !== undefined) {
      return cached;
    }
    if (section.isCollapsed || section.isHiddenBySectionCollapse) {
      this.bigTitleActiveCache.set(section, false);
      return false;
    }
    if (Settings.sectionBitTitleRenderType === "none") {
      this.bigTitleActiveCache.set(section, false);
      return false;
    }
    const sectionMaxSide = Math.max(section.rectangle.size.x, section.rectangle.size.y);
    const viewMaxSide = Math.max(this.project.renderer.w, this.project.renderer.h) / this.project.camera.currentScale;
    const active =
      sectionMaxSide < viewMaxSide * Settings.sectionBigTitleThresholdRatio &&
      this.project.camera.currentScale <= Settings.sectionBigTitleCameraScaleThreshold;
    this.bigTitleActiveCache.set(section, active);
    return active;
  }

  /**
   * 如果某个实体被处于大标题形态的祖先 Section 覆盖，返回这个最近的祖先。
   * 该判断只用于交互与渲染层，不会改变实体本身的可见性数据。
   * @complexity O(d)，d 为实体祖先链深度
   */
  getBigTitleCoveringAncestorSection(entity: Entity): Section | null {
    this.prepareBigTitleFrameCache();
    if (this.bigTitleCoveringAncestorCache.has(entity)) {
      return this.bigTitleCoveringAncestorCache.get(entity) ?? null;
    }
    let current = entity.parentSection;
    while (current) {
      if (this.isSectionBigTitleActive(current)) {
        this.bigTitleCoveringAncestorCache.set(entity, current);
        return current;
      }
      current = current.parentSection;
    }
    this.bigTitleCoveringAncestorCache.set(entity, null);
    return null;
  }

  /**
   * 判断实体是否因大标题 Section 激活而被隐藏（受设置开关控制）。
   * @complexity O(d)，d 为实体祖先链深度
   */
  isEntityHiddenByBigTitleSection(entity: Entity): boolean {
    if (!Settings.hideSectionContentsWhenBigTitleActive) {
      return false;
    }
    return this.getBigTitleCoveringAncestorSection(entity) !== null;
  }

  /**
   * 判断实体是否被某个大标题 Section 覆盖（不受设置开关控制，用于交互层）。
   * @complexity O(d)，d 为实体祖先链深度
   */
  isEntityCoveredByBigTitleSection(entity: Entity): boolean {
    return this.getBigTitleCoveringAncestorSection(entity) !== null;
  }

  /**
   * 获取某个实体的所有处于大标题激活状态的祖先 Section（从近到远）。
   * @complexity O(d)，d 为实体祖先链深度
   */
  private getBigTitleCoveringAncestorSections(entity: Entity): Section[] {
    const result: Section[] = [];
    let current = entity.parentSection;
    while (current) {
      if (this.isSectionBigTitleActive(current)) {
        result.push(current);
      }
      current = current.parentSection;
    }
    return result;
  }

  /**
   * 判断连线是否因大标题 Section 激活而被隐藏（受设置开关控制）。
   * 隐藏条件：连线所有端点存在共同的大标题祖先 Section。
   * 若两端分属不同的平级大标题 Section，连线穿越舞台，不应隐藏。
   *
   * 场景1：A框[a] ←→ B框[b]，A和B平级（无共同父框），都进入大标题
   *   → a 的大标题祖先集合 = {A}，b 的大标题祖先集合 = {B}，无交集 → 不隐藏 ✅
   *
   * 场景2：C框{ A框[a], B框[b] }，C进入大标题（A、B也可能同时进入大标题）
   *   → a 的大标题祖先集合 = {A, C}，b 的大标题祖先集合 = {B, C}，交集 = {C} → 隐藏 ✅
   *
   * 场景3：a 在 A框（大标题），b 不在任何框
   *   → b 的大标题祖先集合为空 → 不隐藏 ✅
   * @complexity O(k·d)，k 为端点数，d 为祖先链深度；
   *             公共祖先查找额外 O(k·d)，整体仍为 O(k·d)
   */
  isAssociationHiddenByBigTitleSection(association: Association): boolean {
    if (!Settings.hideSectionContentsWhenBigTitleActive) {
      return false;
    }
    // 连线隐藏的条件：所有端点都有一个【共同的】大标题祖先 Section。
    //
    // 场景1：A框[a] ←→ B框[b]，A和B平级（无共同父框），都进入大标题
    //   → a 的大标题祖先集合 = {A}，b 的大标题祖先集合 = {B}，无交集 → 不隐藏 ✅
    //
    // 场景2：C框{ A框[a], B框[b] }，C进入大标题（A、B也可能同时进入大标题）
    //   → a 的大标题祖先集合 = {A, C}，b 的大标题祖先集合 = {B, C}，交集 = {C} → 隐藏 ✅
    //
    // 场景3：a 在 A框（大标题），b 不在任何框
    //   → b 的大标题祖先集合为空 → 不隐藏 ✅
    const entityEndpoints = association.associationList.filter(
      (stageObject): stageObject is Entity => stageObject instanceof Entity,
    );
    if (entityEndpoints.length === 0) {
      return false;
    }
    // 获取每个端点的所有大标题祖先集合
    const ancestorSets = entityEndpoints.map((entity) => {
      const sections = this.getBigTitleCoveringAncestorSections(entity);
      return new Set(sections.map((s) => s.uuid));
    });
    // 只要有任意一端没有任何大标题祖先，连线不隐藏
    if (ancestorSets.some((set) => set.size === 0)) {
      return false;
    }
    // 检查所有端点的大标题祖先集合是否有公共元素
    const [firstSet, ...restSets] = ancestorSets;
    const hasCommonAncestor = [...firstSet].some((uuid) => restSets.every((set) => set.has(uuid)));
    return hasCommonAncestor;
  }

  /**
   * 判断连线是否被某个大标题 Section 覆盖（不受设置开关控制，用于交互层）。
   * 只要有任意一端被大标题覆盖，即视为连线被覆盖，鼠标交互不响应。
   * @complexity O(k·d)，k 为端点数，d 为祖先链深度
   */
  isAssociationCoveredByBigTitleSection(association: Association): boolean {
    return association.associationList.some((stageObject) => {
      return stageObject instanceof Entity && this.isEntityCoveredByBigTitleSection(stageObject);
    });
  }

  /**
   * 获取实体最外层的锁定祖先 Section。
   * 返回值用于交互层决定应该把选中/拖拽重定向到哪个锁定框。
   * @complexity O(d)，d 为实体祖先链深度
   */
  getOutermostLockedAncestorSection(entity: Entity): Section | null {
    const ancestors = this.getFatherSectionsList(entity).filter((section) => section.locked);
    return ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
  }

  /**
   * 通过多个Section，获取最外层的Section（即没有父亲的Section）
   * @param sections
   * @returns
   * @complexity O(E)，E 为传入 sections 列表长度（Set 构建 O(E)，filter O(E)）
   */
  shallowerSection(sections: Section[]): Section[] {
    const sectionUUIDSet = new Set(sections.map((section) => section.uuid));
    return sections.filter((section) => {
      const parent = section.parentSection;
      return !parent || !sectionUUIDSet.has(parent.uuid);
    });
  }

  /**
   * 从实体列表中筛选出"最浅层"的非 Section 实体：
   * 若某实体的任意祖先 Section 已在传入列表中，则该实体被排除（由祖先代表）。
   * 最终结果同时附加传入列表中的所有 Section。
   * @complexity O(E·d)，E 为传入实体列表长度，d 为祖先链深度
   */
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
   * @complexity O(d)，d 为实体祖先链深度
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
   * 返回一个分组框的最大嵌套深度
   * @param section
   * @complexity O(N)，N 为 section 子树内的后代 Section 总数
   */
  getSectionMaxDeep(section: Section): number {
    const visited = new Set<string>();
    const dfs = (node: Section, deep = 1): number => {
      if (visited.has(node.uuid)) {
        return deep;
      }
      visited.add(node.uuid);
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
   * 根据选中的多个Section，获取所有选中的实体（包括子实体）
   * 可以解决复制多个Section时，内部实体的连线问题
   * @param selectedEntities
   * @complexity O(N)，N 为所有传入实体子树的后代节点总数之和
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

  /**
   * 对传入的 Section 列表按 y 轴坐标从上到下排序（z 轴暂不考虑）。
   * @complexity O(E·log E)，E 为传入 sections 列表长度（原生排序）
   */
  getSortedSectionsByZ(sections: Section[]): Section[] {
    // 先按y排序，从上到下，先不管z
    return sections.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);
  }

  /**
   * 递归获取某个 Section 子树中包含指定位置的最深层 Section。
   * 若该 Section 已折叠或被隐藏，或位置不在其范围内，直接返回空数组。
   * 若有子 Section 命中，则只返回最深层的子 Section；否则返回自身。
   * @complexity O(N)，N 为该 Section 子树内的后代 Section 总数
   */
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
