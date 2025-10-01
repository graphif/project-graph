import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { TextNode } from "@/core/sprites/TextNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Section } from "../../stageObject/entity/Section";

@service("layoutManager")
export class LayoutManager {
  constructor(private readonly project: Project) {}

  // 左侧对齐
  alignLeft() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    const minX = Math.min(...nodes.map((node) => node.collisionBox.getRectangle().left));
    for (const node of nodes) {
      this.project.entityMoveManager.moveEntityUtils(node, new Vector(minX - node.collisionBox.getRectangle().left, 0));
    }
    this.project.historyManager.recordStep();
  }

  // 右侧对齐
  alignRight() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    const maxX = Math.max(...nodes.map((node) => node.collisionBox.getRectangle().right));
    for (const node of nodes) {
      this.project.entityMoveManager.moveEntityUtils(
        node,
        new Vector(maxX - node.collisionBox.getRectangle().right, 0),
      );
    }
    this.project.historyManager.recordStep();
  }

  // 上侧对齐
  alignTop() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    const minY = Math.min(...nodes.map((node) => node.collisionBox.getRectangle().top));
    for (const node of nodes) {
      this.project.entityMoveManager.moveEntityUtils(node, new Vector(0, minY - node.collisionBox.getRectangle().top));
    }
    this.project.historyManager.recordStep();
  }

  // 下侧对齐
  alignBottom() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    const maxY = Math.max(...nodes.map((node) => node.collisionBox.getRectangle().bottom));
    for (const node of nodes) {
      this.project.entityMoveManager.moveEntityUtils(
        node,
        new Vector(0, maxY - node.collisionBox.getRectangle().bottom),
      );
    }
    this.project.historyManager.recordStep();
  }

  alignCenterHorizontal() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    if (nodes.length <= 1) return; // 如果只有一个或没有选中的节点，则不需要重新排列

    // 计算所有选中节点的总高度和最小 y 坐标
    const minY = Math.min(...nodes.map((node) => node.collisionBox.getRectangle().top));
    const maxY = Math.max(...nodes.map((node) => node.collisionBox.getRectangle().bottom));
    const totalHeight = maxY - minY;
    const centerY = minY + totalHeight / 2;

    for (const node of nodes) {
      const nodeCenterY = node.collisionBox.getRectangle().top + node.collisionBox.getRectangle().size.y / 2;
      const newY = centerY - (nodeCenterY - node.collisionBox.getRectangle().top);
      this.project.entityMoveManager.moveEntityToUtils(node, new Vector(node.collisionBox.getRectangle().left, newY));
    }
    this.project.historyManager.recordStep();
  }

  alignCenterVertical() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    if (nodes.length <= 1) return; // 如果只有一个或没有选中的节点，则不需要重新排列

    // 计算所有选中节点的总宽度和最小 x 坐标
    const minX = Math.min(...nodes.map((node) => node.collisionBox.getRectangle().left));
    const maxX = Math.max(...nodes.map((node) => node.collisionBox.getRectangle().right));
    const totalWidth = maxX - minX;
    const centerX = minX + totalWidth / 2;

    for (const node of nodes) {
      const nodeCenterX = node.collisionBox.getRectangle().left + node.collisionBox.getRectangle().size.x / 2;
      const newX = centerX - (nodeCenterX - node.collisionBox.getRectangle().left);
      this.project.entityMoveManager.moveEntityToUtils(node, new Vector(newX, node.collisionBox.getRectangle().top));
    }
    this.project.historyManager.recordStep();
  }

  // 相等间距水平分布对齐
  alignHorizontalSpaceBetween() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    if (nodes.length <= 1) return; // 如果只有一个或没有选中的节点，则不需要重新排列

    const minX = Math.min(...nodes.map((node) => node.collisionBox.getRectangle().left));
    const maxX = Math.max(...nodes.map((node) => node.collisionBox.getRectangle().right));
    const totalWidth = maxX - minX;
    const totalNodesWidth = nodes.reduce((sum, node) => sum + node.collisionBox.getRectangle().size.x, 0);
    const availableSpace = totalWidth - totalNodesWidth;
    const spaceBetween = nodes.length > 1 ? availableSpace / (nodes.length - 1) : 0;

    let startX = minX;
    for (const node of nodes.sort((a, b) => a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left)) {
      this.project.entityMoveManager.moveEntityToUtils(node, new Vector(startX, node.collisionBox.getRectangle().top));
      startX += node.collisionBox.getRectangle().size.x + spaceBetween;
    }
    this.project.historyManager.recordStep();
  }

  // 相等间距垂直分布对齐
  alignVerticalSpaceBetween() {
    const nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    if (nodes.length <= 1) return; // 如果只有一个或没有选中的节点，则不需要重新排列

    const minY = Math.min(...nodes.map((node) => node.collisionBox.getRectangle().top));
    const maxY = Math.max(...nodes.map((node) => node.collisionBox.getRectangle().bottom));
    const totalHeight = maxY - minY;
    const totalNodesHeight = nodes.reduce((sum, node) => sum + node.collisionBox.getRectangle().size.y, 0);
    const availableSpace = totalHeight - totalNodesHeight;
    const spaceBetween = nodes.length > 1 ? availableSpace / (nodes.length - 1) : 0;

    let startY = minY;
    for (const node of nodes.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top)) {
      this.project.entityMoveManager.moveEntityToUtils(node, new Vector(node.collisionBox.getRectangle().left, startY));
      startY += node.collisionBox.getRectangle().size.y + spaceBetween;
    }
    this.project.historyManager.recordStep();
  }

  /**
   * 从左到右紧密排列
   */
  alignLeftToRightNoSpace() {
    let nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    if (nodes.length <= 1) return; // 如果只有一个或没有选中的节点，则不需要重新排列
    nodes = nodes.sort((a, b) => a.collisionBox.getRectangle().left - b.collisionBox.getRectangle().left);

    let leftBoundX = nodes[0].collisionBox.getRectangle().right;
    for (let i = 1; i < nodes.length; i++) {
      const currentNode = nodes[i];
      this.project.entityMoveManager.moveEntityToUtils(
        currentNode,
        new Vector(leftBoundX, currentNode.collisionBox.getRectangle().top),
      );
      leftBoundX = currentNode.collisionBox.getRectangle().right;
    }
  }
  /**
   * 从上到下密排列
   */
  alignTopToBottomNoSpace() {
    let nodes = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    if (nodes.length <= 1) return; // 如果只有一个或没有选中的节点，则不需要重新排列
    nodes = nodes.sort((a, b) => a.collisionBox.getRectangle().top - b.collisionBox.getRectangle().top);

    let topBoundY = nodes[0].collisionBox.getRectangle().bottom;
    for (let i = 1; i < nodes.length; i++) {
      const currentNode = nodes[i];
      this.project.entityMoveManager.moveEntityToUtils(
        currentNode,
        new Vector(currentNode.collisionBox.getRectangle().left, topBoundY),
      );
      topBoundY = currentNode.collisionBox.getRectangle().bottom;
    }
  }
  layoutBySelected(layoutFunction: (entities: Entity[]) => void, isDeep: boolean) {
    const entities = Array.from(this.project.stageManager.getEntities()).filter((node) => node.isSelected);
    if (isDeep) {
      // 递归
      const dfs = (entityList: Entity[]) => {
        // 检查每一个实体
        for (const entity of entityList) {
          // 如果当前这个实体是 Section，就进入到Section内部
          if (entity instanceof Section) {
            const childEntity = entity.children;
            dfs(childEntity);
          }
        }
        layoutFunction(entityList);
      };
      dfs(entities);
    } else {
      layoutFunction(entities);
    }
    this.project.historyManager.recordStep();
  }
  adjustSelectedTextNodeWidth(mode: "maxWidth" | "minWidth" | "average") {
    const selectedTextNode = this.project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof TextNode);
    const maxWidth = selectedTextNode.reduce((acc, cur) => Math.max(acc, cur.collisionBox.getRectangle().width), 0);
    const minWidth = selectedTextNode.reduce(
      (acc, cur) => Math.min(acc, cur.collisionBox.getRectangle().width),
      Infinity,
    );
    const average =
      selectedTextNode.reduce((acc, cur) => acc + cur.collisionBox.getRectangle().width, 0) / selectedTextNode.length;

    for (const textNode of selectedTextNode) {
      textNode.sizeAdjust = "manual";
      switch (mode) {
        case "maxWidth":
          textNode.resizeWidthTo(maxWidth);
          break;
        case "minWidth":
          textNode.resizeWidthTo(minWidth);
          break;
        case "average":
          textNode.resizeWidthTo(average);
          break;
      }
    }
  }
  layoutToSquare(entities: Entity[]) {
    const n = entities.length;
    if (n <= 1) return;

    // 计算所有节点的最大宽度和高度
    let maxWidth = 0,
      maxHeight = 0;
    entities.forEach((node) => {
      const rect = node.collisionBox.getRectangle();
      maxWidth = Math.max(maxWidth, rect.size.x);
      maxHeight = Math.max(maxHeight, rect.size.y);
    });

    const spacing = 20; // 单元格之间的间距
    const cellSize = Math.max(maxWidth, maxHeight) + spacing;

    // 计算最优的行列数，使网格尽可能接近正方形
    const { rows, cols } = getOptimalRowsCols(n);

    // 计算网格的总尺寸
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;

    // 计算原始包围盒的中心点
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    entities.forEach((node) => {
      const rect = node.collisionBox.getRectangle();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 计算网格的起始位置（左上角）
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2;

    // 将节点排列到网格中
    entities.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const cellCenterX = startX + col * cellSize + cellSize / 2;
      const cellCenterY = startY + row * cellSize + cellSize / 2;
      const rect = node.collisionBox.getRectangle();
      const newX = cellCenterX - rect.size.x / 2;
      const newY = cellCenterY - rect.size.y / 2;
      this.project.entityMoveManager.moveEntityToUtils(node, new Vector(newX, newY));
    });
  }
  layoutToTightSquare(entities: Entity[]) {
    if (entities.length === 0) return;
    const layoutItems = entities.map((entity) => ({
      entity,
      rect: entity.collisionBox.getRectangle().clone(),
    }));
    // 记录调整前的全部矩形的外接矩形
    const boundingRectangleBefore = Rectangle.getBoundingRectangle(layoutItems.map((item) => item.rect));

    const sortedRects = sortRectangleGreedy(
      layoutItems.map((item) => item.rect),
      20,
    );

    for (let i = 0; i < sortedRects.length; i++) {
      layoutItems[i].entity.moveTo(sortedRects[i].leftTop.clone());
    }

    // 调整后的全部矩形的外接矩形
    const boundingRectangleAfter = Rectangle.getBoundingRectangle(sortedRects);
    // 整体移动，使得全部内容的外接矩形中心坐标保持不变
    const diff = boundingRectangleBefore.center.subtract(boundingRectangleAfter.center);
    for (const item of layoutItems) {
      item.entity.move(diff);
    }
  }
}
// 辅助函数：计算最优的行列数，使网格尽可能接近正方形
function getOptimalRowsCols(n: number): { rows: number; cols: number } {
  let bestRows = Math.floor(Math.sqrt(n));
  let bestCols = Math.ceil(n / bestRows);
  let bestDiff = Math.abs(bestRows - bestCols);

  // 遍历可能的行数，寻找行列差最小的情况
  for (let rows = bestRows; rows >= 1; rows--) {
    const cols = Math.ceil(n / rows);
    const diff = Math.abs(rows - cols);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestRows = rows;
      bestCols = cols;
    }
  }

  return { rows: bestRows, cols: bestCols };
} /**
 *
 * 装箱问题，排序矩形
    :param rectangles: N个矩形的大小和位置
    :param margin: 矩形之间的间隔（为了美观考虑）
    :return: 调整好后的N个矩形的大小和位置，数组内每个矩形一一对应。
    例如：
    rectangles = [Rectangle(NumberVector(0, 0), 10, 10), Rectangle(NumberVector(10, 10), 1, 1)]
    这两个矩形对角放，外套矩形空隙面积过大，空间浪费，需要调整位置。

    调整后返回：

    [Rectangle(NumberVector(0, 0), 10, 10), Rectangle(NumberVector(12, 0), 1, 1)]
    参数 margin = 2
    横向放置，减少了空间浪费。
 *
 *
 *
 *
 */

