import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
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
  if (rectangles.length <= 6) return arrangeRectangleInCompactByBranch(rectangles, margin);
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

  function appendBottom(
    origin: Rectangle,
    originalRect: Rectangle,
    existingRects: Rectangle[],
    margin = 20,
  ): Rectangle {
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

// function arrangeRectangleInCompactByDivide(rectangles: Rectangle[], margin = 20): Rectangle[] {
//   if (rectangles.length <= 6) return arrangeRectangleInCompactByBranch(rectangles, margin);
//   // 保存原始矩形的索引，以便后续恢复顺序
//   const indexedRectangles = rectangles.map((rect, index) => ({ rect, originalIndex: index }));
//   // 按面积排序
//   indexedRectangles.sort((a, b) => a.rect.size.x * a.rect.size.y - b.rect.size.x * b.rect.size.y);
//   // 提取排序后的矩形进行布局
//   const sortedRects = indexedRectangles.map((item) => item.rect);
//   const arrangedRects = arrangeRectangleInCompactByDivideHelper(sortedRects, margin);
//   // 创建一个映射，将原始索引映射到排列后的矩形
//   const indexToRectMap = new Map<number, Rectangle>();
//   indexedRectangles.forEach((item, index) => {
//     indexToRectMap.set(item.originalIndex, arrangedRects[index]);
//   });
//   // 按照原始顺序重新排列矩形
//   const result: Rectangle[] = [];
//   for (let i = 0; i < rectangles.length; i++) {
//     result.push(indexToRectMap.get(i)!);
//   }
//   return result;

//   function arrangeRectangleInCompactByDivideHelper(rectangles: Rectangle[], margin = 20): Rectangle[] {
//     const n = rectangles.length;
//     if (n < 4) {
//       const ret: Rectangle[] = [
//         new Rectangle(new Vector(0, 0), new Vector(rectangles[0].size.x, rectangles[0].size.y)),
//       ];
//       if (n >= 2) {
//         ret.push(
//           new Rectangle(
//             new Vector(ret[0].width + margin, ret[0].height - rectangles[1].height),
//             new Vector(rectangles[1].size.x, rectangles[1].size.y),
//           ),
//         );
//       }
//       if (n === 3) {
//         ret.push(
//           new Rectangle(
//             new Vector((ret[0].width + margin + ret[1].width) / 2 - rectangles[2].width / 2, ret[0].height + margin),
//             new Vector(rectangles[2].size.x, rectangles[2].size.y),
//           ),
//         );
//       }
//       return ret;
//     }
//     const subs: Rectangle[][] = [
//       arrangeRectangleInCompactByDivide(rectangles.slice(0, n / 4), margin),
//       arrangeRectangleInCompactByDivide(rectangles.slice(n / 4, n / 2), margin),
//       arrangeRectangleInCompactByDivide(rectangles.slice(n / 2, (n / 4) * 3), margin),
//       arrangeRectangleInCompactByDivide(rectangles.slice((n / 4) * 3, n), margin),
//     ];
//     const bods = subs.map((sub) => Rectangle.getBoundingRectangle(sub));
//     for (const r of subs[1]) {
//       r.location = r.location.add(new Vector(bods[0].width + margin, bods[0].height - bods[1].height));
//     }
//     for (const r of subs[2]) {
//       r.location = r.location.add(new Vector(bods[0].width - bods[2].width, bods[0].height + margin));
//     }
//     for (const r of subs[3]) {
//       r.location = r.location.add(new Vector(bods[0].width + margin, bods[0].height + margin));
//     }
//     return subs[0].concat(subs[1], subs[2], subs[3]);
//   }
// }

/**
 * 使用分支限界法计算矩形的最优紧凑布局，寻找最小外接正方形
 *
 * @param rectangles 要排列的矩形数组
 * @param margin 矩形之间的间距，默认为20
 * @returns 排列后的矩形数组，保持原始矩形的顺序
 *
 * @remarks
 * 时间复杂度：理论上为 O(n!)，其中n是矩形数量。由于采用了多种剪枝策略，
 * 实际运行时间会显著低于理论上限，但仍随矩形数量呈指数增长。
 *
 * 性能建议：
 * - 对于n ≤ 6个矩形：可以快速计算出最优解
 * - 对于n > 6个矩形：计算时间会明显增加，可能需要较长等待时间
 * - 对于大规模矩形布局问题，建议使用启发式算法替代
 *
 * 算法特点：
 * - 使用优先队列管理搜索状态
 * - 大矩形优先放置策略
 * - 多层剪枝优化搜索空间
 * - 仅返回完整的最优解
 */
function arrangeRectangleInCompactByBranch(rectangles: Rectangle[], margin = 20): Rectangle[] {
  if (rectangles.length === 0) return [];

  // 定义状态接口，表示放置进度和当前布局情况
  interface State {
    placedRectangles: Rectangle[];
    remainingIndices: number[];
    // 当前布局的外接矩形信息
    currentWidth: number;
    currentHeight: number;
    // 启发式值，用于分支限界
    heuristicValue: number;
  }

  // 按面积从大到小排序矩形，优先放置大矩形
  const sortedIndices = Array.from({ length: rectangles.length }, (_, i) => i).sort(
    (a, b) => rectangles[b].size.x * rectangles[b].size.y - rectangles[a].size.x * rectangles[a].size.y,
  );

  // 计算矩形的总面积，用于启发式估计
  const totalArea = rectangles.reduce((sum, rect) => sum + rect.size.x * rect.size.y, 0);

  // 计算最小可能的边长（基于总面积的理论下限）
  const minPossibleSide = Math.ceil(Math.sqrt(totalArea));

  // 用于存储最优解
  let bestSolution: Rectangle[] = [];
  let bestSideLength = Infinity; // 初始化为无穷大，确保第一个解会被接受

  // 计算启发式值：更精确地估计剩余矩形放置后的最小可能边长
  function calculateHeuristic(currentSide: number, placedArea: number): number {
    // 计算剩余面积
    const remainingArea = totalArea - placedArea;
    // 计算剩余矩形的最小可能边长增量并用于启发式计算
    const minAdditionalSide = Math.ceil(Math.sqrt(remainingArea));
    // 启发式值：当前边长与基于总面积的理论最小边长的最大值
    // 考虑剩余面积的影响，提供更准确的估计
    return Math.max(currentSide, minPossibleSide, currentSide + minAdditionalSide * 0.3); // 使用0.3系数平衡准确性和性能
  }

  // 初始状态：放置第一个矩形（最大的）
  const firstRect = new Rectangle(
    new Vector(0, 0),
    new Vector(rectangles[sortedIndices[0]].size.x, rectangles[sortedIndices[0]].size.y),
  );

  const firstRectArea = firstRect.size.x * firstRect.size.y;
  const firstHeuristic = calculateHeuristic(Math.max(firstRect.size.x, firstRect.size.y), firstRectArea);

  // 使用优先队列来管理搜索状态，按照启发式值排序
  const priorityQueue: State[] = [
    {
      placedRectangles: [firstRect],
      remainingIndices: sortedIndices.slice(1),
      currentWidth: firstRect.size.x,
      currentHeight: firstRect.size.y,
      heuristicValue: firstHeuristic,
    },
  ];

  // 检查两个矩形是否重叠（确保间距至少为margin）
  function checkCollision(newRect: Rectangle, placedRects: Rectangle[], margin: number): boolean {
    return placedRects.some(
      (rect) =>
        !(
          newRect.right + margin <= rect.left ||
          newRect.left >= rect.right + margin ||
          newRect.bottom + margin <= rect.top ||
          newRect.top >= rect.bottom + margin
        ),
    );
  }

  // 生成可能的放置位置
  function generatePossiblePositions(rect: Rectangle, placedRects: Rectangle[], margin: number): Vector[] {
    const positions: Set<string> = new Set(); // 使用Set避免重复位置

    // 如果还没有放置任何矩形，只返回原点位置
    if (placedRects.length === 0) {
      return [new Vector(0, 0)];
    }

    // 基于已放置矩形的边缘生成候选位置，确保间距正好为margin
    placedRects.forEach((placed) => {
      // 右侧位置（与左侧矩形间距正好为margin）
      positions.add(`${placed.right + margin},${placed.top}`);
      positions.add(`${placed.right + margin},${placed.bottom - rect.size.y}`);
      positions.add(`${placed.right + margin},${placed.top + (placed.size.y - rect.size.y) / 2}`);

      // 底部位置（与上方矩形间距正好为margin）
      positions.add(`${placed.left},${placed.bottom + margin}`);
      positions.add(`${placed.right - rect.size.x},${placed.bottom + margin}`);
      positions.add(`${placed.left + (placed.size.x - rect.size.x) / 2},${placed.bottom + margin}`);

      // 左侧位置（与右侧矩形间距正好为margin）
      positions.add(`${placed.left - rect.size.x - margin},${placed.top}`);
      positions.add(`${placed.left - rect.size.x - margin},${placed.bottom - rect.size.y}`);
      positions.add(`${placed.left - rect.size.x - margin},${placed.top + (placed.size.y - rect.size.y) / 2}`);

      // 顶部位置（与下方矩形间距正好为margin）
      positions.add(`${placed.left},${placed.top - rect.size.y - margin}`);
      positions.add(`${placed.right - rect.size.x},${placed.top - rect.size.y - margin}`);
      positions.add(`${placed.left + (placed.size.x - rect.size.x) / 2},${placed.top - rect.size.y - margin}`);
    });

    // 将Set中的字符串位置转换回Vector对象并过滤负坐标
    return (
      Array.from(positions)
        .map((posStr) => {
          const [x, y] = posStr.split(",").map(Number);
          return new Vector(x, y);
        })
        .filter((pos) => pos.x >= 0 && pos.y >= 0)
        // 按位置的紧凑程度排序：优先选择靠近原点的位置
        .sort((a, b) => {
          const distanceA = a.x + a.y;
          const distanceB = b.x + b.y;
          return distanceA - distanceB;
        })
    );
  }

  // 分支限界搜索：专注于寻找最优解
  while (priorityQueue.length > 0) {
    // 取出启发式值最小的状态（优先队列排序后取最后一个）
    priorityQueue.sort((a, b) => a.heuristicValue - b.heuristicValue); // 升序排序
    const state = priorityQueue.pop()!;

    // 剪枝：如果当前状态的启发式值已经大于等于最佳解的边长，则跳过
    if (state.heuristicValue >= bestSideLength) {
      continue;
    }

    // 如果没有剩余矩形，这是一个完整解，检查是否是最优解
    if (state.remainingIndices.length === 0) {
      const currentSideLength = Math.max(state.currentWidth, state.currentHeight);
      // 只接受完整解，并且只有当它比当前最优解更好时才更新
      if (currentSideLength < bestSideLength) {
        bestSideLength = currentSideLength;
        bestSolution = state.placedRectangles;
      }
      continue;
    }

    // 取出下一个要放置的矩形索引
    const nextIndex = state.remainingIndices[0];
    const remainingIndices = state.remainingIndices.slice(1);
    const nextRect = rectangles[nextIndex];

    // 计算已放置矩形的总面积
    const placedArea = state.placedRectangles.reduce((sum, rect) => sum + rect.size.x * rect.size.y, 0);

    // 生成可能的放置位置
    const possiblePositions = generatePossiblePositions(nextRect, state.placedRectangles, margin);

    // 尝试每个可能的位置
    for (const position of possiblePositions) {
      const newRect = new Rectangle(position, new Vector(nextRect.size.x, nextRect.size.y));

      // 检查是否与已放置的矩形冲突
      if (!checkCollision(newRect, state.placedRectangles, margin)) {
        const newPlacedRectangles = [...state.placedRectangles, newRect];
        const newWidth = Math.max(state.currentWidth, newRect.right);
        const newHeight = Math.max(state.currentHeight, newRect.bottom);
        const newSideLength = Math.max(newWidth, newHeight);

        // 剪枝：如果新的边长已经大于等于当前最优解的边长，则跳过
        if (newSideLength >= bestSideLength) {
          continue;
        }

        // 计算新状态的启发式值
        const newPlacedArea = placedArea + newRect.size.x * newRect.size.y;
        const heuristicValue = calculateHeuristic(newSideLength, newPlacedArea);

        // 剪枝：如果启发式值已经大于等于当前最优解的边长，则跳过
        if (heuristicValue >= bestSideLength) {
          continue;
        }

        // 将新状态加入优先队列
        priorityQueue.push({
          placedRectangles: newPlacedRectangles,
          remainingIndices,
          currentWidth: newWidth,
          currentHeight: newHeight,
          heuristicValue,
        });
      }
    }
  }

  // 确保只返回完整的最优解
  if (bestSolution.length !== rectangles.length) {
    // 如果没有找到完整解（理论上不应该发生，除非搜索空间被完全剪枝），返回按原始顺序的矩形
    return rectangles.map((rect) => rect.clone());
  }

  // 按照原始顺序返回矩形
  const result: Rectangle[] = [];
  for (let i = 0; i < rectangles.length; i++) {
    // 找到原始索引对应的矩形
    const originalIndex = sortedIndices.findIndex((sortedIdx) => sortedIdx === i);
    if (originalIndex >= 0 && originalIndex < bestSolution.length) {
      result[i] = bestSolution[originalIndex];
    } else {
      // 如果找不到对应关系，使用原始矩形
      result[i] = rectangles[i].clone();
    }
  }

  return result;
}
