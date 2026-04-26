import { Project, service } from "@/core/Project";
import { RectangleTransformEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleTransformEffect";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Direction } from "@/types/directions";
import { Vector } from "@graphif/data-structures";
import { Line, Rectangle } from "@graphif/shapes";
import { Settings } from "../../Settings";

/**
 * 仅在keyboardOnlyEngine中使用，用于处理select change事件
 */
@service("selectChangeEngine")
export class SelectChangeEngine {
  private lastSelectNodeByKeyboardUUID = "";

  constructor(private readonly project: Project) {}

  selectUp(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }
    const newNode = this.navigateInDirection(selectedNode, Direction.Up);
    this.afterSelect(selectedNode, newNode, !addSelect);
  }

  selectDown(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }

    // Section 进入逻辑：选中 Section 框时，按「下」键进入内部最靠上的子实体
    if (selectedNode instanceof Section) {
      const visibleChildren = selectedNode.children.filter(
        (child) => !child.isHiddenBySectionCollapse && child instanceof ConnectableEntity,
      ) as ConnectableEntity[];
      if (visibleChildren.length > 0) {
        const topChild = visibleChildren.reduce((a, b) => {
          const aTop = a.collisionBox.getRectangle().top;
          const bTop = b.collisionBox.getRectangle().top;
          return aTop <= bTop ? a : b;
        });
        this.afterSelect(selectedNode, topChild, !addSelect);
        return;
      }
    }

    const newNode = this.navigateInDirection(selectedNode, Direction.Down);
    this.afterSelect(selectedNode, newNode, !addSelect);
  }

  selectLeft(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }
    const newNode = this.navigateInDirection(selectedNode, Direction.Left);
    this.afterSelect(selectedNode, newNode, !addSelect);
  }

  selectRight(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }
    const newNode = this.navigateInDirection(selectedNode, Direction.Right);
    this.afterSelect(selectedNode, newNode, !addSelect);
  }

  /**
   * 方向导航核心：直线条形区域优先，其次 45° 扇形，始终限定在同一层级内导航。
   *
   * 层级规则：
   * - 在 Section 内部 → 候选集为父 Section 的直接子节点（不含自身）
   * - 在顶层（无父 Section）→ 候选集为无父 Section 的顶层节点（含 Section 框本体，但不含其内部子节点）
   *
   * 跳出规则（Section 内同层无候选时）：
   * - 上/左/右 → 选中父 Section 框本体
   * - 下 → 以父 Section 为基准在父层继续向下导航，避免落回 Section 本体后死循环
   */
  private navigateInDirection(selectedNode: ConnectableEntity, direction: Direction): ConnectableEntity | null {
    const nodeRect = selectedNode.collisionBox.getRectangle();
    const fatherSections = this.project.sectionMethods.getFatherSections(selectedNode);
    const parentSection = fatherSections.length > 0 ? fatherSections[0] : null;

    const candidates = parentSection
      ? this.getSameLevelCandidates(parentSection, selectedNode)
      : this.getTopLevelCandidates(selectedNode);

    const stripNodes = this.collectNodesInStrip(selectedNode, direction, candidates);
    if (stripNodes.length > 0) {
      return this.getMostNearInStripByDh(stripNodes, nodeRect, direction);
    }

    const fanNodes = this.collectFanNodes(selectedNode, direction, candidates);
    if (fanNodes.length > 0) {
      return this.getMostNearConnectableEntity(fanNodes, nodeRect.center);
    }

    if (parentSection === null) {
      return null;
    }

    // 上/左/右 跳出：选中父 Section 框本体
    if (direction !== Direction.Down) {
      return parentSection;
    }

    // 下 跳出：从直接父 Section 开始，逐层向外爬，每层以当前 Section 为支点在父层候选集中
    // 继续向下导航；若该层也无结果则继续上升，直到找到目标或到达顶层。
    // 这样可以穿透任意深度的嵌套（如 b3 在 B 在 A，顶层有 C 时能直接跳到 C）。
    let pivot: ConnectableEntity = parentSection;
    while (true) {
      const pivotParents = this.project.sectionMethods.getFatherSections(pivot);
      const pivotParent = pivotParents.length > 0 ? pivotParents[0] : null;
      const outerCandidates = pivotParent
        ? this.getSameLevelCandidates(pivotParent, pivot)
        : this.getTopLevelCandidates(pivot);

      const pivotRect = pivot.collisionBox.getRectangle();
      const outerStripNodes = this.collectNodesInStrip(pivot, direction, outerCandidates);
      if (outerStripNodes.length > 0) {
        return this.getMostNearInStripByDh(outerStripNodes, pivotRect, direction);
      }

      const outerFanNodes = this.collectFanNodes(pivot, direction, outerCandidates);
      if (outerFanNodes.length > 0) {
        return this.getMostNearConnectableEntity(outerFanNodes, pivotRect.center);
      }

      // 当前层也无结果：若已到顶层则放弃，否则继续上升
      if (pivotParent === null) {
        return null;
      }
      pivot = pivotParent;
    }
  }

  /**
   * 获取某个 Section 的直接子节点候选集（排除指定节点自身及被折叠隐藏的节点）。
   */
  private getSameLevelCandidates(parentSection: Section, excludeNode: ConnectableEntity): ConnectableEntity[] {
    return parentSection.children.filter(
      (child) =>
        child instanceof ConnectableEntity && child.uuid !== excludeNode.uuid && !child.isHiddenBySectionCollapse,
    ) as ConnectableEntity[];
  }

  /**
   * 获取顶层候选集：无父 Section 的节点（Section 框本体算顶层，其内部子节点不算），排除指定节点自身。
   */
  private getTopLevelCandidates(excludeNode: ConnectableEntity): ConnectableEntity[] {
    return this.project.stageManager
      .getConnectableEntity()
      .filter((n) => n.uuid !== excludeNode.uuid && this.project.sectionMethods.getFatherSections(n).length === 0);
  }

  /**
   * 扩散选择（根据连线）
   * @param isKeepExpand 扩散后是否保持原有的选择
   * @param reversed 是否反向扩散
   * @returns
   */
  expandSelect(isKeepExpand = false, reversed: boolean = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }

    const selectedEntities = this.project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    const selectedEntitiesUUIDSet = new Set<string>();
    selectedEntities.map((entity) => selectedEntitiesUUIDSet.add(entity.uuid));
    if (selectedEntities.length === 0) {
      return;
    }
    const expandUUIDSet: Set<string> = new Set();

    if (reversed) {
      for (const selectedEntity of selectedEntities) {
        this.project.graphMethods.nodeParentArray(selectedEntity).map((entity) => expandUUIDSet.add(entity.uuid));
      }
    } else {
      for (const selectedEntity of selectedEntities) {
        this.project.graphMethods
          .getOneStepSuccessorSet(selectedEntity)
          .map((entity) => expandUUIDSet.add(entity.uuid));
      }
    }
    if (isKeepExpand) {
      const combinedUUIDSet = new Set([...selectedEntitiesUUIDSet, ...expandUUIDSet]);
      for (const newUUID of combinedUUIDSet) {
        const newEntity = this.project.stageManager.getConnectableEntityByUUID(newUUID);
        if (newEntity) {
          newEntity.isSelected = true;
        }
      }
    } else {
      for (const newUUID of expandUUIDSet) {
        const newEntity = this.project.stageManager.getConnectableEntityByUUID(newUUID);
        if (newEntity) {
          newEntity.isSelected = true;
        }
      }
      for (const oldUUID of selectedEntitiesUUIDSet) {
        const oldEntity = this.project.stageManager.getConnectableEntityByUUID(oldUUID);
        if (oldEntity) {
          oldEntity.isSelected = false;
        }
      }
    }
  }

  private afterSelect(
    selectedNodeRect: ConnectableEntity,
    newSelectedConnectableEntity: ConnectableEntity | null,
    clearOldSelect = true,
  ) {
    if (newSelectedConnectableEntity === null) {
      return;
    }
    newSelectedConnectableEntity.isSelected = true;
    this.lastSelectNodeByKeyboardUUID = newSelectedConnectableEntity.uuid;
    const newSelectNodeRect = newSelectedConnectableEntity.collisionBox.getRectangle();

    if (Settings.cameraFollowsSelectedNodeOnArrowKeys) {
      this.project.camera.bombMove(newSelectNodeRect.center);
    }
    if (clearOldSelect) {
      selectedNodeRect.isSelected = false;
    }

    this.addEffect(selectedNodeRect.collisionBox.getRectangle(), newSelectNodeRect);
    this.project.keyboardOnlyTreeEngine.addNodeEffectByPreDirection(newSelectedConnectableEntity);
  }

  private getCurrentSelectedNode(): ConnectableEntity | null {
    const selectedEntities = this.project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    let selectedNode: ConnectableEntity | null = null;
    if (selectedEntities.length === 0) {
      const nearestNode = this.selectMostNearLocationNode(this.project.camera.location);
      if (nearestNode) {
        nearestNode.isSelected = true;
      }
      return null;
    } else if (selectedEntities.length === 1) {
      selectedNode = selectedEntities[0];
    } else {
      const lastSelectNodeArr = this.project.stageManager
        .getEntitiesByUUIDs([this.lastSelectNodeByKeyboardUUID])
        .filter((entity) => entity instanceof ConnectableEntity);
      if (lastSelectNodeArr.length !== 0) {
        selectedNode = lastSelectNodeArr[0];
      } else {
        selectedNode = selectedEntities[0];
      }
    }
    return selectedNode;
  }

  private addEffect(selectedNodeRect: Rectangle, newSelectNodeRect: Rectangle) {
    const effect = RectangleTransformEffect.fromRectangles(this.project, selectedNodeRect, newSelectNodeRect);
    this.project.effects.addEffect(effect);
  }

  private getMostNearConnectableEntity(nodes: ConnectableEntity[], location: Vector): ConnectableEntity | null {
    if (nodes.length === 0) return null;
    let currentMinDistance = Infinity;
    let currentNearestNode: ConnectableEntity | null = null;
    for (const node of nodes) {
      const rect = node.collisionBox.getRectangle();
      const intersectLocation = rect.getLineIntersectionPoint(new Line(location, rect.center));
      const distance = intersectLocation.distance(location);
      if (distance < currentMinDistance) {
        currentMinDistance = distance;
        currentNearestNode = node;
      }
    }
    return currentNearestNode;
  }

  private selectMostNearLocationNode(location: Vector): ConnectableEntity | null {
    let currentMinDistance = Infinity;
    let currentNearestNode: ConnectableEntity | null = null;
    for (const node of this.project.stageManager.getConnectableEntity()) {
      const rect = node.collisionBox.getRectangle();
      const intersectLocation = rect.getLineIntersectionPoint(new Line(location, rect.center));
      const distance = intersectLocation.distance(location);
      if (distance < currentMinDistance) {
        currentMinDistance = distance;
        currentNearestNode = node;
      }
    }
    return currentNearestNode;
  }

  /**
   * 收集指定方向上「等宽/等高条形区域」内的所有节点。
   * 上/下：条形宽度 = 当前节点宽度（左右边界对齐），向指定方向无限延伸。
   * 左/右：条形高度 = 当前节点高度（上下边界对齐），向指定方向无限延伸。
   */
  private collectNodesInStrip(
    node: ConnectableEntity,
    direction: Direction,
    candidates: ConnectableEntity[],
  ): ConnectableEntity[] {
    const result: ConnectableEntity[] = [];
    const limitToViewport = Settings.arrowKeySelectOnlyInViewport;
    const viewportRect = limitToViewport ? this.project.renderer.getCoverWorldRectangle() : null;
    const nodeRect = node.collisionBox.getRectangle();

    for (const otherNode of candidates) {
      if (otherNode.uuid === node.uuid) continue;
      const otherRect = otherNode.collisionBox.getRectangle();

      if (limitToViewport && viewportRect && !viewportRect.isCollideWith(otherRect)) {
        continue;
      }

      const xOverlap = otherRect.right > nodeRect.left && otherRect.left < nodeRect.right;
      const yOverlap = otherRect.bottom > nodeRect.top && otherRect.top < nodeRect.bottom;

      const inStrip =
        direction === Direction.Up
          ? xOverlap && otherRect.top < nodeRect.top
          : direction === Direction.Down
            ? xOverlap && otherRect.bottom > nodeRect.bottom
            : direction === Direction.Left
              ? yOverlap && otherRect.left < nodeRect.left
              : yOverlap && otherRect.right > nodeRect.right;

      if (inStrip) {
        result.push(otherNode);
      }
    }
    return result;
  }

  /**
   * 从条形候选集中找方向上最近的节点。
   * 距离 Dh = 两节点在导航方向上最近两条边之间的间距（非负）。
   * Dh 相等时按垂直轴偏差（中心偏离）排序。
   */
  private getMostNearInStripByDh(
    nodes: ConnectableEntity[],
    nodeRect: Rectangle,
    direction: Direction,
  ): ConnectableEntity | null {
    let bestNode: ConnectableEntity | null = null;
    let bestDh = Infinity;
    let bestAxisOffset = Infinity;

    for (const node of nodes) {
      const otherRect = node.collisionBox.getRectangle();

      const dh =
        direction === Direction.Up
          ? nodeRect.top - otherRect.bottom
          : direction === Direction.Down
            ? otherRect.top - nodeRect.bottom
            : direction === Direction.Left
              ? nodeRect.left - otherRect.right
              : otherRect.left - nodeRect.right;

      if (dh < 0) continue;

      const axisOffset =
        direction === Direction.Up || direction === Direction.Down
          ? Math.abs(otherRect.center.x - nodeRect.center.x)
          : Math.abs(otherRect.center.y - nodeRect.center.y);

      if (dh < bestDh || (dh === bestDh && axisOffset < bestAxisOffset)) {
        bestDh = dh;
        bestAxisOffset = axisOffset;
        bestNode = node;
      }
    }
    return bestNode;
  }

  /**
   * 收集指定方向上 45° 扇形区域内的节点。
   */
  private collectFanNodes(
    node: ConnectableEntity,
    direction: Direction,
    candidates: ConnectableEntity[],
  ): ConnectableEntity[] {
    const axisVectors: Record<Direction, Vector> = {
      [Direction.Up]: new Vector(0, -1),
      [Direction.Down]: new Vector(0, 1),
      [Direction.Left]: new Vector(-1, 0),
      [Direction.Right]: new Vector(1, 0),
    };
    const axis = axisVectors[direction];
    const nodeRect = node.collisionBox.getRectangle();
    const limitToViewport = Settings.arrowKeySelectOnlyInViewport;
    const viewportRect = limitToViewport ? this.project.renderer.getCoverWorldRectangle() : null;
    const result: ConnectableEntity[] = [];

    for (const otherNode of candidates) {
      if (otherNode.uuid === node.uuid) continue;
      const otherRect = otherNode.collisionBox.getRectangle();

      if (limitToViewport && viewportRect && !viewportRect.isCollideWith(otherRect)) {
        continue;
      }

      const delta = otherRect.center.subtract(nodeRect.center);
      if (delta.dot(axis) > 0 && delta.normalize().angleTo(axis) < 45) {
        result.push(otherNode);
      }
    }
    return result;
  }

  // ── Legacy public API (used by external callers) ──────────────────────────

  collectTopNodes(node: ConnectableEntity, candidates?: ConnectableEntity[]): ConnectableEntity[] {
    return this.collectFanNodes(node, Direction.Up, candidates ?? this.project.stageManager.getConnectableEntity());
  }

  collectBottomNodes(node: ConnectableEntity, candidates?: ConnectableEntity[]): ConnectableEntity[] {
    return this.collectFanNodes(node, Direction.Down, candidates ?? this.project.stageManager.getConnectableEntity());
  }

  collectLeftNodes(node: ConnectableEntity, candidates?: ConnectableEntity[]): ConnectableEntity[] {
    return this.collectFanNodes(node, Direction.Left, candidates ?? this.project.stageManager.getConnectableEntity());
  }

  collectRightNodes(node: ConnectableEntity, candidates?: ConnectableEntity[]): ConnectableEntity[] {
    return this.collectFanNodes(node, Direction.Right, candidates ?? this.project.stageManager.getConnectableEntity());
  }
}