// 从visual-file项目里抄过来的

function sortRectangleGreedy(rectangles: Rectangle[], margin = 20): Rectangle[] {
  if (rectangles.length === 0) return [];

  // 处理第一个矩形
  const firstOriginal = rectangles[0];
  const first = new Rectangle(new Vector(0, 0), new Vector(firstOriginal.size.x, firstOriginal.size.y));
  const ret: Rectangle[] = [first];
  let currentWidth = first.right;
  let currentHeight = first.bottom;

  for (let i = 1; i < rectangles.length; i++) {
    const originalRect = rectangles[i];
    let bestCandidate: Rectangle | null = null;
    let minSpaceScore = Infinity;
    let minShapeScore = Infinity;

    for (const placedRect of ret) {
      // 尝试放在右侧
      const candidateRight = appendRight(placedRect, originalRect, ret, margin);
      const rightSpaceScore =
        Math.max(currentWidth, candidateRight.right) -
        currentWidth +
        (Math.max(currentHeight, candidateRight.bottom) - currentHeight);
      const rightShapeScore = Math.abs(
        Math.max(candidateRight.right, currentWidth) - Math.max(candidateRight.bottom, currentHeight),
      );

      if (rightSpaceScore < minSpaceScore || (rightSpaceScore === minSpaceScore && rightShapeScore < minShapeScore)) {
        minSpaceScore = rightSpaceScore;
        minShapeScore = rightShapeScore;
        bestCandidate = candidateRight;
      }

      // 尝试放在下方
      const candidateBottom = appendBottom(placedRect, originalRect, ret, margin);
      const bottomSpaceScore =
        Math.max(currentWidth, candidateBottom.right) -
        currentWidth +
        (Math.max(currentHeight, candidateBottom.bottom) - currentHeight);
      const bottomShapeScore = Math.abs(
        Math.max(candidateBottom.right, currentWidth) - Math.max(candidateBottom.bottom, currentHeight),
      );

      if (
        bottomSpaceScore < minSpaceScore ||
        (bottomSpaceScore === minSpaceScore && bottomShapeScore < minShapeScore)
      ) {
        minSpaceScore = bottomSpaceScore;
        minShapeScore = bottomShapeScore;
        bestCandidate = candidateBottom;
      }
    }

    if (bestCandidate) {
      ret.push(bestCandidate);
      currentWidth = Math.max(currentWidth, bestCandidate.right);
      currentHeight = Math.max(currentHeight, bestCandidate.bottom);
    } else {
      throw new Error("No candidate found");
    }
  }

  return ret;
}

