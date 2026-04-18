import type { Project } from "@/core/Project";
import type { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";

/**
 * 注：关于舞台上的东西的这一部分的
 * 继承体系是 Rutubet 和 Littlefean 的讨论结果
 *
 */

/**
 * 一切舞台上的东西
 * 都具有碰撞箱，uuid
 */
export abstract class StageObject {
  protected abstract readonly project: Project;

  // 舞台对象，必定有 uuid
  public abstract uuid: string;

  // 舞台对象，必定有碰撞箱
  public abstract collisionBox: CollisionBox;

  /**
   * 是否是"物理存在"的对象（占据画布空间）
   * false 的对象会被排除在框选、劈砍、F键视野重置等交互之外
   * 默认为 true，SyncAssociation 等纯数据关系对象应覆盖为 false
   */
  public get isPhysical(): boolean {
    return true;
  }

  // 舞台对象，必定有选中状态
  _isSelected: boolean = false;

  public get isSelected(): boolean {
    return this._isSelected;
  }

  public set isSelected(value: boolean) {
    this._isSelected = value;
  }

  /**
   * 防止孪生同步循环触发的标志
   * 当此对象正在被 StageSyncAssociationManager 写入同步内容时为 true，
   * 检测到该标志时跳过向外同步，避免循环同步。
   * 所有舞台对象在未来都有可能被加上同步关系，因此放在基类中。
   */
  public _isSyncing: boolean = false;
}
