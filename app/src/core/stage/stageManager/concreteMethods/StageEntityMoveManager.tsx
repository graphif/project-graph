import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { EntityJumpMoveEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityJumpMoveEffect";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { Vector } from "@graphif/data-structures";

/**
 * 管理节点的位置移动
 * 不仅仅有鼠标拖动的移动，还有对齐造成的移动
 * 还要处理节点移动后，对Section大小造成的影响
 * 以后还可能有自动布局的功能
 */
@service("entityMoveManager")
export class EntityMoveManager {
  constructor(private readonly project: Project) {}

  // ─────── 持续移动物理引擎（复用 Camera 同款物理模型）───────
  /** 方向命令向量，由快捷键 press/release 写入，值域 [-1,1]×[-1,1] */
  public moveAccelerateCommander: Vector = Vector.getZero();
  /** 当前速度 */
  private moveSpeed: Vector = Vector.getZero();
  /** 速度指数摩擦力指数（与 Camera 保持一致） */
  private readonly frictionExponent = 1.5;

  /**
   * 每帧物理 tick：把速度转化为实体位移
   * 注意：移动过程中不记录历史（避免历史爆炸），松开按键速度归零后再记录一次
   */
  tick() {
    if (this.moveAccelerateCommander.isZero() && this.moveSpeed.isZero()) {
      return;
    }

    // 摩擦力（与 Camera.tick 完全相同的公式）
    let friction = Vector.getZero();
    if (!this.moveSpeed.isZero()) {
      const speedSize = this.moveSpeed.magnitude();
      friction = this.moveSpeed
        .normalize()
        .multiply(-1)
        .multiply(Settings.moveFriction * speedSize ** this.frictionExponent)
        .limitX(-300, 300)
        .limitY(-300, 300);
    }

    // 动力（与相机移动相同的缩放感知公式：视野越宏观，移动速度越快）
    const power = this.moveAccelerateCommander
      .multiply(Settings.moveAmplitude * (1 / this.project.camera.currentScale) ** 2)
      .limitX(-300, 300)
      .limitY(-300, 300);

    this.moveSpeed = this.moveSpeed.add(power).add(friction);

    // 速度足够小时归零，防止无限微小漂移
    if (this.moveSpeed.magnitude() < 0.01) {
      this.moveSpeed = Vector.getZero();
      // 速度真正停止时记录一次历史
      if (this.moveAccelerateCommander.isZero()) {
        this.project.historyManager.recordStep();
      }
      return;
    }

    // 用整帧位移驱动实体（不触发历史记录）
    this.moveEntitiesWithChildren(this.moveSpeed, true);
  }

  /**
   * 持续移动：某方向键按下
   */
  public continuousMoveKeyPress(direction: Vector) {
    this.moveAccelerateCommander = this.moveAccelerateCommander.add(direction).limitX(-1, 1).limitY(-1, 1);
  }

  /**
   * 持续移动：某方向键松开（速度会自然衰减至停止后记录历史）
   */
  public continuousMoveKeyRelease(direction: Vector) {
    this.moveAccelerateCommander = this.moveAccelerateCommander.subtract(direction).limitX(-1, 1).limitY(-1, 1);
  }

  /**
   * 立刻刹车：清除命令向量和速度（进入编辑模式等场景使用）
   */
  public stopImmediately() {
    this.moveAccelerateCommander = Vector.getZero();
    this.moveSpeed = Vector.getZero();
  }
  // ─────────────────────────────────────────────────────────────

  /**
   * 检查实体是否可以移动（考虑锁定状态）
   * @param entity 要检查的实体
   * @returns 如果实体可以移动返回 true，否则返回 false
   */
  private canMoveEntity(entity: Entity): boolean {
    // 检查实体是否有锁定的祖先section（递归检查）
    const ancestorSections = this.project.sectionMethods.getFatherSectionsList(entity);
    if (ancestorSections.some((section) => section.locked)) {
      return false;
    }
    return true;
  }

  /**
   * 让某一个实体移动一小段距离
   * @param entity
   * @param delta
   * @param isAutoAdjustSection 移动的时候是否触发section框的弹性调整
   */
  moveEntityUtils(entity: Entity, delta: Vector, isAutoAdjustSection: boolean = true) {
    // 检查实体是否可以被移动（锁定状态检查）
    if (!this.canMoveEntity(entity)) {
      return;
    }
    // 让自己移动
    entity.move(delta);

    const nodeUUID = entity.uuid;

    // if (this.project.stageManager.isSectionByUUID(nodeUUID)) {
    //   // 如果是Section，则需要带动孩子一起移动
    //   const section = this.project.stageManager.getSectionByUUID(nodeUUID);
    //   if (section) {
    //     for (const child of section.children) {
    //       moveEntityUtils(child, delta);
    //     }
    //   }
    // }
    if (isAutoAdjustSection) {
      for (const section of this.project.stageManager.getSections()) {
        if (section.children.find((it) => it.uuid === nodeUUID)) {
          section.adjustLocationAndSize();
        }
      }
    }
  }

  /**
   * 跳跃式移动传入的实体
   * 会破坏嵌套关系
   * @param entity
   * @param delta
   */
  jumpMoveEntityUtils(entity: Entity, delta: Vector) {
    // 检查实体是否可以被移动（锁定状态检查）
    if (!this.canMoveEntity(entity)) {
      return;
    }

    const beforeMoveRect = entity.collisionBox.getRectangle().clone();
    console.log("JUMP MOVE");
    // 将自己移动前加特效
    this.project.effects.addEffect(new EntityJumpMoveEffect(15, beforeMoveRect, delta));

    // 即将跳入的sections区域
    const targetSections = this.project.sectionMethods.getSectionsByInnerLocation(beforeMoveRect.center.add(delta));

    // 检查目标位置是否在锁定的 section 内（包括祖先section的锁定状态）
    if (targetSections.some((section) => this.project.sectionMethods.isObjectBeLockedBySection(section))) {
      return;
    }
    // 改变层级
    if (targetSections.length === 0) {
      // 代表想要走出当前section
      const currentFatherSections = this.project.sectionMethods.getFatherSections(entity);
      if (currentFatherSections.length !== 0) {
        this.project.stageManager.goOutSection([entity], currentFatherSections[0]);
      }
    } else {
      this.project.sectionInOutManager.goInSections([entity], targetSections);
      for (const section of targetSections) {
        // 特效
        this.project.effects.addEffect(
          new RectanglePushInEffect(entity.collisionBox.getRectangle(), section.collisionBox.getRectangle()),
        );
        SoundService.play.entityJumpSoundFile();
      }
    }

    // 让自己移动
    // entity.move(delta);
    this.moveEntityUtils(entity, delta, false);
  }

  /**
   * 将某个实体移动到目标位置
   * @param entity
   * @param location
   */
  moveEntityToUtils(entity: Entity, location: Vector) {
    // 检查实体是否可以被移动（锁定状态检查）
    if (!this.canMoveEntity(entity)) {
      return;
    }
    entity.moveTo(location);
    const nodeUUID = entity.uuid;
    for (const section of this.project.stageManager.getSections()) {
      if (section.children.find((it) => it.uuid === nodeUUID)) {
        section.adjustLocationAndSize();
      }
    }
  }

  /**
   * 移动所有选中的实体一小段距离
   * @param delta
   * @param isAutoAdjustSection
   */
  moveSelectedEntities(delta: Vector, isAutoAdjustSection: boolean = true) {
    for (const node of this.project.stageManager.getEntities()) {
      if (node.isSelected) {
        this.moveEntityUtils(node, delta, isAutoAdjustSection);
      }
    }
  }

  /**
   * 跳跃式移动所有选中的可连接实体
   * 会破坏框的嵌套关系
   * @param delta
   */
  jumpMoveSelectedConnectableEntities(delta: Vector) {
    for (const node of this.project.stageManager.getConnectableEntity()) {
      if (node.isSelected) {
        this.jumpMoveEntityUtils(node, delta);
      }
    }
  }

  /**
   * 树型移动 所有选中的实体
   * @param delta
   * @param skipDashed 是否跳过虚线边（树形格式化时传 true，避免带动虚线连接的节点）
   */
  moveEntitiesWithChildren(delta: Vector, skipDashed = true) {
    for (const node of this.project.stageManager.getEntities()) {
      if (node.isSelected) {
        if (node instanceof ConnectableEntity) {
          this.moveWithChildren(node, delta, skipDashed);
        } else {
          this.moveEntityUtils(node, delta);
        }
      }
    }
  }
  /**
   * 树形移动传入的可连接实体
   * @param node
   * @param delta
   * @param skipDashed 是否跳过虚线边（树形格式化时传 true，避免带动虚线连接的节点）
   */
  moveWithChildren(node: ConnectableEntity, delta: Vector, skipDashed = false) {
    const successorSet = this.project.graphMethods.getSuccessorSet(node, true, skipDashed);
    for (const successor of successorSet) {
      this.moveEntityUtils(successor, delta);
    }
  }

  // 按住shift键移动
}
