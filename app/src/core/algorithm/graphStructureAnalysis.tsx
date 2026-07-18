import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";

export type GraphStructureType = "isolated" | "path" | "star" | "tree" | "dag" | "cyclic";

export interface GraphStructure {
  id: string;
  type: GraphStructureType;
  nodes: ConnectableEntity[];
  associations: ConnectableAssociation[];
  nodeCount: number;
  edgeCount: number;
  title: string;
}

export const GRAPH_STRUCTURE_TYPE_LABELS: Record<GraphStructureType, string> = {
  isolated: "孤立节点",
  path: "链",
  star: "星形",
  tree: "树",
  dag: "DAG",
  cyclic: "含环图",
};

/**
 * 从画布实体与可连接关联中提取连通结构，并判定每个结构的基础图论类型。
 * 连通性按无向处理；SyncAssociation 等非 ConnectableAssociation 不参与。
 */
export function analyzeGraphStructures(
  entities: ConnectableEntity[],
  associations: ConnectableAssociation[],
  getTitle: (entity: ConnectableEntity) => string,
): GraphStructure[] {
  if (entities.length === 0) return [];

  const entityByUuid = new Map<string, ConnectableEntity>();
  for (const entity of entities) {
    entityByUuid.set(entity.uuid, entity);
  }

  const uf = new UnionFind();
  for (const entity of entities) {
    uf.ensure(entity.uuid);
  }

  const validAssociations: ConnectableAssociation[] = [];
  for (const association of associations) {
    const members = association.associationList.filter((item) => entityByUuid.has(item.uuid));
    if (members.length < 2 && !(association instanceof Edge && members.length >= 1)) {
      // 自环边仍参与结构
      if (!(association instanceof Edge && association.source.uuid === association.target.uuid)) {
        continue;
      }
    }
    validAssociations.push(association);
    if (association instanceof Edge) {
      uf.union(association.source.uuid, association.target.uuid);
    } else if (association instanceof MultiTargetUndirectedEdge) {
      const list = association.associationList.filter((item) => entityByUuid.has(item.uuid));
      for (let i = 1; i < list.length; i++) {
        uf.union(list[0].uuid, list[i].uuid);
      }
    } else if (association.associationList.length >= 2) {
      const list = association.associationList.filter((item) => entityByUuid.has(item.uuid));
      for (let i = 1; i < list.length; i++) {
        uf.union(list[0].uuid, list[i].uuid);
      }
    }
  }

  const componentNodeUuids = new Map<string, string[]>();
  for (const entity of entities) {
    const root = uf.find(entity.uuid);
    const list = componentNodeUuids.get(root);
    if (list) {
      list.push(entity.uuid);
    } else {
      componentNodeUuids.set(root, [entity.uuid]);
    }
  }

  const structures: GraphStructure[] = [];
  for (const uuids of componentNodeUuids.values()) {
    const nodeSet = new Set(uuids);
    const nodes = uuids.map((uuid) => entityByUuid.get(uuid)!);
    const componentAssociations = validAssociations.filter((association) => {
      if (association instanceof Edge) {
        return nodeSet.has(association.source.uuid) && nodeSet.has(association.target.uuid);
      }
      return association.associationList.some((item) => nodeSet.has(item.uuid));
    });

    const type = classifyComponent(nodes, componentAssociations, nodeSet);
    const titleEntity = pickTitleEntity(nodes, componentAssociations, nodeSet, type);
    const title = getTitle(titleEntity).trim() || titleEntity.uuid.slice(0, 8);
    const sortedUuids = [...uuids].sort();
    structures.push({
      id: sortedUuids.join(","),
      type,
      nodes,
      associations: componentAssociations,
      nodeCount: nodes.length,
      edgeCount: componentAssociations.length,
      title: title.length > 40 ? title.slice(0, 40) + "…" : title,
    });
  }

  structures.sort((a, b) => {
    if (b.nodeCount !== a.nodeCount) return b.nodeCount - a.nodeCount;
    return a.title.localeCompare(b.title, "zh-CN");
  });

  return structures;
}

