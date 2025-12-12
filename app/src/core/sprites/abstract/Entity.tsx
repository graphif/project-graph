import { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { StageObject } from "@/core/sprites/abstract/StageObject";
import { on } from "@graphif/on";
import { serializable } from "@graphif/serializer";
import gsap from "gsap";
import { DestroyOptions, FederatedPointerEvent, Graphics, ObservablePoint, Point, Rectangle } from "pixi.js";
import type { Value } from "platejs";
import { LineEdge } from "../LineEdge";
import { Section } from "../Section";
import { TempLineEdge } from "../TempLineEdge";
import { AssociationMember } from "./Association";

/**
 * 实体
 * 一切独立存在、能被移动的东西，且放在框里能被连带移动的东西
 */
export abstract class Entity extends StageObject {
  /*
   * 允许关联
   */
  allowAssociation: boolean = true;

  /**
   * 实体内容数据
   */
  @serializable
  public details: Value = [];

  // 交互状态
  private startWorldPoint = new Point(0, 0);
  private linking = false;
  private tempLineEdge: TempLineEdge | null = null;

  // 连线指示器
  private sourceIndicator: Graphics | null = null;
  private targetIndicator: Graphics | null = null;
  private currentTarget: Entity | null = null;

  // 记录上一次的锚点，用于判断是否需要动画
  private lastSourceAnchor: string | null = null;
  private lastTargetAnchor: string | null = null;

  constructor(project: Project) {
    super(project);

    // 初始化临时连接线
    this.tempLineEdge = new TempLineEdge(this.project);

    // 监听全局对象进入事件，用于处理连线吸附
    this.project.on("pointer-enter-stage-object", this.onPointerEnterHandler);
  }

  /**
   * 处理鼠标进入其他对象时的逻辑（主要用于连线目标检测）
   */
  private onPointerEnterHandler = (so: StageObject) => {
    // 只有在正在连线，且目标是另一个 Entity 时才处理
    if (this.linking && so instanceof Entity && so !== this) {
      // 如果已经是当前目标，不做处理，避免动画重置
      if (this.currentTarget === so) return;

      this.currentTarget = so;
      // 初始化目标指示器
      this.updateTargetIndicator(true);
    }
  };

  @on("pointerdown")
  protected _Entity_pointerdown(e: FederatedPointerEvent) {
    const world = this.project.viewport.toWorld(e.client);
    this.startWorldPoint.copyFrom(world);

    // 右键点击开始连线
    if (e.button === 2) {
      this.linking = true;
      this.tempLineEdge!.sourcePoint = world;
      this.tempLineEdge!.targetPoint = world;
      // 将临时线加入舞台
      this.project.stage.push(this.tempLineEdge!);

      // 初始化源指示器
      this.updateSourceIndicator(true);
    }
  }

  @on("pointerup")
  protected _Entity_pointerup(e: FederatedPointerEvent) {
    this.handlePointerUp(e);
  }

  @on("pointerupoutside")
  protected _Entity_pointerupoutside(e: FederatedPointerEvent) {
    this.handlePointerUp(e);
  }

  /**
   * 统一处理 pointerup 和 pointerupoutside
   */
  private handlePointerUp(e: FederatedPointerEvent) {
    const world = this.project.viewport.toWorld(e.client);

    // 处理右键菜单：如果是右键，且没有移动（或移动很小），且不是在连线拖拽中
    const dist = Math.sqrt(
      Math.pow(world.x - this.startWorldPoint.x, 2) + Math.pow(world.y - this.startWorldPoint.y, 2),
    );
    const isClick = dist < 5; // 5px 容差

    if (e.button === 2 && isClick) {
      this.project.emit("context-menu", e.client);
    }

    // 创建连线
    if (this.linking && this.currentTarget && this.tempLineEdge) {
      // 根据sourceRotation算出sourceAnchor
      const sourceAnchor = getAnchorByRotation(this.tempLineEdge.sourceRotation);
      const targetAnchor = getBestAnchor(this.currentTarget.getBounds().rectangle, e.client);
      this.project.stage.push(
        new LineEdge(this.project, {
          members: [new AssociationMember(this, sourceAnchor), new AssociationMember(this.currentTarget, targetAnchor)],
        }),
      );
    }

    // 无论如何，松开鼠标意味着连线操作结束
    this.linking = false;
    if (this.tempLineEdge) {
      this.tempLineEdge.destroy();
    }

    // 清理指示器
    this.removeSourceIndicator();
    this.removeTargetIndicator();
    this.currentTarget = null;

    // 处理 Alt + 拖拽放入 Section
    if (e.altKey) {
      e.stopPropagation();
      // 检测碰到了哪个 Section
      const target = this.project.stage
        .filter((it): it is Section => it instanceof Section)
        .find((section) => {
          // 使用屏幕坐标进行碰撞检测
          const bounds = section.getBounds().rectangle;
          return bounds.contains(e.client.x, e.client.y);
        });

      if (target) {
        target.members.push(new AssociationMember(this));
      }
    }
  }

  @on("globalpointermove")
  protected _Entity_globalpointermove(e: FederatedPointerEvent) {
    if (this.linking && this.tempLineEdge) {
      // 1. 更新临时线段的终点 (需要世界坐标)
      const worldPos = this.project.viewport.toWorld(e.client);
      // 只有在没有目标时才跟随鼠标，否则跟随目标指示器
      if (!this.currentTarget) {
        this.tempLineEdge!.targetPoint = worldPos;
      }

      // 2. 动态更新源对象的锚点：只有鼠标在节点 Settings.lineEdgeSourceAnchorSnapRange 范围内才吸附，否则不吸附（保持上一次锚点）
      const screenPos = e.client;
      const bounds = this.getBounds().rectangle;
      const snapBounds = new Rectangle(
        bounds.x - Settings.lineEdgeSourceAnchorSnapRange,
        bounds.y - Settings.lineEdgeSourceAnchorSnapRange,
        bounds.width + Settings.lineEdgeSourceAnchorSnapRange * 2,
        bounds.height + Settings.lineEdgeSourceAnchorSnapRange * 2,
      );

      if (snapBounds.contains(screenPos.x, screenPos.y)) {
        this.tempLineEdge.sourceRotation = getRotationByAnchor(getBestAnchor(bounds, screenPos));
      }

      this.tempLineEdge.position.copyFrom({
        x: Math.min(this.tempLineEdge.sourcePoint!.x, this.tempLineEdge.targetPoint!.x),
        y: Math.min(this.tempLineEdge.sourcePoint!.y, this.tempLineEdge.targetPoint!.y),
      });

      // 3. 检测目标对象是否超出范围 (Buffer Zone 50px)
      if (this.currentTarget) {
        const targetBounds = this.currentTarget.getBounds().rectangle;
        const targetExtendedBounds = new Rectangle(
          targetBounds.x - Settings.lineEdgeTargetAnchorSnapRange,
          targetBounds.y - Settings.lineEdgeTargetAnchorSnapRange,
          targetBounds.width + Settings.lineEdgeTargetAnchorSnapRange * 2,
          targetBounds.height + Settings.lineEdgeTargetAnchorSnapRange * 2,
        );
        if (!targetExtendedBounds.contains(screenPos.x, screenPos.y)) {
          this.currentTarget = null;
          this.removeTargetIndicator();
          // 目标丢失，立即跟随鼠标
          this.tempLineEdge!.targetPoint = worldPos;
        }
      }

      // 4. 更新指示器位置
      this.updateSourceIndicator();
      if (this.currentTarget) {
        this.updateTargetIndicator(false, e.client);
      }
    }
  }

  _onUpdate(point?: ObservablePoint): void {
    super._onUpdate(point);
    this.emit("update");
  }

  destroy(options?: DestroyOptions): void {
    // 移除全局事件监听器
    if (this.onPointerEnterHandler) {
      this.project.off("pointer-enter-stage-object", this.onPointerEnterHandler);
    }

    // 清理临时线段
    if (this.tempLineEdge) {
      this.tempLineEdge.destroy();
      this.tempLineEdge = null;
    }

    // 清理指示器
    this.removeSourceIndicator();
    this.removeTargetIndicator();

    super.destroy(options);
  }

  // --- 指示器相关方法 ---

  private updateSourceIndicator(forceCreate = false) {
    if (!this.tempLineEdge) return;
    const anchor = getAnchorByRotation(this.tempLineEdge.sourceRotation);

    if (!this.sourceIndicator || forceCreate) {
      this.removeSourceIndicator();
      this.sourceIndicator = this.createIndicatorGraphics(0x3b82f6); // Blue
      this.project.viewport.addChild(this.sourceIndicator);
      this.lastSourceAnchor = null;
    }

    this.animateIndicator(this.sourceIndicator, this, anchor, this.lastSourceAnchor);
    this.lastSourceAnchor = anchor;
  }

  private updateTargetIndicator(forceCreate = false, mouseClientPos?: Point) {
    if (!this.currentTarget) return;

    let anchor: "left" | "right" | "top" | "bottom" = "left"; // default
    if (mouseClientPos) {
      const screenBounds = this.currentTarget.getBounds().rectangle;
      anchor = getBestAnchor(screenBounds, mouseClientPos);
    } else if (this.lastTargetAnchor) {
      anchor = this.lastTargetAnchor as any;
    }

    if (!this.targetIndicator || forceCreate) {
      this.removeTargetIndicator();
      this.targetIndicator = this.createIndicatorGraphics(0x10b981); // Green
      this.project.viewport.addChild(this.targetIndicator);
      this.lastTargetAnchor = null;
    }

    this.animateIndicator(this.targetIndicator, this.currentTarget, anchor, this.lastTargetAnchor);
    this.lastTargetAnchor = anchor;
  }

  private createIndicatorGraphics(color: number): Graphics {
    const g = new Graphics();
    // 画一个矩形作为线，中心点在 (0,0)
    // 初始长度为 1，宽度为 4 (线条粗细)
    // 之后通过 scale.y 来调整长度
    g.rect(-2, -0.5, 4, 1);
    g.fill({ color, alpha: 1 });
    g.zIndex = 9999;
    return g;
  }

  private animateIndicator(
    g: Graphics,
    entity: Entity,
    anchor: "left" | "right" | "top" | "bottom",
    lastAnchor: string | null,
  ) {
    const bounds = entity.getWorldBounds().rectangle;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    let targetRotation = 0;
    let targetX = 0;
    let targetY = 0;
    let targetLength = 0;

    const syncTempLineEdge = () => {
      if (!this.tempLineEdge) return;
      if (g === this.sourceIndicator) {
        this.tempLineEdge.sourcePoint = g.position;
        this.tempLineEdge.sourceRotation = g.rotation;
        this.tempLineEdge.refresh();
      } else if (g === this.targetIndicator) {
        this.tempLineEdge.targetPoint = g.position;
        this.tempLineEdge.targetRotation = g.rotation;
        this.tempLineEdge.refresh();
      }
    };

    // 计算目标状态
    targetRotation = getRotationByAnchor(anchor);
    switch (anchor) {
      case "right":
        targetX = centerX + bounds.width / 2;
        targetY = centerY;
        targetLength = bounds.height;
        break;
      case "bottom":
        targetX = centerX;
        targetY = centerY + bounds.height / 2;
        targetLength = bounds.width;
        break;
      case "left":
        targetX = centerX - bounds.width / 2;
        targetY = centerY;
        targetLength = bounds.height;
        break;
      case "top":
        targetX = centerX;
        targetY = centerY - bounds.height / 2;
        targetLength = bounds.width;
        break;
    }

    // 处理旋转角度的连续性 (最短路径)
    if (g.rotation !== targetRotation) {
      const PI = Math.PI;
      const PI2 = PI * 2;
      let diff = (targetRotation - g.rotation) % PI2;
      if (diff < -PI) diff += PI2;
      if (diff > PI) diff -= PI2;

      const finalRotation = g.rotation + diff;

      // 如果是第一次显示，直接设置
      if (lastAnchor === null) {
        g.rotation = targetRotation;
        g.position.set(targetX, targetY);
        g.scale.y = targetLength;
        syncTempLineEdge();
        // 进场动画
        gsap.from(g.scale, { x: 2, y: targetLength * 2, duration: 0.3, ease: "back.out" });
      } else {
        // 状态变化动画
        gsap.to(g, { rotation: finalRotation, duration: 0.3, ease: "power2.out", onUpdate: syncTempLineEdge });
        gsap.to(g.position, { x: targetX, y: targetY, duration: 0.3, ease: "power2.out", onUpdate: syncTempLineEdge });
        gsap.to(g.scale, { y: targetLength, duration: 0.3, ease: "power2.out" });
      }
    } else {
      // 位置和大小可能因为 Entity 移动/缩放而改变，即使 anchor 没变
      // 这里不使用动画，直接跟随，避免延迟
      g.position.set(targetX, targetY);
      g.scale.y = targetLength;
      syncTempLineEdge();
    }
  }

  private removeSourceIndicator() {
    if (this.sourceIndicator) {
      gsap.killTweensOf(this.sourceIndicator);
      gsap.killTweensOf(this.sourceIndicator.position);
      gsap.killTweensOf(this.sourceIndicator.scale);
      this.sourceIndicator.destroy();
      this.sourceIndicator = null;
    }
    this.lastSourceAnchor = null;
    if (this.tempLineEdge) {
      this.tempLineEdge.sourcePoint = null;
      this.tempLineEdge.sourceRotation = null;
    }
  }

  private removeTargetIndicator() {
    if (this.targetIndicator) {
      gsap.killTweensOf(this.targetIndicator);
      gsap.killTweensOf(this.targetIndicator.position);
      gsap.killTweensOf(this.targetIndicator.scale);
      this.targetIndicator.destroy();
      this.targetIndicator = null;
    }
    this.lastTargetAnchor = null;
    if (this.tempLineEdge) {
      this.tempLineEdge.targetRotation = null;
    }
  }
}

/**
 * 计算点相对于矩形中心的方位（上下左右）
 * 用于确定连线的目标锚点
 */
function getBestAnchor(bounds: Rectangle, point: Point): "left" | "right" | "top" | "bottom" {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  // Normalize distance by dimensions to handle aspect ratio
  const dx = (point.x - centerX) / bounds.width;
  const dy = (point.y - centerY) / bounds.height;

  if (Math.abs(dx) > Math.abs(dy)) {
    // 左右区域
    return dx < 0 ? "left" : "right";
  } else {
    // 上下区域
    return dy < 0 ? "top" : "bottom";
  }
}

function getAnchorByRotation(rotation: number | null): "left" | "right" | "top" | "bottom" {
  if (rotation === null) return "right"; // default

  // Normalize degrees to [-180, 180) so 270° becomes -90° (top)
  let deg = (rotation * 180) / Math.PI;
  deg = ((((deg + 180) % 360) + 360) % 360) - 180;

  if (deg >= -45 && deg < 45) return "right";
  if (deg >= 45 && deg < 135) return "bottom";
  if (deg >= 135 || deg < -135) return "left";
  return "top";
}
function getRotationByAnchor(anchor: "left" | "right" | "top" | "bottom"): number {
  switch (anchor) {
    case "right":
      return 0;
    case "bottom":
      return (90 * Math.PI) / 180;
    case "left":
      return (180 * Math.PI) / 180;
    case "top":
      return (270 * Math.PI) / 180;
  }
}
