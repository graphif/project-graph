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
   * 给定一个实体，如果它属于某个孪生分组框关系的内部（包括根分组框本身），
   * 则返回对应的两个根分组框 [sourceSection, twinSection]；否则返回 null。
   *
   * 用于渲染时判断：选中框内节点时，虚线应画在两个根分组框之间，而非节点之间。
   */
  public getTwinSectionRootPairForEntity(entity: Entity): [Section, Section] | null {
    const entities = this.project.stageManager.getEntities();
    for (const association of this.getTwinSectionAssociations()) {
      const isInvolved = association.entityUuidPairs.some(
        ([sourceUuid, twinUuid]) => sourceUuid === entity.uuid || twinUuid === entity.uuid,
      );
      if (!isInvolved) continue;

      const sourceSection = entities.find((e) => e.uuid === association.sourceSectionUuid);
      const twinSection = entities.find((e) => e.uuid === association.twinSectionUuid);
      if (sourceSection instanceof Section && twinSection instanceof Section) {
        return [sourceSection, twinSection];
      }
    }
    return null;
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

  /** 用户移动框内节点时，让对应节点以相同位移移动。 */
  public onEntityMoved(entity: Entity, delta: Vector): void {
    if (this.isApplyingTwinSectionChange) return;
    const counterpart = this.getTwinSectionCounterpart(entity);
    if (!counterpart || this.isTwinSectionRoot(entity)) return;

    this.applyTwinSectionChange(() => {
      counterpart.move(delta);
      this.adjustParentSections(counterpart);
    });
  }

  /** 当两个孪生分组框内的节点新增连线时，创建端点对应的镜像连线。 */
  public onAssociationCreated(association: Edge | MultiTargetUndirectedEdge): void {
    if (this.isApplyingTwinSectionChange) return;
    const counterpartMembers = association.associationList.map((member) => this.getTwinSectionCounterpart(member));
    if (counterpartMembers.some((member): member is null => member === null)) return;
    if (!counterpartMembers.every((member): member is ConnectableEntity => member instanceof ConnectableEntity)) return;

    const twin = (deserialize(serialize([association]), this.project) as Array<Edge | MultiTargetUndirectedEdge>)[0];
    if (!twin) return;
    twin.uuid = crypto.randomUUID();
    twin.associationList = counterpartMembers;
    twin.isSelected = false;

    this.applyTwinSectionChange(() => this.project.stageManager.add(twin));
  }

  /** 删除连线时，删除端点一一对应的镜像连线。 */
  public onAssociationDeleted(association: Edge | MultiTargetUndirectedEdge): void {
    if (this.isApplyingTwinSectionChange) return;
    const counterpartMembers = association.associationList.map((member) => this.getTwinSectionCounterpart(member));
    if (counterpartMembers.some((member): member is null => member === null)) return;
    if (!counterpartMembers.every((member): member is ConnectableEntity => member instanceof ConnectableEntity)) return;

    const twin = this.project.stageManager.getAssociations().find((candidate) => {
      if (candidate.constructor !== association.constructor) return false;
      if (!(candidate instanceof Edge) && !(candidate instanceof MultiTargetUndirectedEdge)) return false;
      return candidate.associationList.every((member, index) => member === counterpartMembers[index]);
    });
    if (!twin) return;

    this.applyTwinSectionChange(() => {
      this.project.stageManager.delete(twin);
      this.project.stageManager.updateReferences();
    });
  }

  /** 同步有向连线后续调整过的端点位置。 */
  public onEdgeConnectLocationChanged(edge: Edge): void {
    if (this.isApplyingTwinSectionChange) return;
    const counterpartMembers = edge.associationList.map((member) => this.getTwinSectionCounterpart(member));
    if (counterpartMembers.some((member): member is null => member === null)) return;
    if (!counterpartMembers.every((member): member is ConnectableEntity => member instanceof ConnectableEntity)) return;

    const twin = this.project.stageManager.getAssociations().find((candidate) => {
      if (candidate.constructor !== edge.constructor || !(candidate instanceof Edge)) return false;
      return candidate.associationList.every((member, index) => member === counterpartMembers[index]);
    }) as Edge | undefined;
    if (!twin) return;

    this.applyTwinSectionChange(() => {
      twin.sourceRectangleRate = edge.sourceRectangleRate.clone();
      twin.targetRectangleRate = edge.targetRectangleRate.clone();
    });
  }

  /** 分组框标题、颜色、详情的修改同步到另一侧。 */
  public onSectionPropertyChanged(section: Section, key: "text" | "color" | "details"): void {
    if (this.isApplyingTwinSectionChange) return;
    const counterpart = this.getTwinSectionCounterpart(section);
    if (!(counterpart instanceof Section)) return;

    this.applyTwinSectionChange(() => {
      if (key === "text") {
        counterpart.rename(section.text);
      } else if (key === "color") {
        counterpart.color = section.color;
      } else {
        counterpart.details = section.details;
      }
    });
  }

  /** 分组框内实体的父级变化：新加入时克隆，离开时删除另一侧对应项。 */
  public onEntityParentChanged(entity: Entity, previousParent: Section | null, nextParent: Section | null): void {
    if (this.isApplyingTwinSectionChange || previousParent === nextParent) return;

    const previousCounterpart = previousParent ? this.getTwinSectionCounterpart(previousParent) : null;
    const nextCounterpart = nextParent ? this.getTwinSectionCounterpart(nextParent) : null;
    const counterpart = this.getTwinSectionCounterpart(entity);

    if (!previousCounterpart && nextCounterpart instanceof Section && !counterpart) {
      this.applyTwinSectionChange(() => this.cloneEntityIntoTwinSection(entity, nextParent!, nextCounterpart));
      return;
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
    const counterpart = this.getTwinSectionCounterpart(deleted);
    if (!counterpart) return;
    this.applyTwinSectionChange(() => this.removeTwinSectionEntity(counterpart));
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

  private getTwinSectionCounterpart(entity: Entity): Entity | null {
    for (const association of this.getTwinSectionAssociations()) {
      for (const [sourceUuid, twinUuid] of association.entityUuidPairs) {
        if (sourceUuid === entity.uuid) {
          return this.project.stageManager.getEntities().find((candidate) => candidate.uuid === twinUuid) ?? null;
        }
        if (twinUuid === entity.uuid) {
          return this.project.stageManager.getEntities().find((candidate) => candidate.uuid === sourceUuid) ?? null;
        }
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
