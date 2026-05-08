import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Vector } from "@graphif/data-structures";

@service("forceDirectedLayout")
export class ForceDirectedLayout {
  constructor(private readonly project: Project) {}

  /** 是否正在模拟中 */
  private isSimulating = false;

  /** 上次激活时间，用于开关变化时重新激活 */
  private lastEnabledState = false;

  /** 保存启用力导向前的碰撞设置，退出时恢复 */
  private savedEntityCollision = false;
  private savedSectionCollision = false;

  /** 收敛阈值：总动能低于此值停止模拟 */
  private get convergenceThreshold() {
    return Settings.forceDirectedConvergenceThreshold;
  }

  /** 速度衰减系数（每一帧乘此值） */
  private get velocityDecay() {
    return Settings.forceDirectedVelocityDecay;
  }

  /** 弹簧力目标距离 */
  private get linkDistance() {
    return Settings.forceDirectedLinkDistance;
  }

  /** 弹簧力强度 */
  private get linkStrength() {
    return Settings.forceDirectedLinkStrength;
  }

  /** 最近距离限制（节点不会比这更近） */
  private get minDistance() {
    return Settings.forceDirectedMinDistance;
  }

  /** 碰撞力强度 */
  private get collisionStrength() {
    return Settings.forceDirectedCollisionStrength;
  }

  /** 移动限制，防止爆炸 */
  private get maxMovePerFrame() {
    return Settings.forceDirectedMaxMovePerFrame;
  }

  /** 节点速度映射 */
  private velocities = new Map<string, Vector>();

  tick() {
    const isEnabled = Settings.isEnableForceDirected;

    // 开关从关变开：保存碰撞设置，禁用外部碰撞系统
    if (isEnabled && !this.lastEnabledState) {
      this.savedEntityCollision = Settings.isEnableEntityCollision;
      this.savedSectionCollision = Settings.isEnableSectionCollision;
      Settings.isEnableEntityCollision = false;
      Settings.isEnableSectionCollision = false;
      this.isSimulating = true;
      this.velocities.clear();
    }

    // 开关从开变关：恢复碰撞设置，停止模拟
    if (!isEnabled && this.lastEnabledState) {
      Settings.isEnableEntityCollision = this.savedEntityCollision;
      Settings.isEnableSectionCollision = this.savedSectionCollision;
      this.isSimulating = false;
      this.velocities.clear();
    }

    this.lastEnabledState = isEnabled;

    if (!this.isSimulating) return;

    // 模拟一帧
    this.simulationTick();
  }

