import { Project, service } from "@/core/Project";
import { CopyEngineUtils } from "@/core/service/dataManageService/copyEngine/copyEngineUtils";
import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import {
  SyncAssociation,
  SyncableKey,
  TwinSectionAssociation,
} from "@/core/stage/stageObject/association/SyncAssociation";
import { Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";

/**
 * 孪生同步关系管理器
 *
 * 负责：
 * 1. 创建孪生节点（从已有节点派生出新节点，并建立 SyncAssociation）
 * 2. 触发同步（当某个成员字段变化后，同步至同组其他成员）
 * 3. 查询某节点所在的 SyncAssociation
 */
@service("syncAssociationManager")
export class StageSyncAssociationManager {
  private isApplyingTwinSectionChange = false;

  constructor(private readonly project: Project) {}

  public createTwinsFromSelectedEntities(): void {
    const selectedEntities = this.project.stageManager.getSelectedEntities();
    const createdTwins: StageObject[] = [];
    for (const entity of selectedEntities) {
      if (entity instanceof TextNode) {
        createdTwins.push(this.createTwinTextNode(entity));
      } else if (entity instanceof Section) {
        createdTwins.push(this.createTwinSection(entity));
      }
    }

    if (createdTwins.length === 0) return;

    this.project.stageManager.clearSelectAll();
    for (const twin of createdTwins) {
      twin.isSelected = true;
    }
  }

  public getTwinSectionAssociations(): TwinSectionAssociation[] {
    return this.project.stage.filter((obj) => obj instanceof TwinSectionAssociation) as TwinSectionAssociation[];
  }

  /**
   * 给定一个实体，返回它所参与的所有孪生分组框关系中对应的根分组框对列表。
   *
   * 由于多次孪生只记录直接配对（A↔A'、A↔A''），A' 和 A'' 之间没有直接映射，
   * 因此先用 BFS 展开整个等价类，收集所有涉及的根分组框，再以"当前节点所在根框"
   * 为起点，与其余每个根框各组成一对返回，供渲染器逐对画虚线。
   */
  public getTwinSectionRootPairsForEntity(entity: Entity): Array<[Section, Section]> {
    const allEntities = this.project.stageManager.getEntities();

    // BFS 展开等价类，同时收集每个成员所属的根分组框
    const visited = new Set<string>([entity.uuid]);
    const queue: Entity[] = [entity];
    // uuid → 该实体所在的根分组框（sourceSectionUuid 或 twinSectionUuid）
    const rootOfEntity = new Map<string, Section>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const tsa of this.getTwinSectionAssociations()) {
        for (const [sourceUuid, twinUuid] of tsa.entityUuidPairs) {
          let neighborUuid: string | null = null;
          if (sourceUuid === current.uuid) neighborUuid = twinUuid;
          else if (twinUuid === current.uuid) neighborUuid = sourceUuid;

          if (!neighborUuid || visited.has(neighborUuid)) continue;
          visited.add(neighborUuid);
          const neighbor = allEntities.find((e) => e.uuid === neighborUuid);
          if (neighbor) {
            queue.push(neighbor);
          }
        }

        // 记录 current 在本 TSA 中所属的根框
        const isInSource = tsa.entityUuidPairs.some(([s]) => s === current.uuid);
        const isInTwin = tsa.entityUuidPairs.some(([, t]) => t === current.uuid);
        if (isInSource || isInTwin) {
          const rootUuid = isInSource ? tsa.sourceSectionUuid : tsa.twinSectionUuid;
          if (!rootOfEntity.has(current.uuid)) {
            const root = allEntities.find((e) => e.uuid === rootUuid);
            if (root instanceof Section) rootOfEntity.set(current.uuid, root);
          }
        }
      }
    }

    // 找出当前 entity 所在的根框，与其余所有根框各组一对
    const myRoot = rootOfEntity.get(entity.uuid);
    if (!myRoot) return [];

    const result: Array<[Section, Section]> = [];
    const seen = new Set<string>();
    for (const [, root] of rootOfEntity) {
      if (root === myRoot || seen.has(root.uuid)) continue;
      seen.add(root.uuid);
      result.push([myRoot, root]);
    }
    return result;
  }

  /** 创建一个完整内容副本，并建立分组框内所有实体的一一映射。 */
  public createTwinSection(source: Section): Section {
    const sourceObjects = CopyEngineUtils.getAllStageObjectFromEntities(this.project, [source]);
    const { stageObjects: twinObjects, entityPairs } = this.cloneStageObjects(sourceObjects);
    const twin = entityPairs.get(source.uuid);
    if (!(twin instanceof Section)) {
      throw new Error("Unable to create the twin section.");
    }

    const offset = new Vector(source.rectangle.size.x + 60, 0);
    twin.move(offset);
    this.project.stage.push(...twinObjects);
    this.connectTwinTextNodes(entityPairs);

    const association = new TwinSectionAssociation(this.project, {
      sourceSectionUuid: source.uuid,
      twinSectionUuid: twin.uuid,
      entityUuidPairs: this.toEntityUuidPairs(entityPairs),
    });
    this.project.stage.push(association);
    this.project.stageManager.updateReferences();
    this.project.historyManager.recordStep();
    return twin;
  }

  /** 用户移动框内节点时，让所有对应节点以相同位移移动。 */
  public onEntityMoved(entity: Entity, delta: Vector): void {
    if (this.isApplyingTwinSectionChange) return;
    if (this.isTwinSectionRoot(entity)) return;
    const counterparts = this.getTwinSectionCounterparts(entity);
    if (counterparts.length === 0) return;

    this.applyTwinSectionChange(() => {
      for (const counterpart of counterparts) {
        counterpart.move(delta);
        this.adjustParentSections(counterpart);
      }
    });
  }

  /** 当两个孪生分组框内的节点新增连线时，为等价类中所有其他框创建对应的镜像连线。 */
  public onAssociationCreated(association: Edge | MultiTargetUndirectedEdge): void {
    if (this.isApplyingTwinSectionChange) return;

    // 对连线每个端点，用 BFS 找出等价类里的全部对应方
    const memberCounterpartsList = association.associationList.map((member) =>
      member instanceof Entity ? this.getTwinSectionCounterparts(member) : [],
    );

    // 所有端点都必须有相同数量的对应方，且数量 > 0
    const counterpartCount = memberCounterpartsList[0]?.length ?? 0;
    if (counterpartCount === 0) return;
    if (!memberCounterpartsList.every((list) => list.length === counterpartCount)) return;

    this.applyTwinSectionChange(() => {
      // 按索引对齐：第 i 组对应方来自同一个孪生框
      for (let i = 0; i < counterpartCount; i++) {
        const counterpartMembers = memberCounterpartsList.map((list) => list[i]);
        if (!counterpartMembers.every((m): m is ConnectableEntity => m instanceof ConnectableEntity)) continue;

        const twin = (
          deserialize(serialize([association]), this.project) as Array<Edge | MultiTargetUndirectedEdge>
        )[0];
        if (!twin) continue;
        twin.uuid = crypto.randomUUID();
        twin.associationList = counterpartMembers;
        twin.isSelected = false;
        this.project.stageManager.add(twin);
      }
    });
  }

  /** 删除连线时，删除等价类中所有其他框里端点对应的镜像连线。 */
  public onAssociationDeleted(association: Edge | MultiTargetUndirectedEdge): void {
    if (this.isApplyingTwinSectionChange) return;

    const memberCounterpartsList = association.associationList.map((member) =>
      member instanceof Entity ? this.getTwinSectionCounterparts(member) : [],
    );
    const counterpartCount = memberCounterpartsList[0]?.length ?? 0;
    if (counterpartCount === 0) return;
    if (!memberCounterpartsList.every((list) => list.length === counterpartCount)) return;

    this.applyTwinSectionChange(() => {
      for (let i = 0; i < counterpartCount; i++) {
        const counterpartMembers = memberCounterpartsList.map((list) => list[i]);
        if (!counterpartMembers.every((m): m is ConnectableEntity => m instanceof ConnectableEntity)) continue;

        const twin = this.project.stageManager.getAssociations().find((candidate) => {
          if (candidate.constructor !== association.constructor) return false;
          if (!(candidate instanceof Edge) && !(candidate instanceof MultiTargetUndirectedEdge)) return false;
          return candidate.associationList.every((member, idx) => member === counterpartMembers[idx]);
        });
        if (!twin) continue;

        this.project.stageManager.delete(twin);
        this.project.stageManager.updateReferences();
      }
    });
  }

  /** 同步有向连线后续调整过的端点位置，覆盖等价类中所有其他框的镜像连线。 */
  public onEdgeConnectLocationChanged(edge: Edge): void {
    if (this.isApplyingTwinSectionChange) return;

    const memberCounterpartsList = edge.associationList.map((member) =>
      member instanceof Entity ? this.getTwinSectionCounterparts(member) : [],
    );
    const counterpartCount = memberCounterpartsList[0]?.length ?? 0;
    if (counterpartCount === 0) return;
    if (!memberCounterpartsList.every((list) => list.length === counterpartCount)) return;

    this.applyTwinSectionChange(() => {
      for (let i = 0; i < counterpartCount; i++) {
        const counterpartMembers = memberCounterpartsList.map((list) => list[i]);
        if (!counterpartMembers.every((m): m is ConnectableEntity => m instanceof ConnectableEntity)) continue;

        const twin = this.project.stageManager.getAssociations().find((candidate) => {
          if (candidate.constructor !== edge.constructor || !(candidate instanceof Edge)) return false;
          return candidate.associationList.every((member, idx) => member === counterpartMembers[idx]);
        }) as Edge | undefined;
        if (!twin) continue;

        twin.sourceRectangleRate = edge.sourceRectangleRate.clone();
        twin.targetRectangleRate = edge.targetRectangleRate.clone();
      }
    });
  }

  /** 分组框标题、颜色、详情的修改同步到所有对应方。 */
  public onSectionPropertyChanged(section: Section, key: "text" | "color" | "details"): void {
    if (this.isApplyingTwinSectionChange) return;
    const counterparts = this.getTwinSectionCounterparts(section);
    const sectionCounterparts = counterparts.filter((c): c is Section => c instanceof Section);
    if (sectionCounterparts.length === 0) return;

    this.applyTwinSectionChange(() => {
      for (const counterpart of sectionCounterparts) {
        if (key === "text") {
          counterpart.rename(section.text);
        } else if (key === "color") {
          counterpart.color = section.color;
        } else {
          counterpart.details = section.details;
        }
      }
    });
  }

  /** 分组框内实体的父级变化：新加入时克隆，离开时删除另一侧对应项。覆盖所有孪生关系。 */
  public onEntityParentChanged(entity: Entity, previousParent: Section | null, nextParent: Section | null): void {
    if (this.isApplyingTwinSectionChange || previousParent === nextParent) return;

    for (const tsa of this.getTwinSectionAssociations()) {
      const previousCounterpart = previousParent ? this.getCounterpartInAssociation(previousParent, tsa) : null;
      const nextCounterpart = nextParent ? this.getCounterpartInAssociation(nextParent, tsa) : null;
      const counterpart = this.getCounterpartInAssociation(entity, tsa);

      if (!previousCounterpart && nextCounterpart instanceof Section && !counterpart) {
        this.applyTwinSectionChange(() => this.cloneEntityIntoTwinSection(entity, nextParent!, nextCounterpart));
        continue;
      }

      if (previousCounterpart instanceof Section && counterpart) {
        this.applyTwinSectionChange(() => {
          if (nextCounterpart instanceof Section) {
            this.project.sectionInOutManager.attachEntityToSection(counterpart, nextCounterpart);
          } else {
            this.removeTwinSectionEntity(counterpart);
          }
        });
      }
    }
  }

  /**
   * 通用属性同步：当孪生分组框内某个实体（或连线）的属性发生变化时，
   * 对等价类中所有其他对应方执行相同的操作。
   *
   * @param entity 发生变化的实体（Entity 或 Association）
   * @param apply  接受对应方作为参数的同步回调，类型与 entity 相同
   *
   * 用法示例（同步 ImageNode 的 scale）：
   *   syncTwinSectionProperty(imageNode, (counterpart) => {
   *     counterpart.scale = imageNode.scale;
   *     counterpart.scaleUpdate(0); // 刷新碰撞箱
   *   });
   */
  public syncTwinSectionProperty<T extends Entity>(entity: T, apply: (counterpart: T) => void): void {
    if (this.isApplyingTwinSectionChange) return;
    const counterparts = this.getTwinSectionCounterparts(entity);
    if (counterparts.length === 0) return;
    this.applyTwinSectionChange(() => {
      for (const counterpart of counterparts) {
        if (counterpart instanceof (entity.constructor as new (...args: unknown[]) => T)) {
          apply(counterpart as T);
        }
      }
    });
  }

  /**
   * 通用属性同步（连线版本）：当孪生分组框内某条连线的属性发生变化时，
   * 对等价类中所有其他对应方执行相同的操作。
   *
   * 通过 BFS 展开连线端点的等价类，找到每个孪生框里对应的镜像连线，再执行 apply。
   */
  public syncTwinSectionAssociationProperty<T extends Edge | MultiTargetUndirectedEdge>(
    association: T,
    apply: (counterpart: T) => void,
  ): void {
    if (this.isApplyingTwinSectionChange) return;

    const memberCounterpartsList = association.associationList.map((member) =>
      member instanceof Entity ? this.getTwinSectionCounterparts(member) : [],
    );
    const counterpartCount = memberCounterpartsList[0]?.length ?? 0;
    if (counterpartCount === 0) return;
    if (!memberCounterpartsList.every((list) => list.length === counterpartCount)) return;

    this.applyTwinSectionChange(() => {
      for (let i = 0; i < counterpartCount; i++) {
        const counterpartMembers = memberCounterpartsList.map((list) => list[i]);
        const twin = this.project.stageManager.getAssociations().find((candidate) => {
          if (candidate.constructor !== association.constructor) return false;
          if (!(candidate instanceof Edge) && !(candidate instanceof MultiTargetUndirectedEdge)) return false;
          return candidate.associationList.every((member, idx) => member === counterpartMembers[idx]);
        }) as T | undefined;
        if (twin) apply(twin);
      }
    });
  }

  /**
   * 获取所有 SyncAssociation 对象
   */
  public getSyncAssociations(): SyncAssociation[] {
    return this.project.stage.filter((obj) => obj instanceof SyncAssociation) as SyncAssociation[];
  }

  /**
   * 获取某个 StageObject 所在的所有 SyncAssociation
   */
  public getSyncAssociationsByMember(member: StageObject): SyncAssociation[] {
    return this.getSyncAssociations().filter((sa) => sa.associationList.includes(member));
  }

  /**
   * 获取某个 StageObject 的所有孪生兄弟（同组中除自身以外的成员）
   */
  public getSyncSiblings(member: StageObject): StageObject[] {
    const result: StageObject[] = [];
    for (const sa of this.getSyncAssociationsByMember(member)) {
      for (const other of sa.associationList) {
        if (other !== member && !result.includes(other)) {
          result.push(other);
        }
      }
    }
    return result;
  }

  /**
   * 从已有的 TextNode 创建一个孪生节点。
   *
   * 行为：
   * - 新节点内容（text、color、details）与原节点相同
   * - 新节点位置偏移在原节点右侧
   * - 如果原节点已在某个 SyncAssociation 中，新节点直接加入该组；否则新建一个 SyncAssociation
   *
   * @param source 作为孪生来源的节点
   */
  public createTwinTextNode(source: TextNode): TextNode {
    // 计算新节点位置（在原节点右侧偏移）
    const sourceRect = source.rectangle;
    const offset = new Vector(sourceRect.size.x + 60, 0);
    const newLocation = sourceRect.location.clone().add(offset);

    // 创建新节点，复制内容
    const twin = new TextNode(this.project, {
      text: source.text,
      collisionBox: new CollisionBox([new Rectangle(newLocation, Vector.getZero())]),
      color: source.color.clone(),
    });
    // 复制 details（富文本详情）
    twin.details = source.details;
    // 调整大小使其与内容匹配
    twin.forceAdjustSizeByText();

    this.project.stageManager.add(twin);

    // 查找原节点是否已在某个 SyncAssociation 中
    const existingSyncAssociations = this.getSyncAssociationsByMember(source);

    if (existingSyncAssociations.length > 0) {
      // 加入已有的第一个孪生组
      existingSyncAssociations[0].associationList.push(twin);
    } else {
      // 新建一个 SyncAssociation，包含原节点和新节点
      const syncAssociation = new SyncAssociation(this.project, {
        associationList: [source, twin],
        keys: ["text", "color", "details"] as SyncableKey[],
      });
      this.project.stageManager.add(syncAssociation);
    }

    this.project.historyManager.recordStep();
    return twin;
  }

  /**
   * 当某个成员的指定字段发生变化时，将变化同步给同组所有其他成员。
   *
   * 使用 syncingSet 防止循环同步：
   * - A 修改 → 同步 B、C，将 A 加入 syncingSet
   * - B 收到同步写入时，发现 B 也在某个 SyncAssociation 中，但 A 已在 syncingSet 中，跳过
   *
   * @param source 发生变化的源节点
   * @param key 发生变化的字段名
   * @param syncingSet 当前同步会话中已处理过的节点 UUID 集合（防止循环）
   */
  public syncFrom(source: StageObject, key: SyncableKey, syncingSet: Set<string> = new Set()): void {
    // 将自身标记为"本轮已处理"
    syncingSet.add(source.uuid);

    for (const sa of this.getSyncAssociationsByMember(source)) {
      if (!sa.keys.includes(key)) continue;

      for (const member of sa.associationList) {
        if (member === source) continue;
        if (syncingSet.has(member.uuid)) continue;

        if (key === "text" && member instanceof TextNode) {
          // text 字段通过 rename() 同步，rename() 会重新计算节点大小
          // 设置 _isSyncing 标志防止 rename() 内部再次触发 syncFrom 造成循环
          member._isSyncing = true;
          member.rename((source as any)[key]);
          member._isSyncing = false;
        } else if (key in source && key in member) {
          // color / details 等字段直接赋值
          (member as any)[key] = (source as any)[key];
        }

        // 递归：若该成员也在其他 SyncAssociation 中，继续向外传播
        syncingSet.add(member.uuid);
        this.syncFrom(member, key, syncingSet);
      }
    }
  }

  /**
   * 当某个 StageObject 被从舞台删除时，从所有 SyncAssociation 中移除它。
   * 若某个 SyncAssociation 成员数量减少到 1 以下，则整个关系对象也被删除。
   *
   * 由 StageDeleteManager 调用。
   *
   * @param deleted 被删除的对象
   */
  public onStageObjectDeleted(deleted: StageObject): void {
    const toDeleteSyncAssociations: SyncAssociation[] = [];

    for (const sa of this.getSyncAssociationsByMember(deleted)) {
      // 从成员列表中移除被删除的对象
      const idx = sa.associationList.indexOf(deleted);
      if (idx !== -1) {
        sa.associationList.splice(idx, 1);
      }

      // 成员数量不足 2，孪生关系失去意义，整个关系对象也要删除
      if (sa.associationList.length < 2) {
        toDeleteSyncAssociations.push(sa);
      }
    }

    for (const sa of toDeleteSyncAssociations) {
      this.project.stageManager.delete(sa);
    }

    if (!(deleted instanceof Entity) || this.isApplyingTwinSectionChange) return;
    const counterparts = this.getTwinSectionCounterparts(deleted);
    if (counterparts.length === 0) return;
    this.applyTwinSectionChange(() => {
      for (const counterpart of counterparts) {
        this.removeTwinSectionEntity(counterpart);
      }
    });
  }

  private cloneEntityIntoTwinSection(entity: Entity, parent: Section, twinParent: Section): void {
    const sourceObjects = CopyEngineUtils.getAllStageObjectFromEntities(this.project, [entity]);
    const { stageObjects, entityPairs } = this.cloneStageObjects(sourceObjects);
    const twin = entityPairs.get(entity.uuid);
    if (!twin) return;

    const offset = twinParent.rectangle.location.clone().subtract(parent.rectangle.location);
    twin.move(offset);
    this.project.stage.push(...stageObjects);
    this.connectTwinTextNodes(entityPairs);
    this.project.sectionInOutManager.attachEntityToSection(twin, twinParent);

    const relation = this.getTwinSectionAssociationBySection(parent);
    if (relation) {
      relation.entityUuidPairs.push(...this.toEntityUuidPairs(entityPairs));
    }
    this.project.stageManager.updateReferences();
  }

  private cloneStageObjects(sourceObjects: StageObject[]): {
    stageObjects: StageObject[];
    entityPairs: Map<string, Entity>;
  } {
    const stageObjects = deserialize(serialize(sourceObjects), this.project) as StageObject[];
    const sourceEntities = sourceObjects.filter((object): object is Entity => object instanceof Entity);
    const clonedEntitiesByOldUuid = new Map(
      stageObjects
        .filter((object): object is Entity => object instanceof Entity)
        .map((entity) => [entity.uuid, entity]),
    );
    const entityPairs = new Map<string, Entity>();

    for (const source of sourceEntities) {
      const twin = clonedEntitiesByOldUuid.get(source.uuid);
      if (twin) entityPairs.set(source.uuid, twin);
    }

    for (const section of stageObjects.filter((object): object is Section => object instanceof Section)) {
      section.children = section.children.map((child) => clonedEntitiesByOldUuid.get(child.uuid) ?? child);
    }
    for (const association of stageObjects.filter(
      (object): object is ConnectableAssociation => object instanceof ConnectableAssociation,
    )) {
      association.uuid = crypto.randomUUID();
      if (association instanceof Edge) {
        association.source = clonedEntitiesByOldUuid.get(association.source.uuid) as typeof association.source;
        association.target = clonedEntitiesByOldUuid.get(association.target.uuid) as typeof association.target;
      } else if (association instanceof MultiTargetUndirectedEdge) {
        association.associationList = association.associationList.map(
          (member) => clonedEntitiesByOldUuid.get(member.uuid) as typeof member,
        );
      }
    }
    for (const twin of clonedEntitiesByOldUuid.values()) {
      twin.uuid = crypto.randomUUID();
      twin.isSelected = false;
    }
    return { stageObjects, entityPairs };
  }

  private toEntityUuidPairs(entityPairs: Map<string, Entity>): Array<[string, string]> {
    return [...entityPairs.entries()].map(([sourceUuid, twin]) => [sourceUuid, twin.uuid]);
  }

  private connectTwinTextNodes(entityPairs: Map<string, Entity>): void {
    for (const [sourceUuid, twin] of entityPairs) {
      const source = this.project.stageManager.getEntities().find((entity) => entity.uuid === sourceUuid);
      if (!(source instanceof TextNode) || !(twin instanceof TextNode)) continue;

      const existingAssociation = this.getSyncAssociationsByMember(source)[0];
      if (existingAssociation) {
        existingAssociation.associationList.push(twin);
      } else {
        this.project.stage.push(
          new SyncAssociation(this.project, {
            associationList: [source, twin],
            keys: ["text", "color", "details"],
          }),
        );
      }
    }
  }

  private getTwinSectionAssociationBySection(section: Section): TwinSectionAssociation | null {
    return (
      this.getTwinSectionAssociations().find((association) =>
        association.entityUuidPairs.some(
          ([sourceUuid, twinUuid]) => sourceUuid === section.uuid || twinUuid === section.uuid,
        ),
      ) ?? null
    );
  }

  private isTwinSectionRoot(entity: Entity): boolean {
    return this.getTwinSectionAssociations().some(
      (association) => entity.uuid === association.sourceSectionUuid || entity.uuid === association.twinSectionUuid,
    );
  }

  private adjustParentSections(entity: Entity): void {
    let current = entity.parentSection;
    while (current) {
      current.adjustLocationAndSize();
      current = current.parentSection;
    }
  }

  /**
   * 获取某个实体在所有孪生分组框关系中的全部对应方（等价类中除自身外的所有成员）。
   *
   * 由于多次孪生产生的 TwinSectionAssociation 只记录直接配对（A↔A'、A↔A''），
   * A' 和 A'' 之间没有直接映射，需要通过 A 作为桥梁间接推导。
   * 因此这里用 BFS 把整个等价类全部展开：从 entity 出发，沿所有 TSA 的直接配对
   * 不断扩展，直到没有新成员为止，最终返回除自身外的全部成员。
   */
  private getTwinSectionCounterparts(entity: Entity): Entity[] {
    const allEntities = this.project.stageManager.getEntities();
    const visited = new Set<string>([entity.uuid]);
    const queue: Entity[] = [entity];
    const result: Entity[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const association of this.getTwinSectionAssociations()) {
        for (const [sourceUuid, twinUuid] of association.entityUuidPairs) {
          let neighborUuid: string | null = null;
          if (sourceUuid === current.uuid) neighborUuid = twinUuid;
          else if (twinUuid === current.uuid) neighborUuid = sourceUuid;

          if (neighborUuid && !visited.has(neighborUuid)) {
            visited.add(neighborUuid);
            const neighbor = allEntities.find((e) => e.uuid === neighborUuid);
            if (neighbor) {
              result.push(neighbor);
              queue.push(neighbor);
            }
          }
        }
      }
    }
    return result;
  }

  /**
   * 在指定的单个 TwinSectionAssociation 中查找某实体的对应方。
   * 用于连线/父级变化等需要按关系逐一处理的场景。
   */
  private getCounterpartInAssociation(entity: Entity, tsa: TwinSectionAssociation): Entity | null {
    const allEntities = this.project.stageManager.getEntities();
    for (const [sourceUuid, twinUuid] of tsa.entityUuidPairs) {
      if (sourceUuid === entity.uuid) {
        return allEntities.find((candidate) => candidate.uuid === twinUuid) ?? null;
      }
      if (twinUuid === entity.uuid) {
        return allEntities.find((candidate) => candidate.uuid === sourceUuid) ?? null;
      }
    }
    return null;
  }

  private removeTwinSectionEntity(entity: Entity): void {
    const entities = this.collectEntityAndDescendants(entity);
    const entityUuids = new Set(entities.map((item) => item.uuid));
    for (const association of this.getTwinSectionAssociations()) {
      association.entityUuidPairs = association.entityUuidPairs.filter(
        ([sourceUuid, twinUuid]) => !entityUuids.has(sourceUuid) && !entityUuids.has(twinUuid),
      );
      if (
        !association.entityUuidPairs.some(
          ([sourceUuid, twinUuid]) =>
            sourceUuid === association.sourceSectionUuid && twinUuid === association.twinSectionUuid,
        )
      ) {
        this.project.stageManager.delete(association);
      }
    }
    for (const stageObject of [...this.project.stage]) {
      if (
        stageObject instanceof Edge &&
        (entityUuids.has(stageObject.source.uuid) || entityUuids.has(stageObject.target.uuid))
      ) {
        this.project.stageManager.delete(stageObject);
      } else if (
        stageObject instanceof MultiTargetUndirectedEdge &&
        stageObject.associationList.some((member) => entityUuids.has(member.uuid))
      ) {
        this.project.stageManager.delete(stageObject);
      }
    }
    for (const item of entities) {
      this.onStageObjectDeleted(item);
      this.project.stageManager.delete(item);
    }
    this.project.stageManager.updateReferences();
  }

  private collectEntityAndDescendants(entity: Entity): Entity[] {
    const result: Entity[] = [entity];
    if (entity instanceof Section) {
      for (const child of entity.children) {
        result.push(...this.collectEntityAndDescendants(child));
      }
    }
    return result;
  }

  private applyTwinSectionChange(action: () => void): void {
    this.isApplyingTwinSectionChange = true;
    try {
      action();
    } finally {
      this.isApplyingTwinSectionChange = false;
    }
  }
}
