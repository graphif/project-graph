import { Project, service } from "@/core/Project";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { ProgressNumber, Vector } from "@graphif/data-structures";
import { Line, Rectangle } from "@graphif/shapes";
import { Settings } from "../../Settings";

/**
 * 仅在keyboardOnlyEngine中使用，用于处理select change事件
 */
@service("selectChangeEngine")
export class SelectChangeEngine {
  private lastSelectNodeByKeyboardUUID = "";

  constructor(private readonly project: Project) {}

  /**
   * 向上选择节点
   * @param addSelect
   * @returns
   */
  selectUp(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }
    const newSelectedConnectableEntity = this.getMostNearConnectableEntity(
      this.collectTopNodes(selectedNode),
      selectedNode.collisionBox.getRectangle().center,
    );
    this.afterSelect(selectedNode, newSelectedConnectableEntity, !addSelect);
  }

  /**
   * 向下选择节点
   * @param addSelect
   * @returns
   */
  selectDown(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }
    const newSelectedConnectableEntity = this.getMostNearConnectableEntity(
      this.collectBottomNodes(selectedNode),
      selectedNode.collisionBox.getRectangle().center,
    );
    this.afterSelect(selectedNode, newSelectedConnectableEntity, !addSelect);
  }

  /**
   * 向左选择
   * @param addSelect
   * @returns
   */
  selectLeft(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }
    const newSelectedConnectableEntity = this.getMostNearConnectableEntity(
      this.collectLeftNodes(selectedNode),
      selectedNode.collisionBox.getRectangle().center,
    );
    this.afterSelect(selectedNode, newSelectedConnectableEntity, !addSelect);
  }

  /**
   * 向右选择
   * @param addSelect
   * @returns
   */
  selectRight(addSelect = false) {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const selectedNode = this.getCurrentSelectedNode();
    if (selectedNode === null) {
      return;
    }
    const newSelectedConnectableEntity = this.getMostNearConnectableEntity(
      this.collectRightNodes(selectedNode),
      selectedNode.collisionBox.getRectangle().center,
    );
    this.afterSelect(selectedNode, newSelectedConnectableEntity, !addSelect);
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
    // 当前选择的节点
    const selectedEntitiesUUIDSet = new Set<string>();
    selectedEntities.map((entity) => selectedEntitiesUUIDSet.add(entity.uuid));
    if (selectedEntities.length === 0) {
      return;
    }
    // 第一步后继节点集合 或 前驱节点集合
    const expandUUIDSet: Set<string> = new Set();

    if (reversed) {
      // 反向扩散
      for (const selectedEntity of selectedEntities) {
        this.project.graphMethods.nodeParentArray(selectedEntity).map((entity) => expandUUIDSet.add(entity.uuid));
      }
    } else {
      // 收集所有第一步后继节点
      for (const selectedEntity of selectedEntities) {
        this.project.graphMethods
          .getOneStepSuccessorSet(selectedEntity)
          .map((entity) => expandUUIDSet.add(entity.uuid));
      }
    }
    if (isKeepExpand) {
      // 保留原有的选择 的扩散
      const combinedUUIDSet = new Set([...selectedEntitiesUUIDSet, ...expandUUIDSet]);
      for (const newUUID of combinedUUIDSet) {
        const newEntity = this.project.stageManager.getConnectableEntityByUUID(newUUID);
        if (newEntity) {
          newEntity.isSelected = true;
        }
      }
    } else {
      // 全新的扩散
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

  /**
   * 按下选择方向键后的善后工作
   * @param selectedNodeRect
   * @param newSelectedConnectableEntity
   * @param clearOldSelect
   * @returns
   */
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
    // 添加特效提示
    this.project.keyboardOnlyTreeEngine.addNodeEffectByPreDirection(newSelectedConnectableEntity);
  }

  private getCurrentSelectedNode(): ConnectableEntity | null {
    const selectedEntities = this.project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    let selectedNode: ConnectableEntity | null = null;
    if (selectedEntities.length === 0) {
      // 如果没有，则选中距离屏幕中心最近的节点
      const nearestNode = this.selectMostNearLocationNode(this.project.camera.location);
      if (nearestNode) {
        nearestNode.isSelected = true;
      }
      // throw new Error("未选中任何节点");
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
    const color = this.project.stageStyleManager.currentStyle.effects.successShadow;
    // 节点切换移动的特效有待专门写一个
    this.project.effects.addEffects([
      new LineCuttingEffect(
        new ProgressNumber(0, 20),
        selectedNodeRect.leftTop,
        newSelectNodeRect.leftTop,
        color,
        color,
      ),
    ]);
    this.project.effects.addEffects([
      new LineCuttingEffect(
        new ProgressNumber(0, 20),
        selectedNodeRect.rightTop,
        newSelectNodeRect.rightTop,
        color,
        color,
      ),
    ]);
    this.project.effects.addEffects([
      new LineCuttingEffect(
        new ProgressNumber(0, 20),
        selectedNodeRect.rightBottom,
        newSelectNodeRect.rightBottom,
        color,
        color,
      ),
    ]);
    this.project.effects.addEffects([
      new LineCuttingEffect(
        new ProgressNumber(0, 20),
        selectedNodeRect.leftBottom,
        newSelectNodeRect.leftBottom,
        color,
        color,
      ),
    ]);
  }

  private getMostNearConnectableEntity(nodes: ConnectableEntity[], location: Vector): ConnectableEntity | null {
    if (nodes.length === 0) return null;
    let currentMinDistance = Infinity;
    let currentNearestNode: ConnectableEntity | null = null;
    for (const node of nodes) {
      const entityCenter = node.collisionBox.getRectangle().center;
      const intersectLocation = node.collisionBox
        .getRectangle()
        .getLineIntersectionPoint(new Line(location, entityCenter));
      const distance = intersectLocation.distance(location);
      if (distance < currentMinDistance) {
        currentMinDistance = distance;
        currentNearestNode = node;
      }
    }
    return currentNearestNode;
  }

  /**
   * 获取距离某个点最近的节点
   * 距离的计算是实体的外接矩形的中心与点的连线的交点
   * 然后这个交点到目标的距离
   * @param location
   */
  private selectMostNearLocationNode(location: Vector): ConnectableEntity | null {
    let currentMinDistance = Infinity;
    let currentNearestNode: ConnectableEntity | null = null;
    for (const node of this.project.stageManager.getConnectableEntity()) {
      const entityCenter = node.collisionBox.getRectangle().center;
      const intersectLocation = node.collisionBox
        .getRectangle()
        .getLineIntersectionPoint(new Line(location, entityCenter));
      const distance = intersectLocation.distance(location);
      if (distance < currentMinDistance) {
        currentMinDistance = distance;
        currentNearestNode = node;
      }
    }
    return currentNearestNode;
  }

  /**
   * 选中一个节点上方45度范围内的所有节点
   * 无视连线关系，只看位置
   * @param node 当前所在的节点
   */
  collectTopNodes(node: ConnectableEntity): ConnectableEntity[] {
    const topNodes: ConnectableEntity[] = [];
    const limitToViewport = Settings.arrowKeySelectOnlyInViewport;
    const viewportRect = limitToViewport ? this.project.renderer.getCoverWorldRectangle() : null;

    for (const otherNode of this.project.stageManager.getConnectableEntity()) {
      if (otherNode.uuid === node.uuid) continue;
      const otherNodeRect = otherNode.collisionBox.getRectangle();
      const nodeRect = node.collisionBox.getRectangle();

      // 如果开启了视野限制，检查节点是否在视野内
      if (limitToViewport && viewportRect && !viewportRect.isCollideWith(otherNodeRect)) {
        continue;
      }

      if (otherNodeRect.center.y < nodeRect.center.y) {
        // 先保证是在上方，然后计算相对的角度
        const direction = otherNodeRect.center.subtract(nodeRect.center).normalize();
        const angle = direction.angleTo(new Vector(0, -1));
        if (angle < 45) {
          topNodes.push(otherNode);
        }
      }
    }
    return topNodes;
  }

  collectBottomNodes(node: ConnectableEntity): ConnectableEntity[] {
    const bottomNodes: ConnectableEntity[] = [];
    const limitToViewport = Settings.arrowKeySelectOnlyInViewport;
    const viewportRect = limitToViewport ? this.project.renderer.getCoverWorldRectangle() : null;

    for (const otherNode of this.project.stageManager.getConnectableEntity()) {
      if (otherNode.uuid === node.uuid) continue;
      const otherNodeRect = otherNode.collisionBox.getRectangle();
      const nodeRect = node.collisionBox.getRectangle();

      // 如果开启了视野限制，检查节点是否在视野内
      if (limitToViewport && viewportRect && !viewportRect.isCollideWith(otherNodeRect)) {
        continue;
      }

      if (otherNodeRect.center.y > nodeRect.center.y) {
        // 先保证是在下方，然后计算相对的角度
        const direction = otherNodeRect.center.subtract(nodeRect.center).normalize();
        const angle = direction.angleTo(new Vector(0, 1));
        if (angle < 45) {
          bottomNodes.push(otherNode);
        }
      }
    }
    return bottomNodes;
  }

  collectLeftNodes(node: ConnectableEntity): ConnectableEntity[] {
    const leftNodes: ConnectableEntity[] = [];
    const limitToViewport = Settings.arrowKeySelectOnlyInViewport;
    const viewportRect = limitToViewport ? this.project.renderer.getCoverWorldRectangle() : null;

    for (const otherNode of this.project.stageManager.getConnectableEntity()) {
      if (otherNode.uuid === node.uuid) continue;
      const otherNodeRect = otherNode.collisionBox.getRectangle();
      const nodeRect = node.collisionBox.getRectangle();

      // 如果开启了视野限制，检查节点是否在视野内
      if (limitToViewport && viewportRect && !viewportRect.isCollideWith(otherNodeRect)) {
        continue;
      }

      if (otherNodeRect.center.x < nodeRect.center.x) {
        // 先保证是在左边，然后计算相对的角度
        const direction = otherNodeRect.center.subtract(nodeRect.center).normalize();
        const angle = direction.angleTo(new Vector(-1, 0));
        if (angle < 45) {
          leftNodes.push(otherNode);
        }
      }
    }
    return leftNodes;
  }

  collectRightNodes(node: ConnectableEntity): ConnectableEntity[] {
    const rightNodes: ConnectableEntity[] = [];
    const limitToViewport = Settings.arrowKeySelectOnlyInViewport;
    const viewportRect = limitToViewport ? this.project.renderer.getCoverWorldRectangle() : null;

    for (const otherNode of this.project.stageManager.getConnectableEntity()) {
      if (otherNode.uuid === node.uuid) continue;
      const otherNodeRect = otherNode.collisionBox.getRectangle();
      const nodeRect = node.collisionBox.getRectangle();

      // 如果开启了视野限制，检查节点是否在视野内
      if (limitToViewport && viewportRect && !viewportRect.isCollideWith(otherNodeRect)) {
        continue;
      }

      if (otherNodeRect.center.x > nodeRect.center.x) {
        // 先保证是在右边，然后计算相对的角度
        const direction = otherNodeRect.center.subtract(nodeRect.center).normalize();
        const angle = direction.angleTo(new Vector(1, 0));
        if (angle < 45) {
          rightNodes.push(otherNode);
        }
      }
    }
    return rightNodes;
  }
}
