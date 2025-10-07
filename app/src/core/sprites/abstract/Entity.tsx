import { Project } from "@/core/Project";
import { StageObject } from "@/core/sprites/abstract/StageObject";
import { serializable } from "@graphif/serializer";
import { ObservablePoint, Point } from "pixi.js";
import type { Value } from "platejs";
import { LineEdge } from "../LineEdge";
import { TempLineEdge } from "../TempLineEdge";
import { AssociationMember } from "./Association";
/**
 * 实体
 * 一切独立存在、能被移动的东西，且放在框里能被连带移动的东西
 */
export abstract class Entity extends StageObject {
  public allowAssociation: boolean = true;

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
    const onPointerEnterStageObject = (so: StageObject) => {
      if (linking && so instanceof Entity) {
        const onPointerUp = () => {
          linking = false;
          this.project.stage.push(
            new LineEdge(this.project, {
              members: [new AssociationMember(this, "right"), new AssociationMember(so, "left")],
            }),
          );
        };
        so.once("pointerup", onPointerUp);
        so.once("pointerleave", () => {
          so.off("pointerup", onPointerUp);
        });
      }
    };
    this.on("pointerdown", (e) => {
      e.stopPropagation();
      const world = this.project.viewport.toWorld(e.client);
      startWorldPoint.copyFrom(world);
      startPoint.copyFrom(this.position);
      if (e.button === 0) {
        moving = true;
      } else if (e.button === 2) {
        linking = true;
        tempLineEdge.endPoint.copyFrom(world);
        this.project.stage.push(tempLineEdge);
        this.project.on("pointer-enter-stage-object", onPointerEnterStageObject);
      }
    })
      .on("pointerup", (e) => {
        moving = false;
        const world = this.project.viewport.toWorld(e.client);
        if (e.button === 2 && world.equals(startWorldPoint) && !linking) {
          // 触发右键菜单
          this.project.emit("context-menu", e.client);
        }
        linking = false;
        tempLineEdge.removeFromParent();
        this.project.off("pointer-enter-stage-object", onPointerEnterStageObject);
      })
      .on("pointerupoutside", () => {
        moving = false;
        linking = false;
        tempLineEdge.removeFromParent();
        this.project.off("pointer-enter-stage-object", onPointerEnterStageObject);
      })
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
          // 检测是否碰到了自己的边缘2px,如果碰到了就设置anchor
          const pos = this.project.viewport.toWorld(e.client);
          const bounds = this.getBounds();
          if (pos.x >= bounds.x - 2 && pos.x <= bounds.x + 2) {
            tempLineEdge.source.anchor = "left";
          } else if (pos.x >= bounds.x + bounds.width - 2 && pos.x <= bounds.x + bounds.width + 2) {
            tempLineEdge.source.anchor = "right";
          } else if (pos.y >= bounds.y - 2 && pos.y <= bounds.y + 2) {
            tempLineEdge.source.anchor = "top";
          } else if (pos.y >= bounds.y + bounds.height - 2 && pos.y <= bounds.y + bounds.height + 2) {
            tempLineEdge.source.anchor = "bottom";
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
