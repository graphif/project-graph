import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Direction } from "@/types/directions";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { v4 } from "uuid";
import { Settings } from "../../Settings";

/**
 * 专用于Xmind式的树形结构的键盘操作引擎
 */
@service("keyboardOnlyTreeEngine")
export class KeyboardOnlyTreeEngine {
  constructor(private readonly project: Project) {}

  // 通过一个节点的所有入度线的端点，来判断在这个节点上按tab时，应该往哪里创建节点
  private getNodeDirectionByIncomingEdges(node: ConnectableEntity): "right" | "left" | "down" | "up" {
    const incomingEdges = this.project.graphMethods.getIncomingEdges(node);
    if (incomingEdges.length === 0) {
      return "right";
    }
    const directionCount: Record<string, number> = { right: 0, left: 0, down: 0, up: 0 };
    incomingEdges.forEach((edge) => {
      if (edge.isRightToLeft()) {
        directionCount.left++;
      } else if (edge.isLeftToRight()) {
        directionCount.right++;
      } else if (edge.isBottomToTop()) {
        directionCount.up++;
      } else if (edge.isTopToBottom()) {
        directionCount.down++;
      }
    });
    let maxCount = 0;
    let direction: "right" | "left" | "down" | "up" = "right";
    Object.entries(directionCount).forEach(([dir, count]) => {
      if (count > maxCount) {
        maxCount = count;
        direction = dir as "right" | "left" | "down" | "up";
      }
    });
    return direction;
  }

  /**
   * 树形深度生长节点
   * @returns
   */
  onDeepGenerateNode() {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const rootNode = this.project.stageManager.getConnectableEntity().find((node) => node.isSelected);
    if (!rootNode) return;
    this.project.camera.clearMoveCommander();
    this.project.camera.speed = Vector.getZero();
    // 确定创建方向：默认向右
    const direction = this.getNodeDirectionByIncomingEdges(rootNode);
    // 先找到自己所有的第一层后继节点
    const childSet = this.project.graphMethods.getOneStepSuccessorSet(rootNode);

    // 寻找创建位置
    let createLocation: Vector;
    if (childSet.length === 0) {
      // 没有子节点时，在相应方向的正方向创建
      const rect = rootNode.collisionBox.getRectangle();
      switch (direction) {
        case "right":
          createLocation = rect.rightCenter.add(new Vector(100, 0));
          break;
        case "left":
          createLocation = rect.leftCenter.add(new Vector(-100, 0));
          break;
        case "down":
          createLocation = rect.bottomCenter.add(new Vector(0, 100));
          break;
        case "up":
          createLocation = rect.topCenter.add(new Vector(0, -100));
          break;
      }
    } else {
      // 有子节点时，在相应方向的最后一个子节点的外侧创建
      // 根据方向对已有的子节点进行排序
      switch (direction) {
        case "right":
        case "left":
          // 垂直方向排序
          childSet.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);
          break;
        case "up":
        case "down":
          // 水平方向排序
          childSet.sort((a, b) => a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left);
          break;
      }

      const lastChild = childSet[childSet.length - 1];
      const lastChildRect = lastChild.collisionBox.getRectangle();

      switch (direction) {
        case "right":
          createLocation = lastChildRect.bottomCenter.add(new Vector(0, 10));
          break;
        case "left":
          createLocation = lastChildRect.bottomCenter.add(new Vector(0, 10));
          break;
        case "down":
          createLocation = lastChildRect.rightCenter.add(new Vector(10, 0));
          break;
        case "up":
          createLocation = lastChildRect.rightCenter.add(new Vector(10, 0));
          break;
      }
    }

    // 创建位置寻找完毕
    const newNode = new TextNode(this.project, {
      text: "新节点",
      collisionBox: new CollisionBox([
        new Rectangle(
          createLocation,
          new Vector(rootNode instanceof TextNode ? rootNode.collisionBox.getRectangle().width : 100, 100),
        ),
      ]),
      sizeAdjust: (rootNode instanceof TextNode ? rootNode.sizeAdjust : "auto") as "auto" | "manual",
    });
    this.project.stageManager.add(newNode);

    // 如果是在框里，则把新生长的节点也纳入到框里
    const fatherSections = this.project.sectionMethods.getFatherSections(rootNode);
    for (const section of fatherSections) {
      section.children.push(newNode);
    }

    // 连接节点
    this.project.stageManager.connectEntity(rootNode, newNode);
    const newEdges = this.project.graphMethods.getEdgesBetween(rootNode, newNode);

