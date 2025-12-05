import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";

/**
 * 计算一个节点的半径，半径是一个矩形中心到对角线的距离
 * @param entity
 */
function getEntityRadius(entity: ConnectableEntity): number {
  const rect = entity.collisionBox.getRectangle();
  const width = rect.size.x;
  const height = rect.size.y;
  const diagonalLength = Math.sqrt(width ** 2 + height ** 2);
  return diagonalLength / 2;
}
/**
 * 一种距离到力的映射函数
 * @param distance
 */
function distanceToForce(distance: number): number {
  return 1 / (distance ** 2 + 1);
}

@service("autoLayout")
export class AutoLayout {
  constructor(private readonly project: Project) {}

  private isGravityLayoutStart: boolean = false;

  tick() {
    // 引力式布局
    // if (this.project.controller.pressingKeySet.size === 1 && this.project.controller.pressingKeySet.has("g")) {
    //   this.gravityLayoutTick();
    // }

    if (this.isGravityLayoutStart) {
      this.gravityLayoutTick();
    }
  }

  public setGravityLayoutStart() {
    this.isGravityLayoutStart = true;
  }

  public setGravityLayoutEnd() {
    this.isGravityLayoutStart = false;
  }

  /**
   * DAG布局算法输入数据结构
   */
  private getDAGLayoutInput(entities: ConnectableEntity[]): {
    nodes: Array<{ id: string; rectangle: Rectangle }>;
    edges: Array<{ from: string; to: string }>;
  } {
    // 构建节点映射，使用UUID作为唯一标识
    const nodeMap = new Map<string, ConnectableEntity>();
    const nodes = entities.map((entity) => {
      nodeMap.set(entity.uuid, entity);
      return {
        id: entity.uuid,
        rectangle: entity.collisionBox.getRectangle(),
      };
    });

    // 构建边关系
    const edges: Array<{ from: string; to: string }> = [];
    for (const entity of entities) {
      const children = this.project.graphMethods.nodeChildrenArray(entity);
      for (const child of children) {
        // 只包含选中实体之间的连接
        if (nodeMap.has(child.uuid)) {
          edges.push({
            from: entity.uuid,
            to: child.uuid,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * DAG布局算法接口
   * @param input 包含节点和边的DAG结构
   * @returns 每个节点的新位置 { [nodeId: string]: Vector }
   */
  private computeDAGLayout(input: {
    nodes: Array<{ id: string; rectangle: Rectangle }>;
    edges: Array<{ from: string; to: string }>;
  }): { [nodeId: string]: Vector } {
    const { nodes, edges } = input;
    // 先对节点进行拓扑排序并计算层数
    const { order: topologicalOrder, levels } = this.topologicalSort(nodes, edges);

    // 根据层数对节点进行分组
    const nodesByLevel: Map<number, string[]> = new Map();
    levels.forEach((level, nodeId) => {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)?.push(nodeId);
    });

    // 创建节点ID到节点信息的映射
    const nodeMap: Map<string, { id: string; rectangle: Rectangle }> = new Map();
    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    // 计算每个节点的新位置
    const newPositions: { [nodeId: string]: Vector } = {};

    // 定义层间距和节点间距
    const horizontalSpacing = 150; // 层与层之间的基本水平间距
    const verticalSpacing = 100; // 同一层节点之间的垂直间距

    // 处理第一个节点（拓扑序第一个）
    if (topologicalOrder.length > 0) {
      const firstNodeId = topologicalOrder[0];
      const firstNode = nodeMap.get(firstNodeId)!;
      // 第一个节点位置保持不变
      newPositions[firstNodeId] = firstNode.rectangle.location;

      // 获取第一个节点的初始位置，作为所有层第一个元素的水平参考点
      const firstNodePos = newPositions[firstNodeId];
      const baseY = firstNodePos.y;

      // 计算每层的最长矩形宽度
      const maxLevel = Math.max(...Array.from(levels.values()));
      const levelMaxWidths: Map<number, number> = new Map();

      for (let level = 0; level <= maxLevel; level++) {
        const nodesInLevel = nodesByLevel.get(level) || [];
        let maxWidth = 0;

        for (const nodeId of nodesInLevel) {
          const node = nodeMap.get(nodeId)!;
          const nodeWidth = node.rectangle.width;
          if (nodeWidth > maxWidth) {
            maxWidth = nodeWidth;
          }
        }

        levelMaxWidths.set(level, maxWidth);
      }

      // 计算每层的水平偏移，考虑前一层的最长矩形宽度
      const levelOffsets: Map<number, number> = new Map();
      levelOffsets.set(0, firstNodePos.x); // 第一层的偏移就是第一个节点的x坐标

      for (let level = 1; level <= maxLevel; level++) {
        // 前一层的偏移
        const prevOffset = levelOffsets.get(level - 1) || 0;
        // 前一层的最长矩形宽度
        const prevMaxWidth = levelMaxWidths.get(level - 1) || 0;
        // 当前层的偏移 = 前一层偏移 + 前一层最长宽度 + 水平间距
        const currentOffset = prevOffset + prevMaxWidth + horizontalSpacing;
        levelOffsets.set(level, currentOffset);
      }

      // 按层数处理所有节点
      for (let level = 0; level <= maxLevel; level++) {
        const nodesInLevel = nodesByLevel.get(level) || [];
        if (nodesInLevel.length === 0) continue;

        // 计算当前层的水平位置
        const levelX = levelOffsets.get(level) || 0;

        // 处理当前层的所有节点
        for (let i = 0; i < nodesInLevel.length; i++) {
          const currentNodeId = nodesInLevel[i];

          // 如果是第一层第一个节点，已经处理过，跳过
          if (level === 0 && i === 0) continue;

          // 计算垂直位置：基于第一层第一个节点的y坐标加上垂直间距
          // 同一层的节点在垂直方向上排列
          const newY = baseY + i * verticalSpacing;

          // 设置节点位置
          newPositions[currentNodeId] = new Vector(levelX, newY);
        }
      }
    }

    return newPositions;
  }

  /**
   * 使用Kahn算法对DAG进行拓扑排序，并计算节点层数
   * @param nodes 节点数组
   * @param edges 边数组
   * @returns 包含拓扑排序结果和节点层数映射的对象
   */
  private topologicalSort(
    nodes: Array<{ id: string; rectangle: Rectangle }>,
    edges: Array<{ from: string; to: string }>,
  ): { order: string[]; levels: Map<string, number> } {
    // 构建邻接表和入度映射
    const adjacencyList: Map<string, string[]> = new Map();
    const inDegree: Map<string, number> = new Map();
    // 用于存储每个节点的层数
    const levels: Map<string, number> = new Map();

    // 初始化邻接表、入度和层数
    nodes.forEach((node) => {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
      levels.set(node.id, 0); // 初始层数设为0
    });

    // 填充邻接表和计算入度
    edges.forEach((edge) => {
      const { from, to } = edge;
      // 添加边到邻接表
      adjacencyList.get(from)?.push(to);
      // 增加目标节点的入度
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    });

    // 初始化队列，加入所有入度为0的节点
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
        levels.set(nodeId, 0); // 入度为0的节点层数为0
      }
    });

    const result: string[] = [];

    // 执行拓扑排序
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      // 获取当前节点的层数
      const currentLevel = levels.get(current)!;

      // 遍历当前节点的所有邻居
      const neighbors = adjacencyList.get(current) || [];
      neighbors.forEach((neighbor) => {
        // 减少邻居的入度
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        // 计算邻居节点的层数，取当前计算值与已有值的最大值
        const neighborLevel = Math.max(levels.get(neighbor) || 0, currentLevel + 1);
        levels.set(neighbor, neighborLevel);

        // 如果入度变为0，加入队列
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // 检查是否存在环（如果结果长度不等于节点数，说明存在环）
    if (result.length !== nodes.length) {
      console.warn("DAG布局警告：图中存在环，拓扑排序结果可能不完整");
      // 可以选择返回部分结果或抛出错误，这里选择返回部分结果
    }

    return { order: result, levels };
  }

  /**
   * DAG布局主函数
   * @param entities 选中的实体列表
   */
  public autoLayoutDAG(entities: ConnectableEntity[]) {
    try {
      // 1. 准备算法输入数据
      const input = this.getDAGLayoutInput(entities);

      // 2. 调用DAG布局算法计算新位置
      const newPositions = this.computeDAGLayout(input);

      // 3. 应用计算结果到实际节点
      const nodeMap = new Map<string, ConnectableEntity>();
      entities.forEach((entity) => nodeMap.set(entity.uuid, entity));

      // 4. 移动节点到新位置
      for (const [nodeId, position] of Object.entries(newPositions)) {
        const entity = nodeMap.get(nodeId);
        if (entity) {
          entity.moveTo(position);
        }
      }

      // 5. 记录操作步骤，支持撤销
      this.project.historyManager.recordStep();

      // 6. 显示成功提示
      toast.success("DAG布局已应用");
    } catch (error) {
      // 7. 错误处理
      console.error("DAG布局失败:", error);
      toast.error("DAG布局失败，请检查控制台日志");
    }
  }

  /**
   * 引力式布局
   */
  gravityLayoutTick() {
    // 获取所有选中的节点
    const selectedConnectableEntities = this.project.stageManager
      .getSelectedEntities()
      .filter((entity) => entity instanceof ConnectableEntity);
    // 遍历所有选中的节点，将他们的直接孩子节点拉向自己
    selectedConnectableEntities.forEach((entity) => {
      // 计算父向子的关系
      const children = this.project.graphMethods.nodeChildrenArray(entity);
      children.forEach((child) => {
        // 计算子节点到父节点的向量
        const fatherToChildVector = child.collisionBox
          .getRectangle()
          .center.subtract(entity.collisionBox.getRectangle().center);
        // 计算父亲半径和孩子半径
        const fatherRadius = getEntityRadius(entity);
        const childRadius = getEntityRadius(child);
        const currentDistance = fatherToChildVector.magnitude();
        if (currentDistance > (fatherRadius + childRadius) * 2) {
          // 向内拉
          child.move(fatherToChildVector.normalize().multiply(-1));
        } else {
          // 向外排斥
          child.move(fatherToChildVector.normalize());
        }
      });
      // 二重遍历
      selectedConnectableEntities.forEach((entity2) => {
        if (entity === entity2) {
          return;
        }
        // 计算两个节点的距离
        const vector = entity2.collisionBox.getRectangle().center.subtract(entity.collisionBox.getRectangle().center);
        const distance = vector.magnitude();
        // 计算两个节点的半径
        const radius1 = getEntityRadius(entity);
        const radius2 = getEntityRadius(entity2);
        // 计算两个节点的最小距离
        const minDistance = (radius1 + radius2) * 2;
        if (distance < minDistance) {
          entity2.move(vector.normalize().multiply(distanceToForce(distance - minDistance)));
        } else if (distance > minDistance) {
          entity2.move(vector.normalize().multiply(-distanceToForce(distance - minDistance)));
        }
      });
    });
  }
}