  private simulationTick() {
    const allEntities = this.project.stageManager.getEntities();
    const allConnectables = allEntities.filter((e) => e instanceof ConnectableEntity) as ConnectableEntity[];

    // 收集所有在 Section 内部的子节点 UUID（策略一：Section 作为虚拟大节点，
    // 子节点不独立参与力计算，随 Section 移动）
    const allSections = allConnectables.filter((e) => e instanceof Section) as Section[];
    const childUuids = new Set<string>();
    for (const section of allSections) {
      for (const child of section.children) {
        childUuids.add(child.uuid);
      }
    }

    // 只对不在 Section 内部的实体（含 Section 自身）施力
    const connectableEntities = allConnectables.filter((e) => !childUuids.has(e.uuid));

    // 没有可移动的实体
    if (connectableEntities.length === 0) return;

    // ===== 初始化速度为0 =====
    for (const entity of connectableEntities) {
      if (!this.velocities.has(entity.uuid)) {
        this.velocities.set(entity.uuid, Vector.getZero());
      }
    }

    // 构建 UUID → Entity 快速查找
    const entityMap = new Map<string, ConnectableEntity>();
    for (const entity of connectableEntities) {
      entityMap.set(entity.uuid, entity);
    }

    // ===== 1. 计算弹簧力（仅沿边） =====
    // 星系模型：只有有连线的节点之间才有力反馈
    const linkForces = new Map<string, Vector>();
    for (const entity of connectableEntities) {
      linkForces.set(entity.uuid, Vector.getZero());
    }

    const edges = this.project.stageManager.getAssociations().filter((a) => a instanceof Edge) as Edge[];
    for (const edge of edges) {
      const source = edge.source;
      const target = edge.target;
      // 两个端点都必须在当前场景的可连接实体中
      if (!entityMap.has(source.uuid) || !entityMap.has(target.uuid)) continue;

      const centerSource = source.collisionBox.getRectangle().center;
      const centerTarget = target.collisionBox.getRectangle().center;
      const delta = centerTarget.subtract(centerSource);
      const distance = delta.magnitude();

      if (distance < 1) continue;

      // 弹簧力：偏离目标距离时产生力
      // < linkDistance → 排斥（推开），> linkDistance → 吸引（拉回）
      const displacement = distance - this.linkDistance;
      const forceMagnitude = displacement * this.linkStrength;
      let force = delta.normalize().multiply(forceMagnitude);

      // 最近距离限制：如果距离小于 minDistance，额外施加强排斥防止重叠
      if (distance < this.minDistance) {
        const extraRepel = ((this.minDistance - distance) / this.minDistance) * this.linkStrength * 50;
        force = force.add(delta.normalize().multiply(-extraRepel));
      }

      linkForces.set(source.uuid, linkForces.get(source.uuid)!.add(force));
      linkForces.set(target.uuid, linkForces.get(target.uuid)!.add(force.multiply(-1)));
    }

    // ===== 2. 碰撞力（防止任何重叠） =====
    const collisionForces = new Map<string, Vector>();
    for (const entity of connectableEntities) {
      collisionForces.set(entity.uuid, Vector.getZero());
    }

    for (let i = 0; i < connectableEntities.length; i++) {
      for (let j = i + 1; j < connectableEntities.length; j++) {
        const a = connectableEntities[i];
        const b = connectableEntities[j];
        const rectA = a.collisionBox.getRectangle();
        const rectB = b.collisionBox.getRectangle();

        if (!rectA.isCollideWith(rectB)) continue;

        const overlap = rectA.getOverlapSize(rectB);
        const delta = rectB.center.subtract(rectA.center);
        const forceDir = delta.magnitude() < 1 ? new Vector(1, 0) : delta.normalize();
        const force = forceDir.multiply(Math.min(Math.abs(overlap.x), Math.abs(overlap.y)) * this.collisionStrength);

        collisionForces.set(a.uuid, collisionForces.get(a.uuid)!.add(force.multiply(-1)));
        collisionForces.set(b.uuid, collisionForces.get(b.uuid)!.add(force));
      }
    }

    // ===== 3. 合并力，更新速度 =====
    let totalKineticEnergy = 0;
    const movedEntities: Array<{ entity: ConnectableEntity; delta: Vector }> = [];

    for (const entity of connectableEntities) {
      const link = linkForces.get(entity.uuid) || Vector.getZero();
      const collision = collisionForces.get(entity.uuid) || Vector.getZero();

      let totalForce = link.add(collision);

      // 限制单帧力的大小，防止爆炸
      const forceMagnitude = totalForce.magnitude();
      if (forceMagnitude > this.maxMovePerFrame) {
        totalForce = totalForce.normalize().multiply(this.maxMovePerFrame);
      }

      // 更新速度（F = ma, 假设质量=1）
      let velocity = this.velocities.get(entity.uuid) || Vector.getZero();
      velocity = velocity.add(totalForce);
      // 衰减
      velocity = velocity.multiply(this.velocityDecay);
      this.velocities.set(entity.uuid, velocity);

      const speed = velocity.magnitude();
      totalKineticEnergy += speed * speed;

      if (speed > 0.1) {
        movedEntities.push({ entity, delta: velocity });
      }
    }

    // ===== 4. 应用移动 =====
    for (const { entity, delta } of movedEntities) {
      entity.move(delta);
    }

    // 更新所有 Section 的大小和位置（策略一：Section 自适应包裹子节点）
    const sections = connectableEntities.filter((e) => e instanceof Section) as Section[];
    for (const section of sections) {
      section.adjustLocationAndSize();
    }

    // ===== 5. 收敛检测 =====
    if (totalKineticEnergy < this.convergenceThreshold) {
      this.isSimulating = false;
      this.velocities.clear();
    }
  }

  /** 重新激活力导向模拟 */
  public restartSimulation() {
    this.isSimulating = true;
    this.velocities.clear();
  }

  /** 停止力导向模拟 */
  public stopSimulation() {
    this.isSimulating = false;
    this.velocities.clear();
  }
}
