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
   * 从上到下排列多个子树，除了第一个子树，其他子树都相对于第一个子树的外接矩形进行位置调整
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
   * 根据根节点位置，调整子树的位置
   * @param rootNode 固定位置的根节点
   * @param childList 需要调整位置的子节点列表
   * @param gap 根节点与子节点之间的间距
   * @param position 子节点相对于根节点的位置：rightCenter(右侧中心)、leftCenter(左侧中心)、bottomCenter(下方中心)、topCenter(上方中心)
   */
  private adjustChildrenTreesByRootNodeLocation(
    rootNode: ConnectableEntity,
    childList: ConnectableEntity[],
    gap = 100,
    position: "rightCenter" | "leftCenter" | "bottomCenter" | "topCenter" = "rightCenter",
  ) {
    if (childList.length === 0) {
      return;
    }

    const parentRectangle = rootNode.collisionBox.getRectangle();

    // 计算子树的外接矩形
    const childsRectangle = Rectangle.getBoundingRectangle(childList.map((child) => child.collisionBox.getRectangle()));

    // 计算子树应该移动到的目标位置（使用边缘距离而不是中心位置）
    let targetLocation: Vector;

    // 根据位置参数计算目标位置
    switch (position) {
      case "rightCenter":
        // 右侧：子树位于根节点的右侧，使用右边缘计算
        targetLocation = new Vector(parentRectangle.right + gap + childsRectangle.width / 2, parentRectangle.center.y);
        break;

      case "leftCenter":
        // 左侧：子树位于根节点的左侧，使用左边缘计算
        targetLocation = new Vector(parentRectangle.left - gap - childsRectangle.width / 2, parentRectangle.center.y);
        break;

      case "bottomCenter":
        // 下方：子树位于根节点的下方，使用底边缘计算
        targetLocation = new Vector(
          parentRectangle.center.x,
          parentRectangle.bottom + gap + childsRectangle.height / 2,
        );
        break;

      case "topCenter":
        // 上方：子树位于根节点的上方，使用顶边缘计算
        targetLocation = new Vector(parentRectangle.center.x, parentRectangle.top - gap - childsRectangle.height / 2);
        break;
    }

    // 计算需要移动的偏移量
    const offset = targetLocation.subtract(childsRectangle.center);

    // 移动所有子节点及其子树
    for (const child of childList) {
      this.project.entityMoveManager.moveWithChildren(child, offset);
    }
  }

  /**
   * 检测并解决不同方向子树群之间的重叠问题
   * @param rootNode 根节点
   * @param directionGroups 不同方向的子树群
   */
  private resolveSubtreeOverlaps(
    rootNode: ConnectableEntity,
    directionGroups: {
      right?: ConnectableEntity[];
      left?: ConnectableEntity[];
      bottom?: ConnectableEntity[];
      top?: ConnectableEntity[];
    },
  ) {
    // 创建方向对进行检查
    const directionPairs = [
      { dir1: "right" as const, dir2: "bottom" as const },
      { dir1: "right" as const, dir2: "top" as const },
      { dir1: "right" as const, dir2: "left" as const },
      { dir1: "bottom" as const, dir2: "top" as const },
      { dir1: "bottom" as const, dir2: "left" as const },
      { dir1: "top" as const, dir2: "left" as const },
    ];

    // 检查每对方向是否有重叠
    for (const { dir1, dir2 } of directionPairs) {
      const group1 = directionGroups[dir1];
      const group2 = directionGroups[dir2];

      if (!group1 || !group2 || group1.length === 0 || group2.length === 0) {
        continue;
      }

      // 获取子树群的外接矩形
      const rect1 = Rectangle.getBoundingRectangle(group1.map((child) => this.getTreeBoundingRectangle(child)));
      const rect2 = Rectangle.getBoundingRectangle(group2.map((child) => this.getTreeBoundingRectangle(child)));

      // 检查是否重叠
      while (rect1.isCollideWithRectangle(rect2)) {
        // 确定强势方向
        const group1Size = group1.length;
        const group2Size = group2.length;
        let weakerDir: "right" | "left" | "bottom" | "top";

        if (group1Size > group2Size) {
          weakerDir = dir2;
        } else if (group2Size > group1Size) {
          weakerDir = dir1;
        } else {
          // 数量相等时，按优先级排序：右侧>下侧>左侧>上侧
          const priorityOrder = ["right", "bottom", "left", "top"] as const;
          const index1 = priorityOrder.indexOf(dir1);
          const index2 = priorityOrder.indexOf(dir2);
          weakerDir = index1 < index2 ? dir2 : dir1;
        }

        // 移动弱势方向的子树群
        const weakerGroup = weakerDir === dir1 ? group1 : group2;
        const moveAmount = 10; // 每次移动10个距离

        // 根据方向确定移动向量
        let moveVector: Vector;
        switch (weakerDir) {
          case "right":
            moveVector = new Vector(moveAmount, 0);
            break;
          case "left":
            moveVector = new Vector(-moveAmount, 0);
            break;
          case "bottom":
            moveVector = new Vector(0, moveAmount);
            break;
          case "top":
            moveVector = new Vector(0, -moveAmount);
            break;
        }

        // 移动弱势方向的所有子树
        for (const child of weakerGroup) {
          this.project.entityMoveManager.moveWithChildren(child, moveVector);
        }

        // 更新外接矩形以继续检查
        if (weakerDir === dir1) {
          const newRect1 = Rectangle.getBoundingRectangle(group1.map((child) => this.getTreeBoundingRectangle(child)));
          rect1.location = newRect1.location.clone();
          rect1.size = newRect1.size.clone();
        } else {
          const newRect2 = Rectangle.getBoundingRectangle(group2.map((child) => this.getTreeBoundingRectangle(child)));
          rect2.location = newRect2.location.clone();
          rect2.size = newRect2.size.clone();
        }
      }
    }
  }
  /**
   * 快速树形布局
   * @param rootNode
   */
  public autoLayoutFastTreeMode(rootNode: ConnectableEntity) {
    // 树形结构的根节点 矩形左上角位置固定不动
    const rootLeftTopLocation = rootNode.collisionBox.getRectangle().leftTop.clone();

    const dfs = (node: ConnectableEntity) => {
      const outEdges = this.project.graphMethods.getOutgoingEdges(node);
      const outRightEdges = outEdges.filter((edge) => edge.isLeftToRight());
      const outLeftEdges = outEdges.filter((edge) => edge.isRightToLeft());
      const outTopEdges = outEdges.filter((edge) => edge.isBottomToTop());
      const outBottomEdges = outEdges.filter((edge) => edge.isTopToBottom());
      const outUnknownEdges = outEdges.filter((edge) => edge.isUnknownDirection());

      // 获取排序后的子节点列表
      let rightChildList = outRightEdges.map((edge) => edge.target);
      let leftChildList = outLeftEdges.map((edge) => edge.target);
      let topChildList = outTopEdges.map((edge) => edge.target);
      let bottomChildList = outBottomEdges.map((edge) => edge.target);
      const unknownChildList = outUnknownEdges.map((edge) => edge.target);

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
      for (const child of unknownChildList) {
        dfs(child); // 递归口
      }
      // 排列这些子节点，然后调整子树位置到根节点旁边
      this.alignTrees(rightChildList, "col", 20);
      this.adjustChildrenTreesByRootNodeLocation(node, rightChildList, 150, "rightCenter");

      this.alignTrees(topChildList, "row", 20);
      this.adjustChildrenTreesByRootNodeLocation(node, topChildList, 150, "topCenter");

      this.alignTrees(bottomChildList, "row", 20);
      this.adjustChildrenTreesByRootNodeLocation(node, bottomChildList, 150, "bottomCenter");

      this.alignTrees(leftChildList, "col", 20);
      this.adjustChildrenTreesByRootNodeLocation(node, leftChildList, 150, "leftCenter");

      // 检测并解决不同方向子树群之间的重叠问题
      this.resolveSubtreeOverlaps(node, {
        right: rightChildList.length > 0 ? rightChildList : undefined,
        left: leftChildList.length > 0 ? leftChildList : undefined,
        bottom: bottomChildList.length > 0 ? bottomChildList : undefined,
        top: topChildList.length > 0 ? topChildList : undefined,
      });
    };

    dfs(rootNode);

    // ------- 恢复根节点的位置
    // 矩形左上角是矩形的标志位
    const delta = rootLeftTopLocation.subtract(rootNode.collisionBox.getRectangle().leftTop);
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
