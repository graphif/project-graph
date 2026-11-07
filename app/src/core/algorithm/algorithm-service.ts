import { service } from "@/core/interfaces/service";
import type { Project } from "@/core/project";
import { Settings } from "@/core/service/settings";
import type { ConnectableEntity } from "@/core/stage/stage-object/abstract/connectable-entity";
import { requestDAGLayout } from "@/platform/algorithms";
import { Vector } from "@graphif/data-structures";
import {
  computeDAGInputRevision,
  createDAGLayoutProjection,
  DAGLayoutResultError,
  resolveDAGLayoutOptions,
  validateDAGLayoutResponse,
  type DAGLayoutOptions,
} from "./dag-layout";
import type { LayoutDAGRequest, LayoutPosition } from "@/generated/mygo";

export type DAGLayoutResult = {
  movedCount: number;
  internalEdgeCount: number;
};

// 每个工程实例只接受最新一次布局请求，旧请求的结果会被丢弃。
const latestRequestIds = new WeakMap<Algorithms, string>();

function applyPositions(
  project: Project,
  entities: readonly ConnectableEntity[],
  positions: Map<string, LayoutPosition>,
): void {
  const entityById = new Map(entities.map((entity) => [entity.uuid, entity]));
  const previousLocations = new Map(
    entities.map((entity) => [entity, entity.collisionBox.getRectangle().location.clone()]),
  );
  const previousSectionCollision = Settings.isEnableSectionCollision;
  Settings.isEnableSectionCollision = false;
  let movedCount = 0;
  try {
    for (const [nodeId, position] of positions) {
      const entity = entityById.get(nodeId);
      if (!entity) continue;
      const location = entity.collisionBox.getRectangle().location;
      if (location.x === position.x && location.y === position.y) continue;
      entity.moveTo(new Vector(position.x, position.y));
      movedCount++;
    }
    if (movedCount > 0) project.historyManager.recordStep();
  } catch (error) {
    for (const [entity, location] of previousLocations) {
      entity.moveTo(location);
    }
    throw error;
  } finally {
    Settings.isEnableSectionCollision = previousSectionCollision;
  }
}

/**
 * 算法门面：负责投影数据、调用算法、校验结果并在一个事务里应用补丁。
 * 业务代码只通过 project.algorithms 使用算法，不直接拼桥消息。
 */
@service("algorithms")
export class Algorithms {
  constructor(private readonly project: Project) {}

  public async layoutDag(entities: ConnectableEntity[], options?: DAGLayoutOptions): Promise<DAGLayoutResult> {
    const resolvedOptions = resolveDAGLayoutOptions(options ?? {});
    const childrenOf = (entity: ConnectableEntity) => this.project.graphMethods.nodeChildrenArray(entity);
    const projection = createDAGLayoutProjection(entities, childrenOf);
    const requestId = crypto.randomUUID();
    const request: LayoutDAGRequest = {
      projectId: this.project.id,
      requestId,
      inputRevision: computeDAGInputRevision(projection, resolvedOptions),
      nodes: projection.nodes,
      edges: projection.edges,
      options: {
        horizontalSpacing: resolvedOptions.horizontalSpacing,
        verticalSpacing: resolvedOptions.verticalSpacing,
      },
    };

    latestRequestIds.set(this, requestId);
    const response = await requestDAGLayout(request);
    if (latestRequestIds.get(this) !== requestId) {
      throw new DAGLayoutResultError("布局请求已被更新的请求取代。");
    }
    const currentProjection = createDAGLayoutProjection(entities, childrenOf);
    if (computeDAGInputRevision(currentProjection, resolvedOptions) !== request.inputRevision) {
      throw new DAGLayoutResultError("计算期间舞台发生了变化，请重新执行布局。");
    }
    const allowedNodeIds = new Set(projection.nodes.map((node) => node.id));
    const positions = validateDAGLayoutResponse(request, response, allowedNodeIds);
    applyPositions(this.project, entities, positions);
    return { movedCount: positions.size, internalEdgeCount: projection.edges.length };
  }
}
