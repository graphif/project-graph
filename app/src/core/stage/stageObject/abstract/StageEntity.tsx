import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { serializable } from "@graphif/serializer";
import { Point } from "pixi.js";
import type { Value } from "platejs";
/**
 * 实体
 * 一切独立存在、能被移动的东西，且放在框里能被连带移动的东西
 */
export abstract class Entity extends StageObject {
  interactive = true;

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

    // HACK: 如果直接用event.movement可能会漂移，暂时没有找到原因
    let pressed = false;
    let startWorldPoint = new Point(0, 0);
    let startPoint = new Point(0, 0);
    this.on("pointerdown", (e) => {
      e.stopImmediatePropagation();
      pressed = true;
      const world = this.project.viewport.toWorld(e.global.x, e.global.y);
      startWorldPoint = world;
      startPoint = this.position.clone();
    })
      .on("pointerup", () => {
        pressed = false;
      })
      .on("pointerupoutside", () => {
        pressed = false;
      })
      .on("globalpointermove", (e) => {
        if (pressed) {
          const world = this.project.viewport.toWorld(e.global.x, e.global.y);
          const dx = world.x - startWorldPoint.x;
          const dy = world.y - startWorldPoint.y;
          this.position.set(startPoint.x + dx, startPoint.y + dy);
        }
      });
  }
}
