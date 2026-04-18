import { Project, service } from "@/core/Project";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { SyncAssociation, SyncableKey } from "@/core/stage/stageObject/association/SyncAssociation";
import { Vector } from "@graphif/data-structures";
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
  constructor(private readonly project: Project) {}

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
  }
}
