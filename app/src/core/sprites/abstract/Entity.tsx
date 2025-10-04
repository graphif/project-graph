import { StageObject } from "@/core/sprites/abstract/StageObject";
import { serializable } from "@graphif/serializer";
import { FederatedEventHandler, FederatedPointerEvent, Point } from "pixi.js";
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
  }

  // HACK: 如果直接用event.movement处理移动可能会漂移，暂时没有找到原因
  private pressed = false;
  private startWorldPoint = new Point(0, 0);
  private startPoint = new Point(0, 0);
  onpointerdown?: FederatedEventHandler<FederatedPointerEvent> | null | undefined = (e) => {
    e.stopImmediatePropagation();
    this.pressed = true;
    const world = this.project.viewport.toWorld(e.global.x, e.global.y);
    this.startWorldPoint = world;
    this.startPoint = this.position.clone();

    this.selected = true;
  };
  onpointerup?: FederatedEventHandler<FederatedPointerEvent> | null | undefined = () => {
    this.pressed = false;
  };
  onpointerupoutside?: FederatedEventHandler<FederatedPointerEvent> | null | undefined = () => {
    this.pressed = false;
  };
  onglobalpointermove?: FederatedEventHandler<FederatedPointerEvent> | null | undefined = (e) => {
    if (this.pressed) {
      const world = this.project.viewport.toWorld(e.global.x, e.global.y);
      const dx = world.x - this.startWorldPoint.x;
      const dy = world.y - this.startWorldPoint.y;
      this.position.set(this.startPoint.x + dx, this.startPoint.y + dy);
    }
  };
}