function appendRight(origin: Rectangle, originalRect: Rectangle, existingRects: Rectangle[], margin = 20): Rectangle {
  const candidate = new Rectangle(
    new Vector(origin.right + margin, origin.location.y),
    new Vector(originalRect.size.x, originalRect.size.y),
  );

  let hasCollision: boolean;
  do {
    hasCollision = false;
    for (const existing of existingRects) {
      if (candidate.isCollideWithRectangle(existing)) {
        hasCollision = true;
        // 调整位置：下移到底部并保持右侧对齐
        candidate.location.y = existing.bottom;
        candidate.location.x = Math.max(candidate.location.x, existing.right);
        break;
      }
    }
  } while (hasCollision);

  return candidate;
}

function appendBottom(origin: Rectangle, originalRect: Rectangle, existingRects: Rectangle[], margin = 20): Rectangle {
  const candidate = new Rectangle(
    new Vector(origin.location.x, origin.bottom + margin),
    new Vector(originalRect.size.x, originalRect.size.y),
  );

  let hasCollision: boolean;
  do {
    hasCollision = false;
    for (const existing of existingRects) {
      if (candidate.isCollideWithRectangle(existing)) {
        hasCollision = true;
        // 调整位置：右移并保持底部对齐
        candidate.location.x = existing.right;
        candidate.location.y = Math.max(candidate.location.y, existing.bottom);
        break;
      }
    }
  } while (hasCollision);

  return candidate;
}
