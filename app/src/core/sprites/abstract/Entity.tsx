import { StageObject } from "@/core/sprites/abstract/StageObject";
import { serializable } from "@graphif/serializer";
import { Point } from "pixi.js";
import type { Value } from "platejs";
import { LineEdge } from "../LineEdge";
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

  constructor() {
    super();

    // HACK: 如果直接用event.movement处理移动可能会漂移，暂时没有找到原因
    let moving = false;
    let startWorldPoint = new Point(0, 0);
    let startPoint = new Point(0, 0);
    let linking = false;
    this.on("pointerdown", (e) => {
      e.stopPropagation();
      this.selected = true;
      const world = this.project.viewport.toWorld(e.client);
      startWorldPoint = world;
      startPoint = this.position.clone();
      if (e.button === 0) {
        moving = true;
      } else if (e.button === 2) {
        linking = true;
        this.project.once("pointer-enter-stage-object", (so) => {
          if (linking && so instanceof Entity) {
            linking = false;
            this.project.stage.push(
              new LineEdge(this.project, {
                members: [new AssociationMember(this), new AssociationMember(so)],
              }),
            );
          }
        });
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
      })
      .on("pointerupoutside", () => {
        moving = false;
        linking = false;
      })
      .on("globalpointermove", (e) => {
        if (moving) {
          const world = this.project.viewport.toWorld(e.client);
          const dx = world.x - startWorldPoint.x;
          const dy = world.y - startWorldPoint.y;
          this.position = { x: startPoint.x + dx, y: startPoint.y + dy };
          this.refresh();
          this.emit("move");
        }
      });
  }
}
