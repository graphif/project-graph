import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 瞬间树形布局算法
 * 瞬间：一次性直接移动所有节点到合适的位置
 * 树形：此布局算法仅限于树形结构，在代码上游保证
 */
@service("autoLayoutFastTree")
export class AutoLayoutFastTree {
  constructor(private readonly project: Project) {}

  /**
   * 向下树形布局
   * @param rootNode 树形节点的根节点
   */
  autoLayoutFastTreeModeDown(rootNode: ConnectableEntity) {
    const dfs = (node: ConnectableEntity) => {
      const spaceX = 20;
      const spaceY = 150;
      // 子节点所占空间的宽度
      let width = Math.max(0, this.project.graphMethods.nodeChildrenArray(node).length - 1) * spaceX;
      const widths: number[] = [];
      const paddings: number[] = [];
      let sumWidths = -width; // widths元素之和
      for (const child of this.project.graphMethods.nodeChildrenArray(node)) {
        const childrenWidth = dfs(child);
        const wd = child.collisionBox.getRectangle().size.x;
        widths.push(Math.max(wd, childrenWidth));
        paddings.push(widths[widths.length - 1] / 2 - wd / 2);
        width += widths[widths.length - 1];
      }
      sumWidths += width;
      let currentX =
        node.geometryCenter.x - (sumWidths - paddings[0] - paddings[paddings.length - 1]) / 2 - paddings[0];
      for (let i = 0; i < widths.length; i++) {
        const child = this.project.graphMethods.nodeChildrenArray(node)[i];
        child.moveTo(new Vector(currentX + paddings[i], node.collisionBox.getRectangle().top + spaceY));
        currentX += widths[i] + spaceX;
      }
      return width;
    };
    dfs(rootNode);
  }

  /**
   * 获取当前树的外接矩形，注意不要有环，有环就废了
   * @param node
   * @returns
   */
  private getTreeBoundingRectangle(node: ConnectableEntity): Rectangle {
    const childList = this.project.graphMethods.nodeChildrenArray(node);
    const childRectangle = childList.map((child) => this.getTreeBoundingRectangle(child));
    return Rectangle.getBoundingRectangle(childRectangle.concat([node.collisionBox.getRectangle()]));
  }
  /**
   * 将一个子树 看成一个外接矩形，移动这个外接矩形到某一个位置
   * @param treeRoot
   * @param targetLocation
   */
  private moveTreeRectTo(treeRoot: ConnectableEntity, targetLocation: Vector) {
    const treeRect = this.getTreeBoundingRectangle(treeRoot);
    this.project.entityMoveManager.moveWithChildren(treeRoot, targetLocation.subtract(treeRect.leftTop));
  }

