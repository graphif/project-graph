import { Project } from "@/core/Project";
import { StageObject } from "@/core/sprites/abstract/StageObject";
import { serializable } from "@graphif/serializer";
import { FederatedPointerEvent, ObservablePoint, Point } from "pixi.js";
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
   * 这两个是实例属性而不是静态属性
   * 一方面，保持和pixi的风格一致
   * 另一方面，这样方便通过一个实例判断是否能有子节点，比如stageObject.allowGraphChildren，而不需要获取构造函数
   * pixi用实例属性的原因如下:
   * zty012: Why is Container.allowChildren an instance property? Shouldn't it be a static property instead?
   * LunarRaid: Really it should be a per-class getter, but it's basically being treated as such.
   * LunarRaid: It's utilized to determine if Container subclasses can have children or not. Most can't.
   */
  allowAssociation: boolean = true;

  /**
   * [
   *  { type: 'p', children: [{ text: 'Serialize just this paragraph.' }] },
   *  { type: 'h1', children: [{ text: 'And this heading.' }] }
   * ]
   */
  @serializable
  public details: Value = [];

  constructor(project: Project) {
    super(project);

    // HACK: 如果直接用event.movement处理移动可能会漂移，暂时没有找到原因
    let moving = false;
    const startWorldPoint = new Point(0, 0);
    const startPoint = new Point(0, 0);
    let linking = false;
    const tempLineEdge = new TempLineEdge(this.project, {
      members: [new AssociationMember(this, "right")],
      endPoint: new Point(0, 0),
    });
    this.project.on("pointer-enter-stage-object", (so, e) => {
      if (linking && so instanceof Entity) {
        // 检测鼠标在舞台对象的哪个1/4区域，即上/下/左/右四个三角形的区域
        const pos = this.project.viewport.toWorld(e.client);
        const bounds = so.getBounds().rectangle;
        let anchor: "left" | "right" | "top" | "bottom";
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        if (Math.abs(dx) > Math.abs(dy)) {
          // 左右区域
          if (dx < 0) {
            anchor = "left";
          } else {
            anchor = "right";
          }
        } else {
          // 上下区域
          if (dy < 0) {
            anchor = "top";
          } else {
            anchor = "bottom";
          }
        }
        const onPointerUp = () => {
          linking = false;
          this.project.stage.push(
            new LineEdge(this.project, {
              members: [new AssociationMember(this, tempLineEdge.source.anchor), new AssociationMember(so, anchor)],
            }),
          );
        };
        so.once("pointerup", onPointerUp);
        so.once("pointerleave", () => {
          so.off("pointerup", onPointerUp);
        });
      }
    });
    const onPointerUp = (e: FederatedPointerEvent) => {
      moving = false;
      const world = this.project.viewport.toWorld(e.client);
      if (e.button === 2 && world.equals(startWorldPoint) && !linking) {
        // 触发右键菜单
        this.project.emit("context-menu", e.client);
      }
      linking = false;
      tempLineEdge.removeFromParent();
      if (e.altKey) {
        e.stopPropagation();
        // 检测碰到了哪个Section
        const target = this.project.stage
          .filter((it) => it instanceof Section)
          .find((section) => {
            const bounds = section.getBounds().rectangle;
            return bounds.contains(world.x, world.y);
          });
        if (target) {
          target.members.push(new AssociationMember(this));
        }
      }
    };
    this.on("pointerdown", (e) => {
      const world = this.project.viewport.toWorld(e.client);
      startWorldPoint.copyFrom(world);
      startPoint.copyFrom(this.position);
      if (e.button === 0) {
        moving = true;
      } else if (e.button === 2) {
        linking = true;
        tempLineEdge.endPoint.copyFrom(world);
        this.project.stage.push(tempLineEdge);
      }
    })
      .on("pointerup", onPointerUp)
      .on("pointerupoutside", onPointerUp)
      .on("globalpointermove", (e) => {
        if (moving) {
          const world = this.project.viewport.toWorld(e.client);
          // const x = startPoint.x + world.x - startWorldPoint.x;
          // const y = startPoint.y + world.y - startWorldPoint.y;
          const pos = startPoint.add(world).subtract(startWorldPoint);
          this.position.copyFrom(pos);
          // this.emit("_moved");
          // this.project.pixi.renderer.render(this);
        }
        if (linking) {
          const pos = this.project.viewport.toWorld(e.client);
          const bounds = this.getBounds();
          // 检测鼠标位置是否在「自己的边缘～边缘向外扩展2px」,如果碰到了就设置anchor，否则什么都不做
          if (
            pos.x >= bounds.left - 2 &&
            pos.x <= bounds.right + 2 &&
            pos.y >= bounds.top - 2 &&
            pos.y <= bounds.bottom + 2
          ) {
            // 碰到了
            let anchor: "left" | "right" | "top" | "bottom";
            const leftDist = Math.abs(pos.x - bounds.left);
            const rightDist = Math.abs(pos.x - bounds.right);
            const topDist = Math.abs(pos.y - bounds.top);
            const bottomDist = Math.abs(pos.y - bounds.bottom);
            const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
            switch (minDist) {
              case leftDist:
                anchor = "left";
                break;
              case rightDist:
                anchor = "right";
                break;
              case topDist:
                anchor = "top";
                break;
              case bottomDist:
                anchor = "bottom";
                break;
              default:
                anchor = "right";
            }
            tempLineEdge.source.anchor = anchor;
          }
          // 把临时线段的终点设置为当前鼠标位置
          const world = this.project.viewport.toWorld(e.client);
          tempLineEdge.endPoint.copyFrom(world);
        }
      });
  }

  _onUpdate(point?: ObservablePoint): void {
    super._onUpdate(point);
    this.emit("update");
  }
}
