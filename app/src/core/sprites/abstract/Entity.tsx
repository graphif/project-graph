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

export type Anchor = "left" | "right" | "top" | "bottom";

/**
 * 实体
 * 一切独立存在、能被移动的东西，且放在框里能被连带移动的东西
 */
export abstract class Entity extends StageObject {
  /**
   * 允许关联
   */
  public allowAssociation: boolean = true;

  /**
   * 实体内容数据
   */
  @serializable
  public details: Value = [];

  // 连线交互状态
  private _linking = {
    active: false,
    startWorldPoint: new Point(),
    tempLine: null as TempLineEdge | null,
    currentTarget: null as Entity | null,
    sourceIndicator: null as Graphics | null,
    targetIndicator: null as Graphics | null,
    lastSourceAnchor: null as Anchor | null,
    lastTargetAnchor: null as Anchor | null,
  };

  constructor(project: Project) {
    super(project);
    this._linking.tempLine = new TempLineEdge(this.project);
    this.project.on("pointer-enter-stage-object", this._onPointerEnterStageObject);
  }

  /**
   * 处理鼠标进入其他对象时的逻辑（主要用于连线目标检测）
   */
  private _onPointerEnterStageObject = (so: StageObject) => {
    const link = this._linking;
    if (link.active && so instanceof Entity && so !== this) {
      if (link.currentTarget === so) return;
      link.currentTarget = so;
      this.updateTargetIndicator(true);
    }
  };

  @on("pointerdown")
  protected _Entity_pointerdown(e: FederatedPointerEvent) {
    const world = this.project.viewport.toWorld(e.client);
    this._linking.startWorldPoint.copyFrom(world);

    // 右键点击开始连线
    if (e.button === 2) {
      this._startLinking(world);
    }
  }

  private _startLinking(world: Point) {
    const link = this._linking;
    link.active = true;

    const tempLine = link.tempLine!;
    tempLine.sourcePoint = world;
    tempLine.targetPoint = world;
    tempLine.alpha = 1;

    this.project.stage.push(tempLine);
    this.updateSourceIndicator(true);
  }

  @on("pointerup")
  protected _Entity_pointerup(e: FederatedPointerEvent) {
    this._handlePointerUp(e);
  }

  @on("pointerupoutside")
  protected _Entity_pointerupoutside(e: FederatedPointerEvent) {
    this._handlePointerUp(e);
  }

  /**
   * 统一处理松开鼠标后的逻辑
   */
  private _handlePointerUp(e: FederatedPointerEvent) {
    const link = this._linking;
    const world = this.project.viewport.toWorld(e.client);

    // 1. 处理右键菜单：点击判定
    const distSq = Math.pow(world.x - link.startWorldPoint.x, 2) + Math.pow(world.y - link.startWorldPoint.y, 2);
    if (e.button === 2 && distSq < 25 && !link.active) {
      this.project.emit("context-menu", e.client);
    }

    // 2. 处理连线创建
    if (link.active) {
      if (link.currentTarget && link.tempLine) {
        const sourceAnchor = getAnchorByRotation(link.tempLine.sourceRotation);
        const targetAnchor = getBestAnchor(link.currentTarget.getBounds().rectangle, e.client);

        this.project.stage.push(
          new LineEdge(this.project, {
            members: [
              new AssociationMember(this, sourceAnchor),
              new AssociationMember(link.currentTarget, targetAnchor),
            ],
          }),
        );
      }
      this._stopLinking();
    }

    // 3. 处理 Alt + 拖拽放入 Section
    if (e.altKey) {
      const targetSection = this.project.stage
        .filter((it): it is Section => it instanceof Section)
        .find((s) => s.getBounds().rectangle.contains(e.client.x, e.client.y));

      if (targetSection) {
        targetSection.members.push(new AssociationMember(this));
      }
      e.stopPropagation();
    }
  }

