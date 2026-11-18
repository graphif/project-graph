import type { LayoutDAGRequest, LayoutDAGResponse, LayoutEdge, LayoutNode, LayoutPosition } from "@/generated/mygo";
import type { ConnectableEntity } from "@/core/stage/stage-object/abstract/connectable-entity";

export const DEFAULT_HORIZONTAL_SPACING = 150;
export const DEFAULT_VERTICAL_SPACING = 100;

export type DAGLayoutOptions = {
  horizontalSpacing?: number;
  verticalSpacing?: number;
};

export type ResolvedDAGLayoutOptions = {
  horizontalSpacing: number;
  verticalSpacing: number;
};

export type DAGLayoutProjection = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
};

export class DAGLayoutResultError extends Error {
  readonly name = "DAGLayoutResultError";
}

export function resolveDAGLayoutOptions(options: DAGLayoutOptions = {}): ResolvedDAGLayoutOptions {
  const horizontalSpacing = options.horizontalSpacing ?? DEFAULT_HORIZONTAL_SPACING;
  const verticalSpacing = options.verticalSpacing ?? DEFAULT_VERTICAL_SPACING;
  if (!Number.isFinite(horizontalSpacing) || horizontalSpacing < 0) {
    throw new DAGLayoutResultError("horizontalSpacing 必须是有限的非负数。");
  }
  if (!Number.isFinite(verticalSpacing) || verticalSpacing < 0) {
    throw new DAGLayoutResultError("verticalSpacing 必须是有限的非负数。");
  }
  return { horizontalSpacing, verticalSpacing };
}

/**
 * 锁定的 Section 及其内部物体不参与移动。
 */
export function isDAGLayoutLocked(entity: ConnectableEntity): boolean {
  if ((entity as { locked?: boolean }).locked === true) return true;
  return entity.nearestLockedAncestorSection !== null;
}

/**
 * 把参与布局的实体投影成算法需要的最小快照，不携带附件、富文本或服务实例。
 */
export function createDAGLayoutProjection(
  entities: readonly ConnectableEntity[],
  childrenOf: (entity: ConnectableEntity) => readonly ConnectableEntity[],
): DAGLayoutProjection {
  const included = new Set<string>();
  const nodes: LayoutNode[] = [];
  for (const entity of entities) {
    included.add(entity.uuid);
    const rectangle = entity.collisionBox.getRectangle();
    nodes.push({
      id: entity.uuid,
      x: rectangle.location.x,
      y: rectangle.location.y,
      width: rectangle.width,
      height: rectangle.height,
      locked: isDAGLayoutLocked(entity),
    });
  }
  const edges: LayoutEdge[] = [];
  for (const entity of entities) {
    for (const child of childrenOf(entity)) {
      if (!included.has(child.uuid)) continue;
      edges.push({ id: `${entity.uuid}->${child.uuid}#${edges.length}`, from: entity.uuid, to: child.uuid });
    }
  }
  return { nodes, edges };
}

/**
 * 输入版本号由拓扑、坐标、尺寸、锁定状态与布局选项共同决定，
 * 用户在计算期间改动舞台时版本号会变化，过期结果因此可以被丢弃。
 */
export function computeDAGInputRevision(projection: DAGLayoutProjection, options: ResolvedDAGLayoutOptions): string {
  const parts: string[] = [];
  for (const node of projection.nodes) {
    parts.push(`${node.id}|${node.x}|${node.y}|${node.width}|${node.height}|${node.locked ? 1 : 0}`);
  }
  parts.push("//");
  for (const edge of projection.edges) {
    parts.push(`${edge.from}|${edge.to}`);
  }
  parts.push("//");
  parts.push(`${options.horizontalSpacing}|${options.verticalSpacing}`);
  return hashDAGInput(parts.join("\n"));
}

function hashDAGInput(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${value.length.toString(16)}-${hash.toString(16).padStart(8, "0")}`;
}

/**
 * 校验算法返回值：必须属于同一个请求、节点集合受限、坐标有限且不重复。
 */
export function validateDAGLayoutResponse(
  request: LayoutDAGRequest,
  response: LayoutDAGResponse,
  allowedNodeIds: ReadonlySet<string>,
): Map<string, LayoutPosition> {
  if (response.projectId !== request.projectId) {
    throw new DAGLayoutResultError("布局结果属于另一个工程。");
  }
  if (response.requestId !== request.requestId) {
    throw new DAGLayoutResultError("布局结果属于另一次请求。");
  }
  if (response.inputRevision !== request.inputRevision) {
    throw new DAGLayoutResultError("布局结果基于过期的输入。");
  }
  const positions = new Map<string, LayoutPosition>();
  for (const position of response.positions) {
    if (!allowedNodeIds.has(position.id)) {
      throw new DAGLayoutResultError(`布局结果包含未知节点：${position.id}`);
    }
    if (positions.has(position.id)) {
      throw new DAGLayoutResultError(`布局结果包含重复节点：${position.id}`);
    }
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new DAGLayoutResultError(`布局结果包含非法坐标：${position.id}`);
    }
    positions.set(position.id, position);
  }
  return positions;
}
