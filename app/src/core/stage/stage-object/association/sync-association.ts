import { Project } from "@/core/Project";
import { Association } from "@/core/stage/stageObject/abstract/Association";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { Color } from "@graphif/data-structures";
import { id, passExtraAtArg1, passObject, serializable } from "@graphif/serializer";
import { Rectangle } from "@graphif/shapes";
import { Vector } from "@graphif/data-structures";

/**
 * 孪生同步关系可同步的字段
 */
export type SyncableKey = "text" | "color" | "details";

/**
 * 孪生同步关系（SyncAssociation）
 *
 * 将一组 StageObject 绑定在一起，当其中任意成员的指定字段（keys）发生变化时，
 * 其余成员的同名字段自动同步更新。
 *
 * 特性：
 * - 不占据画布物理空间（isPhysical = false），不参与框选、劈砍、视野重置等交互
 * - 没有碰撞箱（返回零大小空碰撞箱）
 * - 成员数量 >= 2 时有效；若成员被删除导致只剩 1 个，整个关系对象会被自动清理
 * - 支持任意数量的成员，修改一个成员会同步至同组所有其他成员
 */
@passExtraAtArg1
@passObject
export class SyncAssociation extends Association {
  @id
  @serializable
  public uuid: string;

  /**
   * 需要同步的字段列表
   * "text"：同步节点文字内容
   * "color"：同步节点背景颜色
   * "details"：同步节点富文本详情
   */
  @serializable
  public keys: SyncableKey[];

  /**
   * 参与同步的所有成员（宽泛接受 StageObject，未来可扩展）
   */
  @serializable
  public override associationList: StageObject[] = [];

  /**
   * 孪生关系没有碰撞箱，返回零大小的空碰撞箱
   */
  public get collisionBox(): CollisionBox {
    return new CollisionBox([new Rectangle(Vector.getZero(), Vector.getZero())]);
  }

  /**
   * 孪生关系不占据物理空间，排除在框选、劈砍、F键视野重置等交互之外
   */
  public override get isPhysical(): boolean {
    return false;
  }

  /**
   * 孪生关系对象不可被选中
   */
  _isSelected: boolean = false;
  public override get isSelected(): boolean {
    return this._isSelected;
  }
  public override set isSelected(value: boolean) {
    this._isSelected = value;
  }

  constructor(
    protected readonly project: Project,
    {
      uuid = crypto.randomUUID() as string,
      keys = ["text", "color", "details"] as SyncableKey[],
      associationList = [] as StageObject[],
      color = Color.Transparent,
    }: {
      uuid?: string;
      keys?: SyncableKey[];
      associationList?: StageObject[];
      color?: Color;
    },
    /** true 表示解析状态，false 表示解析完毕 */
    public unknown = false,
  ) {
    super();
    this.uuid = uuid;
    this.keys = keys;
    this.associationList = associationList;
    this.color = color;
  }

  /**
   * 将 source 节点的同步字段值，复制给 this（自身）
   * 由 StageSyncAssociationManager.syncFrom 调用，不应直接调用
   *
   * @param source 发生变化的源节点
   */
  public applyFrom(source: StageObject): void {
    for (const member of this.associationList) {
      if (member === source) continue;
      for (const key of this.keys) {
        if (key in source && key in member) {
          // 使用类型断言，因为 StageObject 不直接声明这些字段，
          // 但具体子类（TextNode 等）都有
          (member as any)[key] = (source as any)[key];
        }
      }
    }
  }
}