  private _stopLinking() {
    const link = this._linking;
    link.active = false;

    this.removeSourceIndicator();
    this.removeTargetIndicator();
    link.currentTarget = null;

    if (link.tempLine) {
      const line = link.tempLine;
      gsap.to(line, {
        pixi: { alpha: 0 },
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          const idx = this.project.stage.indexOf(line);
          if (idx !== -1) this.project.stage.splice(idx, 1);
          line.sourcePoint = null;
          line.targetPoint = null;
          line.sourceRotation = null;
          line.targetRotation = null;
          line.alpha = 1; // 重置透明度供下次使用
        },
      });
    }
  }

  @on("globalpointermove")
  protected _Entity_globalpointermove(e: FederatedPointerEvent) {
    const link = this._linking;
    if (!link.active || !link.tempLine) return;

    const mousePos = e.client;
    const worldPos = this.project.viewport.toWorld(mousePos);
    const tempLine = link.tempLine;

    // 1. 更新临时线段终点
    if (!link.currentTarget) {
      tempLine.targetPoint = worldPos;
    }

    // 2. 源锚点吸附逻辑
    const bounds = this.getBounds().rectangle;
    const snap = Settings.lineEdgeSourceAnchorSnapRange;
    if (
      mousePos.x >= bounds.x - snap &&
      mousePos.x <= bounds.right + snap &&
      mousePos.y >= bounds.y - snap &&
      mousePos.y <= bounds.bottom + snap
    ) {
      tempLine.sourceRotation = getRotationByAnchor(getBestAnchor(bounds, mousePos));
    }

    // 3. 更新线段对象位置（对齐其包围盒）
    if (tempLine.sourcePoint && tempLine.targetPoint) {
      tempLine.position.set(
        Math.min(tempLine.sourcePoint.x, tempLine.targetPoint.x),
        Math.min(tempLine.sourcePoint.y, tempLine.targetPoint.y),
      );
    }

    // 4. 目标范围检测
    if (link.currentTarget) {
      const tBounds = link.currentTarget.getBounds().rectangle;
      const tSnap = Settings.lineEdgeTargetAnchorSnapRange;
      const isOutside =
        mousePos.x < tBounds.x - tSnap ||
        mousePos.x > tBounds.right + tSnap ||
        mousePos.y < tBounds.y - tSnap ||
        mousePos.y > tBounds.bottom + tSnap;

      if (isOutside) {
        link.currentTarget = null;
        this.removeTargetIndicator();
        tempLine.targetPoint = worldPos;
      }
    }

    // 5. 更新指示器
    this.updateSourceIndicator();
    if (link.currentTarget) {
      this.updateTargetIndicator(false, mousePos);
    }
  }

  _onUpdate(point?: ObservablePoint): void {
    super._onUpdate(point);
    this.emit("update");
  }

  destroy(options?: DestroyOptions): void {
    this.project.off("pointer-enter-stage-object", this._onPointerEnterStageObject);
    this.removeSourceIndicator();
    this.removeTargetIndicator();
    if (this._linking.tempLine) {
      this._linking.tempLine.destroy();
    }
    super.destroy(options);
  }

  // --- 指示器管理 ---

  private updateSourceIndicator(force = false) {
    const link = this._linking;
    if (!link.tempLine) return;

    const anchor = getAnchorByRotation(link.tempLine.sourceRotation);

    if (!link.sourceIndicator || force) {
      this.removeSourceIndicator();
      link.sourceIndicator = this._createIndicator(0x3b82f6);
      this.project.viewport.addChild(link.sourceIndicator);
    }

    this._syncIndicator(link.sourceIndicator, this, anchor, true);
  }

  private updateTargetIndicator(force = false, mousePos?: Point) {
    const link = this._linking;
    if (!link.currentTarget) return;

    const anchor = mousePos
      ? getBestAnchor(link.currentTarget.getBounds().rectangle, mousePos)
      : link.lastTargetAnchor || "left";

    if (!link.targetIndicator || force) {
      this.removeTargetIndicator();
      link.targetIndicator = this._createIndicator(0x10b981);
      this.project.viewport.addChild(link.targetIndicator);
    }

    this._syncIndicator(link.targetIndicator, link.currentTarget, anchor, false);
  }

  private _createIndicator(color: number): Graphics {
    const g = new Graphics();
    g.rect(-2, -0.5, 4, 1).fill({ color });
    g.zIndex = 9999;
    return g;
  }

  private _syncIndicator(g: Graphics, entity: Entity, anchor: Anchor, isSource: boolean) {
    const link = this._linking;
    const lastAnchor = isSource ? link.lastSourceAnchor : link.lastTargetAnchor;
    const bounds = entity.getWorldBounds().rectangle;

    const targetRotation = getRotationByAnchor(anchor);
    let tx = bounds.x + bounds.width / 2;
    let ty = bounds.y + bounds.height / 2;
    let tLen = 0;

    switch (anchor) {
      case "right":
        tx += bounds.width / 2;
        tLen = bounds.height;
        break;
      case "left":
        tx -= bounds.width / 2;
        tLen = bounds.height;
        break;
      case "bottom":
        ty += bounds.height / 2;
        tLen = bounds.width;
        break;
      case "top":
        ty -= bounds.height / 2;
        tLen = bounds.width;
        break;
    }

    const onSync = () => {
      const line = link.tempLine;
      if (!line) return;
      if (isSource) {
        line.sourcePoint = g.position;
        line.sourceRotation = g.rotation;
      } else {
        line.targetPoint = g.position;
        line.targetRotation = g.rotation;
      }
      line.refresh();
    };

    if (lastAnchor === null) {
      // 初始显示
      g.rotation = targetRotation;
      g.position.set(tx, ty);
      g.scale.y = tLen;
      onSync();
      gsap.from(g, { pixi: { scaleX: 2, scaleY: tLen * 2 }, duration: 0.3, ease: "back.out" });
    } else if (lastAnchor !== anchor) {
      // 锚点切换动画
      const diff = ((targetRotation - g.rotation + Math.PI) % (Math.PI * 2)) - Math.PI;
      gsap.to(g, {
        rotation: g.rotation + diff,
        pixi: { x: tx, y: ty, scaleY: tLen },
        duration: 0.25,
        ease: "power2.out",
        onUpdate: onSync,
      });
    } else {
      // 锚点未变，直接同步位置
      g.position.set(tx, ty);
      g.scale.y = tLen;
      onSync();
    }

    if (isSource) link.lastSourceAnchor = anchor;
    else link.lastTargetAnchor = anchor;
  }

  private removeSourceIndicator() {
    const link = this._linking;
    if (link.sourceIndicator) {
      gsap.killTweensOf(link.sourceIndicator);
      link.sourceIndicator.destroy();
      link.sourceIndicator = null;
    }
    link.lastSourceAnchor = null;
  }

  private removeTargetIndicator() {
    const link = this._linking;
    if (link.targetIndicator) {
      gsap.killTweensOf(link.targetIndicator);
      link.targetIndicator.destroy();
      link.targetIndicator = null;
    }
    link.lastTargetAnchor = null;
  }
}

/**
 * 计算锚点方位与旋转的工具函数
 */

function getBestAnchor(bounds: Rectangle, point: Point): Anchor {
  const dx = (point.x - (bounds.x + bounds.width / 2)) / bounds.width;
  const dy = (point.y - (bounds.y + bounds.height / 2)) / bounds.height;
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "top" : "bottom";
}

function getAnchorByRotation(rotation: number | null): Anchor {
  if (rotation === null) return "right";
  let deg = ((((rotation * (180 / Math.PI) + 180) % 360) + 360) % 360) - 180;
  if (deg >= -45 && deg < 45) return "right";
  if (deg >= 45 && deg < 135) return "bottom";
  if (deg >= 135 || deg < -135) return "left";
  return "top";
}

function getRotationByAnchor(anchor: Anchor): number {
  const angles = { right: 0, bottom: 90, left: 180, top: 270 };
  return (angles[anchor] * Math.PI) / 180;
}
