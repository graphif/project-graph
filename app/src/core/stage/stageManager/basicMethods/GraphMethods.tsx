import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "../../stageObject/association/MutiTargetUndirectedEdge";

@service("graphMethods")
export class GraphMethods {
  constructor(protected readonly project: Project) {}

  isTree(node: Entity): boolean {
    const dfs = (node: Entity, visited: Entity[]): boolean => {
      if (visited.includes(node)) {
        return false;
      }
      visited.push(node);
      for (const child of this.nodeChildrenArray(node)) {
        if (!dfs(child, visited)) {
          return false;
        }
      }
      return true;
    };

    return dfs(node, []);
  }

  /** 获取节点连接的子节点数组，未排除自环 */
  nodeChildrenArray(node: Entity): Entity[] {
    const res: Entity[] = [];
    for (const edge of this.project.stageManager.getLineEdges()) {
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
  nodeParentArray(node: Entity): Entity[] {
    const res: Entity[] = [];
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (edge.target.uuid === node.uuid && edge.target.uuid !== edge.source.uuid) {
        res.push(edge.source);
      }
    }
    return res;
  }

  /**
   * 获取反向边集
   * @param edges
   */
  private getReversedEdgeDict(): Record<string, string> {
    const res: Record<string, string> = {};
    for (const edge of this.project.stageManager.getLineEdges()) {
      res[edge.target.uuid] = edge.source.uuid;
    }
    return res;
  }

  /**
   * 获取自己的祖宗节点
   * @param node 节点
   */
  getRoots(node: Entity): Entity[] {
    const reverseEdges = this.getReversedEdgeDict();
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

  isConnected(node: Entity, target: Entity): boolean {
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
   */
  getSuccessorSet(node: Entity, isHaveSelf: boolean = true): Entity[] {
    let result: Entity[] = []; // 存储可达节点的结果集
    const visited: Set<string> = new Set(); // 用于记录已经访问过的节点，避免重复访问

    // 深度优先搜索 (DFS) 实现
    const dfs = (currentNode: Entity): void => {
      if (visited.has(currentNode.uuid)) {
        return; // 如果节点已经被访问过，直接返回
      }
      visited.add(currentNode.uuid); // 标记当前节点为已访问
      result.push(currentNode); // 将当前节点加入结果集

      // 遍历当前节点的所有子节点
      const children = this.nodeChildrenArray(currentNode);
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
  getOneStepSuccessorSet(node: Entity): Entity[] {
    const result: Entity[] = []; // 存储可达节点的结果集
    for (const edge of this.project.stageManager.getLineEdges()) {
      if (edge.source === node && edge.target.uuid !== edge.source.uuid) {
        result.push(edge.target);
      }
    }
    return result;
  }

  getEdgesBetween(node1: Entity, node2: Entity): Edge[] {
    const result: Edge[] = []; // 存储连接两个节点的边的结果集
    for (const edge of this.project.stageManager.getEdges()) {
      if (edge.source === node1 && edge.target === node2) {
        result.push(edge);
      }
    }
    return result;
  }

  getEdgeFromTwoEntity(fromNode: Entity, toNode: Entity): Edge | null {
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
  getHyperEdgesByNode(node: Entity): MultiTargetUndirectedEdge[] {
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
  public getOutgoingEdges(node: Entity): Edge[] {
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
  public getIncomingEdges(node: Entity): Edge[] {
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
  public getNodesConnectedByHyperEdges(node: Entity): Entity[] {
    // 获取与节点相连的所有超边
    const hyperEdges = this.getHyperEdgesByNode(node);

    // 创建一个Set来存储结果，确保没有重复节点
    const connectedNodes = new Set<Entity>();

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
}
