import { Project, service } from "@/core/Project";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "../../stageObject/association/MutiTargetUndirectedEdge";
import { TextNode } from "../../stageObject/entity/TextNode";

/**
 * 树形结构检测结果
 */
export interface TreeValidationResult {
  isValid: boolean;
  issues: TreeIssue[];
}

/**
 * 树形结构问题类型
 */
export type TreeIssueType = "selfLoop" | "cycle" | "diamond" | "overlappingEdges";

/**
 * 树形结构问题
 */
export interface TreeIssue {
  type: TreeIssueType;
  message: string;
  nodes?: ConnectableEntity[];
  edges?: Edge[];
}

@service("graphMethods")
export class GraphMethods {
  constructor(protected readonly project: Project) {}

  isTree(node: ConnectableEntity, skipDashed = false): boolean {
    const dfs = (node: ConnectableEntity, visited: ConnectableEntity[]): boolean => {
      if (visited.includes(node)) {
        return false;
      }
      visited.push(node);
      for (const child of this.nodeChildrenArray(node, skipDashed)) {
        if (!dfs(child, visited)) {
          return false;
        }
      }
      return true;
    };

    return dfs(node, []);
  }

  /**
   * 获取节点的显示文本（最多5个字符，溢出用省略号）
   */
  private getNodeDisplayName(node: ConnectableEntity): string {
    if (node instanceof TextNode) {
      const text = node.text || "未命名";
      return text.length > 5 ? text.slice(0, 5) + "..." : text;
    }
    return "节点";
  }