    // 根据方向设置边的连接位置
    switch (direction) {
      case "right":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Right, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Left);
        break;
      case "left":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Left, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Right);
        break;
      case "down":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Down, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Up);
        break;
      case "up":
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Up, true);
        this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Down);
        break;
    }

    // 继承父节点颜色
    if (rootNode instanceof TextNode) {
      newNode.color = rootNode.color.clone();
    }

    // 重新排列树形节点
    const rootNodeParents = this.project.graphMethods.getRoots(rootNode);
    if (rootNodeParents.length === 1) {
      const rootNodeParent = rootNodeParents[0];
      if (this.project.graphMethods.isTree(rootNodeParent)) {
        if (Settings.autoLayoutWhenTreeGenerate) {
          this.project.autoAlign.autoLayoutSelectedFastTreeModeRight(rootNodeParent);
        }
        // 更新选择状态
        rootNodeParent.isSelected = false;
        newNode.isSelected = true;
        rootNode.isSelected = false;
      }
    }

    // 特效
    this.project.effects.addEffects(this.project.edgeRenderer.getConnectedEffects(rootNode, newNode));
    setTimeout(
      () => {
        // 防止把反引号给输入进去
        this.project.controllerUtils.editTextNode(newNode);
      },
      (1000 / 60) * 6,
    );
    // 重置视野
    this.project.camera.bombMove(newNode.collisionBox.getRectangle().center, 5);
  }

  /**
   * 树形广度生长节点
   * @returns
   */
  onBroadGenerateNode() {
    if (!this.project.keyboardOnlyEngine.isOpenning()) {
      return;
    }
    const currentSelectNode = this.project.stageManager.getConnectableEntity().find((node) => node.isSelected);
    if (!currentSelectNode) return;
    this.project.camera.clearMoveCommander();
    this.project.camera.speed = Vector.getZero();
    // 找到自己的父节点
    const parents = this.project.graphMethods.nodeParentArray(currentSelectNode);
    if (parents.length === 0) return;
    if (parents.length !== 1) return;
    const parent = parents[0];
    // 当前选择的节点的正下方创建一个节点
    // 找到创建点
    const newLocation = currentSelectNode.collisionBox.getRectangle().leftBottom.add(new Vector(0, 1));
    const newNode = new TextNode(this.project, {
      text: "新节点",
      details: [],
      uuid: v4(),
      collisionBox: new CollisionBox([
        new Rectangle(
          newLocation.clone(),
          new Vector(parent instanceof TextNode ? parent.collisionBox.getRectangle().width : 100, 100),
        ),
      ]),
      sizeAdjust: parent instanceof TextNode ? parent.sizeAdjust : "auto",
    });
    this.project.stageManager.add(newNode);
    // 如果是在框里，则把新生长的节点也纳入到框里
    const fatherSections = this.project.sectionMethods.getFatherSections(parent);
    for (const section of fatherSections) {
      section.children.push(newNode);
    }
    // 连接节点
    this.project.stageManager.connectEntity(parent, newNode);

    const newEdges = this.project.graphMethods.getEdgesBetween(parent, newNode);
    this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Right, true);
    this.project.stageManager.changeEdgesConnectLocation(newEdges, Direction.Left);

    // 继承父节点颜色
    if (parent instanceof TextNode) {
      newNode.color = parent.color.clone();
    }
    // 重新排列树形节点
    const rootNodeParents = this.project.graphMethods.getRoots(parent);
    if (rootNodeParents.length === 1) {
      const rootNodeParent = rootNodeParents[0];
      if (this.project.graphMethods.isTree(rootNodeParent)) {
        if (Settings.autoLayoutWhenTreeGenerate) {
          this.project.autoAlign.autoLayoutSelectedFastTreeModeRight(rootNodeParent);
        }
        // 更新选择状态
        rootNodeParent.isSelected = false;
        newNode.isSelected = true;
        currentSelectNode.isSelected = false;
      }
    }
    this.project.effects.addEffects(this.project.edgeRenderer.getConnectedEffects(parent, newNode));
    setTimeout(
      () => {
        // 防止把反引号给输入进去
        this.project.controllerUtils.editTextNode(newNode);
      },
      (1000 / 60) * 6,
    );
    // 重置视野
    this.project.camera.bombMove(newNode.collisionBox.getRectangle().center, 5);
  }

  /**
   * 根据某个已经选中的节点，调整其所在树的结构
   * @param entity
   */
  adjustTreeNode(entity: ConnectableEntity) {
    const rootNodeParents = this.project.graphMethods.getRoots(entity);
    this.project.autoAlign.autoLayoutSelectedFastTreeModeRight(rootNodeParents[0]);
  }
}