function classifyComponent(
  nodes: ConnectableEntity[],
  associations: ConnectableAssociation[],
  nodeSet: Set<string>,
): GraphStructureType {
  if (nodes.length === 1) {
    const hasSelfLoop = associations.some(
      (a) => a instanceof Edge && a.source.uuid === a.target.uuid && nodeSet.has(a.source.uuid),
    );
    return hasSelfLoop ? "cyclic" : "isolated";
  }

  const undirectedAdj = buildUndirectedAdjacency(nodes, associations, nodeSet);
  const undirectedEdgeCount = countUndirectedSimpleEdges(undirectedAdj);
  const degrees = new Map<string, number>();
  let maxDegree = 0;
  for (const node of nodes) {
    const degree = undirectedAdj.get(node.uuid)?.size ?? 0;
    degrees.set(node.uuid, degree);
    if (degree > maxDegree) maxDegree = degree;
  }

  const onlyDirectedEdges = associations.every((association) => association instanceof Edge);
  const isUndirectedTree =
    onlyDirectedEdges &&
    associations.length === nodes.length - 1 &&
    undirectedEdgeCount === nodes.length - 1 &&
    isUndirectedConnected(nodes, undirectedAdj);

  if (isUndirectedTree) {
    if (maxDegree <= 2) return "path";
    if (isStarShape(degrees, nodes.length)) return "star";
  }

  if (onlyDirectedEdges && isDirectedTree(nodes, associations, nodeSet)) return "tree";
  if (onlyDirectedEdges && isDirectedAcyclic(nodes, associations, nodeSet)) return "dag";
  return "cyclic";
}

function buildUndirectedAdjacency(
  nodes: ConnectableEntity[],
  associations: ConnectableAssociation[],
  nodeSet: Set<string>,
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const node of nodes) {
    adj.set(node.uuid, new Set());
  }

  const addEdge = (a: string, b: string) => {
    if (a === b) return;
    if (!nodeSet.has(a) || !nodeSet.has(b)) return;
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  };

  for (const association of associations) {
    if (association instanceof Edge) {
      addEdge(association.source.uuid, association.target.uuid);
    } else {
      const list = association.associationList.filter((item) => nodeSet.has(item.uuid));
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          addEdge(list[i].uuid, list[j].uuid);
        }
      }
    }
  }

  return adj;
}

function countUndirectedSimpleEdges(adj: Map<string, Set<string>>): number {
  let count = 0;
  for (const [uuid, neighbors] of adj) {
    for (const neighbor of neighbors) {
      if (uuid < neighbor) count++;
    }
  }
  return count;
}

function isUndirectedConnected(nodes: ConnectableEntity[], adj: Map<string, Set<string>>): boolean {
  if (nodes.length === 0) return false;
  const visited = new Set<string>();
  const stack = [nodes[0].uuid];
  visited.add(nodes[0].uuid);
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }
  return visited.size === nodes.length;
}

function isStarShape(degrees: Map<string, number>, n: number): boolean {
  if (n < 3) return false;
  let centerCount = 0;
  for (const degree of degrees.values()) {
    if (degree === n - 1) centerCount++;
    else if (degree !== 1) return false;
  }
  return centerCount === 1;
}

function getDirectedChildren(associations: ConnectableAssociation[], nodeSet: Set<string>): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const uuid of nodeSet) {
    children.set(uuid, []);
  }
  for (const association of associations) {
    if (!(association instanceof Edge)) continue;
    if (!nodeSet.has(association.source.uuid) || !nodeSet.has(association.target.uuid)) continue;
    if (association.source.uuid === association.target.uuid) continue;
    children.get(association.source.uuid)?.push(association.target.uuid);
  }
  return children;
}