  /**
   * 获取根节点的所有第一层子节点，并根据指定方向进行排序
   * @param node 根节点
   * @param childNodes 子节点列表
   * @param direction 排序方向：col表示从上到下，row表示从左到右
   * @returns 排序后的子节点数组
   */
  private getSortedChildNodes(
    _node: ConnectableEntity,
    childNodes: ConnectableEntity[],
    direction: "col" | "row" = "col",
  ): ConnectableEntity[] {
    // const childNodes = this.project.graphMethods.nodeChildrenArray(node);

    // 根据方向进行排序
    if (direction === "col") {
      // 从上到下排序：根据矩形的top属性
      return childNodes.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);
    } else {
      // 从左到右排序：根据矩形的left属性
      return childNodes.sort((a, b) => a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left);
    }
  }

  /**
   * 排列多个子树，支持从上到下或从左到右排列
   * @param trees 要排列的子树数组
   * @param direction 排列方向，col表示从上到下，row表示从左到右
   * @param gap 子树之间的间距
   * @returns
   */
  private alignTrees(trees: ConnectableEntity[], direction: "col" | "row" = "col", gap = 10) {
    if (trees.length === 0 || trees.length === 1) {
      return;
    }
    const firstTree = trees[0];
    const firstTreeRect = this.getTreeBoundingRectangle(firstTree);

    // 根据方向设置初始位置
    let currentPosition: Vector;
    if (direction === "col") {
      // 从上到下排列：初始位置在第一棵树的左下方
      currentPosition = firstTreeRect.leftBottom.add(new Vector(0, gap));
      // 保持从上到下的相对位置
      trees.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);
    } else {
      // 从左到右排列：初始位置在第一棵树的右下方
      currentPosition = firstTreeRect.rightTop.add(new Vector(gap, 0));
      // 保持从左到右的相对位置
      trees.sort((a, b) => a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left);
    }

    for (let i = 1; i < trees.length; i++) {
      const tree = trees[i];
      this.moveTreeRectTo(tree, currentPosition);

      // 根据方向更新下一个位置
      if (direction === "col") {
        currentPosition.y += this.getTreeBoundingRectangle(tree).height + gap;
      } else {
        currentPosition.x += this.getTreeBoundingRectangle(tree).width + gap;
      }
    }
  }

  /**
   * 根据子节点，调整根节点的位置
   * @param rootNode 要调整位置的根节点
   * @param gap 根节点与子节点之间的间距
   * @param position 根节点相对于子节点外接矩形的位置：leftCenter(左侧中心)、rightCenter(右侧中心)、topCenter(上方中心)、bottomCenter(下方中心)
   */
  private adjustRootNodeLocationByChildren(
    rootNode: ConnectableEntity,
    childList: ConnectableEntity[],
    gap = 100,
    position: "leftCenter" | "rightCenter" | "topCenter" | "bottomCenter" = "leftCenter",
  ) {
    // const childList = this.project.graphMethods.nodeChildrenArray(rootNode);
    if (childList.length === 0) {
      return;
    }

    const childsRectangle = Rectangle.getBoundingRectangle(childList.map((child) => child.collisionBox.getRectangle()));
    const parentRectangle = rootNode.collisionBox.getRectangle();
    let targetLocation: Vector;

    // 根据位置参数计算目标位置
    switch (position) {
      case "leftCenter":
        // 左侧中心：父节点位于子节点外接矩形的左侧中心位置
        targetLocation = childsRectangle.leftCenter.add(new Vector(-gap, 0));
        rootNode.moveTo(targetLocation);
        rootNode.move(new Vector(-parentRectangle.width, -parentRectangle.height / 2));
        break;

      case "rightCenter":
        // 右侧中心：父节点位于子节点外接矩形的右侧中心位置
        targetLocation = childsRectangle.rightCenter.add(new Vector(gap, 0));
        rootNode.moveTo(targetLocation);
        rootNode.move(new Vector(0, -parentRectangle.height / 2));
        break;

      case "topCenter":
        // 上方中心：父节点位于子节点外接矩形的上方中心位置
        targetLocation = childsRectangle.topCenter.add(new Vector(0, -gap));
        rootNode.moveTo(targetLocation);
        rootNode.move(new Vector(-parentRectangle.width / 2, -parentRectangle.height));
        break;

      case "bottomCenter":
        // 下方中心：父节点位于子节点外接矩形的下方中心位置
        targetLocation = childsRectangle.bottomCenter.add(new Vector(0, gap));
        rootNode.moveTo(targetLocation);
        rootNode.move(new Vector(-parentRectangle.width / 2, 0));
        break;
    }
  }
  /**
   * 向右树形节点的根节点
   * @param rootNode
   */
  public autoLayoutFastTreeModeRight(rootNode: ConnectableEntity) {
    // 树形结构的根节点 矩形左上角位置固定不动
    const initLocation = rootNode.collisionBox.getRectangle().leftTop.clone();

    const dfs = (node: ConnectableEntity) => {
      const outEdges = this.project.graphMethods.getOutgoingEdges(node);
      const outRightEdges = outEdges.filter((edge) => edge.isLeftToRight());
      const outLeftEdges = outEdges.filter((edge) => edge.isRightToLeft());
      const outTopEdges = outEdges.filter((edge) => edge.isBottomToTop());
      const outBottomEdges = outEdges.filter((edge) => edge.isTopToBottom());
      console.log(outEdges, outRightEdges, outLeftEdges, outTopEdges, outBottomEdges);

      // 获取排序后的子节点列表
      // const childList = outEdges.map((edge) => edge.target);
      let rightChildList = outRightEdges.map((edge) => edge.target);
      let leftChildList = outLeftEdges.map((edge) => edge.target);
      let topChildList = outTopEdges.map((edge) => edge.target);
      let bottomChildList = outBottomEdges.map((edge) => edge.target);

      rightChildList = this.getSortedChildNodes(node, rightChildList, "col");
      leftChildList = this.getSortedChildNodes(node, leftChildList, "col");
      topChildList = this.getSortedChildNodes(node, topChildList, "row");
      bottomChildList = this.getSortedChildNodes(node, bottomChildList, "row");

      for (const child of rightChildList) {
        dfs(child); // 递归口
      }
      for (const child of topChildList) {
        dfs(child); // 递归口
      }
      for (const child of bottomChildList) {
        dfs(child); // 递归口
      }
      for (const child of leftChildList) {
        dfs(child); // 递归口
      }
      // 排列这些子节点，然后更改当前根节点在所有子节点中的相对位置
      this.alignTrees(rightChildList, "col", 20);
      this.adjustRootNodeLocationByChildren(node, rightChildList, 150, "leftCenter");
      this.alignTrees(topChildList, "row", 20);
      this.adjustRootNodeLocationByChildren(node, topChildList, 150, "bottomCenter");
      this.alignTrees(bottomChildList, "row", 20);
      this.adjustRootNodeLocationByChildren(node, bottomChildList, 150, "topCenter");
      this.alignTrees(leftChildList, "col", 20);
      this.adjustRootNodeLocationByChildren(node, leftChildList, 150, "rightCenter");
    };

    dfs(rootNode);

    // ------- 恢复根节点的位置
    // 矩形左上角是矩形的标志位
    const delta = initLocation.subtract(rootNode.collisionBox.getRectangle().leftTop);
    // 选中根节点
    this.project.stageManager.clearSelectAll();
    rootNode.isSelected = true;
    this.project.entityMoveManager.moveConnectableEntitiesWithChildren(delta);
    // ------- 恢复完毕
  }

  // ======================= 反转树的位置系列 ====================

  treeReverseX(selectedRootEntity: ConnectableEntity) {
    this.treeReverse(selectedRootEntity, "X");
  }
  treeReverseY(selectedRootEntity: ConnectableEntity) {
    this.treeReverse(selectedRootEntity, "Y");
  }
  /**
   * 将树形结构翻转位置
   * @param selectedRootEntity
   */
  private treeReverse(selectedRootEntity: ConnectableEntity, direction: "X" | "Y") {
    // 检测树形结构
    const nodeChildrenArray = this.project.graphMethods.nodeChildrenArray(selectedRootEntity);
    if (nodeChildrenArray.length <= 1) {
      return;
    }
    // 遍历所有节点，将其位置根据选中的根节点进行镜像位置调整
    const dfs = (node: ConnectableEntity) => {
      const childList = this.project.graphMethods.nodeChildrenArray(node);
      for (const child of childList) {
        dfs(child); // 递归口
      }
      const currentNodeCenter = node.collisionBox.getRectangle().center;
      const rootNodeCenter = selectedRootEntity.collisionBox.getRectangle().center;
      if (direction === "X") {
        node.move(new Vector(-((currentNodeCenter.x - rootNodeCenter.x) * 2), 0));
      } else if (direction === "Y") {
        node.move(new Vector(0, -((currentNodeCenter.y - rootNodeCenter.y) * 2)));
      }
    };
    dfs(selectedRootEntity);
  }
}