  /**
   * 详细检测树形结构问题
   * @param rootNode 根节点
   * @param skipDashed 是否跳过虚线边
   * @returns 检测结果，包含所有发现的问题
   */
  validateTreeStructure(rootNode: ConnectableEntity, skipDashed = false): TreeValidationResult {
    const issues: TreeIssue[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // 获取所有相关节点
    const allNodes = this.getSuccessorSet(rootNode, true, skipDashed);
    const nodeSet = new Set(allNodes.map((n) => n.uuid));

    // 辅助函数：检查边是否为虚线
    const isDashedEdge = (edge: Edge): boolean => {
      return "lineType" in edge && (edge as { lineType: string }).lineType === "dashed";
    };

    // 1. 检测自环
    for (const node of allNodes) {
      const selfLoopEdges = this.project.stageManager.getLineEdges().filter((edge) => {
        if (skipDashed && isDashedEdge(edge)) return false;
        return edge.source.uuid === node.uuid && edge.target.uuid === node.uuid;
      });
      if (selfLoopEdges.length > 0) {
        issues.push({
          type: "selfLoop",
          message: `节点 "${this.getNodeDisplayName(node)}" 存在自环`,
          nodes: [node],
          edges: selfLoopEdges,
        });
      }
    }

    // 2. 检测边重叠（两个节点之间存在多条边）
    for (const node of allNodes) {
      const outgoingEdges = this.getOutgoingEdges(node).filter((edge) => {
        if (skipDashed && isDashedEdge(edge)) return false;
        return nodeSet.has(edge.target.uuid);
      });

      // 按目标节点分组
      const edgesByTarget = new Map<string, Edge[]>();
      for (const edge of outgoingEdges) {
        const targetId = edge.target.uuid;
        if (!edgesByTarget.has(targetId)) {
          edgesByTarget.set(targetId, []);
        }
        edgesByTarget.get(targetId)!.push(edge);
      }

      // 检查是否有多个边指向同一个目标
      for (const [targetId, edges] of edgesByTarget) {
        if (edges.length > 1) {
          const targetNode = this.project.stageManager.getConnectableEntityByUUID(targetId);
          if (targetNode) {
            issues.push({
              type: "overlappingEdges",
              message: `节点 "${this.getNodeDisplayName(node)}" 和 "${this.getNodeDisplayName(targetNode)}" 之间存在 ${edges.length} 条重叠的边`,
              nodes: [node, targetNode],
              edges: edges,
            });
          }
        }
      }
    }

    // 3. 检测环路和菱形结构
    const dfs = (node: ConnectableEntity, currentPath: string[]): boolean => {
      const nodeId = node.uuid;

      if (recursionStack.has(nodeId)) {
        // 发现环路
        const cycleStart = currentPath.indexOf(nodeId);
        const cycleNodes = currentPath
          .slice(cycleStart)
          .map((id) => this.project.stageManager.getConnectableEntityByUUID(id))
          .filter((n): n is ConnectableEntity => n !== undefined);

        // 添加节点本身到环路
        cycleNodes.push(node);

        const nodeNames = cycleNodes.map((n) => `"${this.getNodeDisplayName(n)}"`).join(" → ");
        issues.push({
          type: "cycle",
          message: `存在环路: ${nodeNames}`,
          nodes: cycleNodes,
        });
        return false;
      }

      if (visited.has(nodeId)) {
        // 节点已访问过，检查是否是菱形结构（多个父节点）
        const parents = this.nodeParentArray(node, skipDashed).filter((p) => nodeSet.has(p.uuid));
        if (parents.length > 1) {
          // 检查是否已经报告过这个菱形
          const existingDiamond = issues.find((i) => i.type === "diamond" && i.nodes?.some((n) => n.uuid === nodeId));

          if (!existingDiamond) {
            const parentNames = parents.map((p) => `"${this.getNodeDisplayName(p)}"`).join(", ");
            issues.push({
              type: "diamond",
              message: `节点 "${this.getNodeDisplayName(node)}" 有多个父节点: ${parentNames}，形成菱形结构`,
              nodes: [node, ...parents],
            });
          }
        }
        return true;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const children = this.nodeChildrenArray(node, skipDashed).filter((child) => nodeSet.has(child.uuid));
      for (const child of children) {
        dfs(child, [...currentPath, nodeId]);
      }

      recursionStack.delete(nodeId);
      return true;
    };

    dfs(rootNode, []);

    // 4. 再次检测菱形结构：检查所有节点的入度
    for (const node of allNodes) {
      if (node.uuid === rootNode.uuid) continue;

      const parents = this.nodeParentArray(node, skipDashed).filter((p) => nodeSet.has(p.uuid));
      if (parents.length > 1) {
        // 检查是否已经报告过
        const alreadyReported = issues.some((i) => i.type === "diamond" && i.nodes?.some((n) => n.uuid === node.uuid));

        if (!alreadyReported) {
          const parentNames = parents.map((p) => `"${this.getNodeDisplayName(p)}"`).join(", ");
          issues.push({
            type: "diamond",
            message: `节点 "${this.getNodeDisplayName(node)}" 有多个父节点: ${parentNames}，形成菱形结构`,
            nodes: [node, ...parents],
          });
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /** 获取节点连接的子节点数组，未排除自环 */
  nodeChildrenArray(node: ConnectableEntity, skipDashed = false): ConnectableEntity[] {
    const res: ConnectableEntity[] = [];
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (skipDashed && edge.lineType === "dashed") continue;
      if (edge.source.uuid === node.uuid) {
        res.push(edge.target);
      }
    }
    return res;
  }

  /**
   * 获取一个节点的所有父亲节点，排除自环
   * 性能有待优化！！
   */
  nodeParentArray(node: ConnectableEntity, skipDashed = false): ConnectableEntity[] {
    const res: ConnectableEntity[] = [];
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (skipDashed && edge.lineType === "dashed") continue;
      if (edge.target.uuid === node.uuid && edge.target.uuid !== edge.source.uuid) {
        res.push(edge.source);
      }
    }
    return res;
  }

  edgeChildrenArray(node: ConnectableEntity): Edge[] {
    return this.project.stageManager.getLineEdges().filter((edge) => edge.source.uuid === node.uuid);
  }

  edgeParentArray(node: ConnectableEntity): Edge[] {
    return this.project.stageManager.getLineEdges().filter((edge) => edge.target.uuid === node.uuid);
  }

  /**
   * 获取反向边集
   * @param skipDashed 是否跳过虚线边
   */
  private getReversedEdgeDict(skipDashed = false): Record<string, string> {
    const res: Record<string, string> = {};
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (skipDashed && edge.lineType === "dashed") continue;
      res[edge.target.uuid] = edge.source.uuid;
    }
    return res;
  }

  /**
   * 当前节点是否是存在于树形结构中，且非树形结构的跟节点
   * @param node
   * @returns
   */
  isCurrentNodeInTreeStructAndNotRoot(node: ConnectableEntity): boolean {
    const roots = this.getRoots(node, true);
    if (roots.length !== 1) {
      return false;
    }
    const rootNode = roots[0];
    if (rootNode.uuid === node.uuid) {
      return false;
    }
    return this.isTree(rootNode, true);
  }

  /**
   * 获取自己的祖宗节点
   * @param node 节点
   * @param skipDashed 是否跳过虚线边（用于树形格式化时）
   */
  getRoots(node: ConnectableEntity, skipDashed = false): ConnectableEntity[] {
    const reverseEdges = this.getReversedEdgeDict(skipDashed);
    let rootUUID = node.uuid;
    const visited: Set<string> = new Set(); // 用于记录已经访问过的节点，避免重复访问
    while (reverseEdges[rootUUID] && !visited.has(rootUUID)) {
      visited.add(rootUUID);
      const parentUUID = reverseEdges[rootUUID];
      const parent = this.project.stageManager.getConnectableEntityByUUID(parentUUID);
      if (parent) {
        rootUUID = parentUUID;
      } else {
        break;
      }
    }
    const root = this.project.stageManager.getConnectableEntityByUUID(rootUUID);
    if (root) {
      return [root];
    } else {
      return [];
    }
  }

  isConnected(node: ConnectableEntity, target: ConnectableEntity): boolean {
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (edge.source === node && edge.target === target) {
        return true;
      }
    }
    return false;
  }

  /**
   * 通过一个节点获取一个 可达节点集合/后继节点集合 Successor Set
   * 包括它自己
   * @param node
   * @param isHaveSelf 是否包含节点自身
   * @param skipDashed 是否跳过虚线边（用于树形格式化时，避免虚线连接的节点被包含）
   */
  getSuccessorSet(node: ConnectableEntity, isHaveSelf: boolean = true, skipDashed = false): ConnectableEntity[] {
    let result: ConnectableEntity[] = []; // 存储可达节点的结果集
    const visited: Set<string> = new Set(); // 用于记录已经访问过的节点，避免重复访问

    // 深度优先搜索 (DFS) 实现
    const dfs = (currentNode: ConnectableEntity): void => {
      if (visited.has(currentNode.uuid)) {
        return; // 如果节点已经被访问过，直接返回
      }
      visited.add(currentNode.uuid); // 标记当前节点为已访问
      result.push(currentNode); // 将当前节点加入结果集

      // 遍历当前节点的所有子节点
      const children = this.nodeChildrenArray(currentNode, skipDashed);
      for (const child of children) {
        dfs(child); // 对每个子节点递归调用 DFS
      }
    };

    // 从给定节点开始进行深度优先搜索
    dfs(node);
    if (!isHaveSelf) {
      result = result.filter((n) => n === node);
    }

    return result; // 返回所有可达节点的集合
  }

  /**
   * 获取一个节点的一步可达节点集合/后继节点集合 One-Step Successor Set
   * 排除自环
   * @param node
   */
  getOneStepSuccessorSet(node: ConnectableEntity): ConnectableEntity[] {
    const result: ConnectableEntity[] = []; // 存储可达节点的结果集
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (edge.source === node && edge.target.uuid !== edge.source.uuid) {
        result.push(edge.target);
      }
    }
    return result;
  }

  getEdgesBetween(node1: ConnectableEntity, node2: ConnectableEntity): Edge[] {
    const result: Edge[] = []; // 存储连接两个节点的边的结果集
    for (const edge of this.project.stageManager.getEdges()) {
      if (edge.source === node1 && edge.target === node2) {
        result.push(edge);
      }
    }
    return result;
  }

  getEdgeFromTwoEntity(fromNode: ConnectableEntity, toNode: ConnectableEntity): Edge | null {
    for (const edge of this.project.stageManager.getEdges()) {
      if (edge.source === fromNode && edge.target === toNode) {
        return edge;
      }
    }
    return null;
  }

  /**
   * 找到和一个节点直接相连的所有超边
   * @param node
   * @returns
   */
  getHyperEdgesByNode(node: ConnectableEntity): MultiTargetUndirectedEdge[] {
    const edges: MultiTargetUndirectedEdge[] = [];
    const hyperEdges = this.project.stageManager
      .getAssociations()
      .filter((association) => association instanceof MultiTargetUndirectedEdge);
    for (const hyperEdge of hyperEdges) {
      if (hyperEdge.associationList.includes(node)) {
        edges.push(hyperEdge);
      }
    }
    return edges;
  }

  /**
   * 获取一个节点的所有出度（出边）
   * @param node 源节点
   * @returns 节点的所有出边数组
   */
  public getOutgoingEdges(node: ConnectableEntity): Edge[] {
    const result: Edge[] = [];
    for (const edge of this.project.stageManager.getEdges()) {
      if (edge.source === node) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * 获取一个节点的所有入度（入边）
   * @param node 目标节点
   * @returns 节点的所有入边数组
   */
  public getIncomingEdges(node: ConnectableEntity): Edge[] {
    const result: Edge[] = [];
    for (const edge of this.project.stageManager.getEdges()) {
      if (edge.target === node) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * 获取一个节点通过连接它的所有超边的其他节点
   * 例如 {A B C}, {C, D, E}，f(A) => {B, C, D, E}
   * @param node 指定节点
   * @returns 通过超边连接的所有其他节点集合（排除节点自身）
   */
  public getNodesConnectedByHyperEdges(node: ConnectableEntity): ConnectableEntity[] {
    // 获取与节点相连的所有超边
    const hyperEdges = this.getHyperEdgesByNode(node);

    // 创建一个Set来存储结果，确保没有重复节点
    const connectedNodes = new Set<ConnectableEntity>();

    // 遍历所有超边，收集连接的节点
    for (const hyperEdge of hyperEdges) {
      for (const connectedNode of hyperEdge.associationList) {
        // 排除节点自身
        if (connectedNode.uuid !== node.uuid) {
          connectedNodes.add(connectedNode);
        }
      }
    }

    // 将Set转换为数组并返回
    return Array.from(connectedNodes);
  }

  private nodeChildrenArrayWithinSet(node: ConnectableEntity, nodeSet: Set<string>): ConnectableEntity[] {
    return this.nodeChildrenArray(node).filter((child) => nodeSet.has(child.uuid));
  }

  private nodeParentArrayWithinSet(node: ConnectableEntity, nodeSet: Set<string>): ConnectableEntity[] {
    return this.nodeParentArray(node).filter((parent) => nodeSet.has(parent.uuid));
  }

  /**
   * 根据一组节点判断其在子图中的连接关系是否构成一棵树，并返回唯一根节点。
   * 规则：
   * - 子图中每个节点的入度至多为1
   * - 恰好存在一个入度为0的根节点
   * - 从根出发可达所有节点（连通），且无环
   */
  public getTreeRootByNodes(nodes: ConnectableEntity[]): ConnectableEntity | null {
    if (nodes.length === 0) return null;
    const nodeSet = new Set<string>(nodes.map((n) => n.uuid));
    const roots = nodes.filter((n) => this.nodeParentArrayWithinSet(n, nodeSet).length === 0);
    if (roots.length !== 1) return null;
    return roots[0];
  }

  /** 判断一组节点在其诱导子图中是否构成一棵树 */
  public isTreeByNodes(nodes: ConnectableEntity[]): boolean {
    if (nodes.length === 0) return false;
    const nodeSet = new Set<string>(nodes.map((n) => n.uuid));

    // 每个节点入度最多为1
    for (const n of nodes) {
      if (this.nodeParentArrayWithinSet(n, nodeSet).length > 1) {
        return false;
      }
    }

    // 唯一根节点
    const root = this.getTreeRootByNodes(nodes);
    if (!root) return false;

    // DFS 检测无环且连通（覆盖所有节点）
    const visited = new Set<string>();
    const dfs = (current: ConnectableEntity): boolean => {
      if (visited.has(current.uuid)) {
        return false; // 发现环
      }
      visited.add(current.uuid);
      for (const child of this.nodeChildrenArrayWithinSet(current, nodeSet)) {
        if (!dfs(child)) return false;
      }
      return true;
    };

    if (!dfs(root)) return false;
    return visited.size === nodeSet.size;
  }

  /** 判断一组节点在其诱导子图中是否构成有向无环图（DAG） */
  public isDAGByNodes(nodes: ConnectableEntity[]): boolean {
    if (nodes.length === 0) return false;
    const nodeSet = new Set<string>(nodes.map((n) => n.uuid));

    // 使用 Kahn算法检测DAG
    // 1. 计算每个节点的入度
    const inDegree: Map<string, number> = new Map();
    const adjacency: Map<string, ConnectableEntity[]> = new Map();

    // 初始化入度和邻接表
    for (const node of nodes) {
      inDegree.set(node.uuid, this.nodeParentArrayWithinSet(node, nodeSet).length);
      adjacency.set(node.uuid, this.nodeChildrenArrayWithinSet(node, nodeSet));
    }

    // 2. 将所有入度为0的节点入队
    const queue: ConnectableEntity[] = [];
    for (const node of nodes) {
      if (inDegree.get(node.uuid) === 0) {
        queue.push(node);
      }
    }

    // 3. 拓扑排序
    let count = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      count++;

      // 遍历所有邻接节点
      for (const neighbor of adjacency.get(current.uuid)!) {
        const neighborId = neighbor.uuid;
        const newInDegree = inDegree.get(neighborId)! - 1;
        inDegree.set(neighborId, newInDegree);

        if (newInDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 如果所有节点都被访问过，说明没有环，是DAG
    return count === nodes.length;
  }
}