function getDirectedInDegree(associations: ConnectableAssociation[], nodeSet: Set<string>): Map<string, number> {
  const inDegree = new Map<string, number>();
  for (const uuid of nodeSet) {
    inDegree.set(uuid, 0);
  }
  for (const association of associations) {
    if (!(association instanceof Edge)) continue;
    if (!nodeSet.has(association.source.uuid) || !nodeSet.has(association.target.uuid)) continue;
    if (association.source.uuid === association.target.uuid) {
      // 自环使入度异常，后续 isDirectedTree / isDirectedAcyclic 会判失败
      inDegree.set(association.target.uuid, (inDegree.get(association.target.uuid) ?? 0) + 1);
      continue;
    }
    inDegree.set(association.target.uuid, (inDegree.get(association.target.uuid) ?? 0) + 1);
  }
  return inDegree;
}

function isDirectedTree(
  nodes: ConnectableEntity[],
  associations: ConnectableAssociation[],
  nodeSet: Set<string>,
): boolean {
  if (nodes.length === 0) return false;

  // 有自环则不是树
  for (const association of associations) {
    if (association instanceof Edge && association.source.uuid === association.target.uuid) {
      return false;
    }
  }

  const inDegree = getDirectedInDegree(associations, nodeSet);
  const children = getDirectedChildren(associations, nodeSet);

  let root: string | null = null;
  for (const node of nodes) {
    const deg = inDegree.get(node.uuid) ?? 0;
    if (deg > 1) return false;
    if (deg === 0) {
      if (root !== null) return false;
      root = node.uuid;
    }
  }
  if (root === null) return false;

  const visited = new Set<string>();
  const dfs = (uuid: string): boolean => {
    if (visited.has(uuid)) return false;
    visited.add(uuid);
    for (const child of children.get(uuid) ?? []) {
      if (!dfs(child)) return false;
    }
    return true;
  };

  if (!dfs(root)) return false;
  return visited.size === nodeSet.size;
}

function isDirectedAcyclic(
  nodes: ConnectableEntity[],
  associations: ConnectableAssociation[],
  nodeSet: Set<string>,
): boolean {
  if (nodes.length === 0) return false;

  for (const association of associations) {
    if (association instanceof Edge && association.source.uuid === association.target.uuid) {
      return false;
    }
  }

  const inDegree = getDirectedInDegree(associations, nodeSet);
  const children = getDirectedChildren(associations, nodeSet);

  const queue: string[] = [];
  for (const node of nodes) {
    if ((inDegree.get(node.uuid) ?? 0) === 0) {
      queue.push(node.uuid);
    }
  }

  let count = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    count++;
    for (const child of children.get(current) ?? []) {
      const next = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, next);
      if (next === 0) queue.push(child);
    }
  }

  return count === nodes.length;
}

function pickTitleEntity(
  nodes: ConnectableEntity[],
  associations: ConnectableAssociation[],
  nodeSet: Set<string>,
  type: GraphStructureType,
): ConnectableEntity {
  if (nodes.length === 1) return nodes[0];

  const inDegree = getDirectedInDegree(associations, nodeSet);

  if (type === "star") {
    const undirectedAdj = buildUndirectedAdjacency(nodes, associations, nodeSet);
    let center: ConnectableEntity | null = null;
    let maxDegree = -1;
    for (const node of nodes) {
      const degree = undirectedAdj.get(node.uuid)?.size ?? 0;
      if (degree > maxDegree) {
        maxDegree = degree;
        center = node;
      }
    }
    if (center) return center;
  }

  if (type === "tree" || type === "path" || type === "dag") {
    const roots = nodes.filter((node) => (inDegree.get(node.uuid) ?? 0) === 0);
    if (roots.length > 0) {
      return roots.sort((a, b) => a.uuid.localeCompare(b.uuid))[0];
    }
  }

  return nodes.slice().sort((a, b) => a.uuid.localeCompare(b.uuid))[0];
}

class UnionFind {
  private parent = new Map<string, string>();

  ensure(x: string) {
    if (!this.parent.has(x)) this.parent.set(x, x);
  }

  find(x: string): string {
    this.ensure(x);
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let current = x;
    while (current !== root) {
      const next = this.parent.get(current)!;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}
