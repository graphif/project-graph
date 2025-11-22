import { Container, DestroyOptions, Point } from "pixi.js";
import { Project } from "../Project";

/** 在舞台空白处右键触发右键菜单 */
export class GlobalContextMenuTrigger extends Container {
  private onPointerDown: ((e: any) => void) | null = null;
  private onPointerUp: ((e: any) => void) | null = null;

  constructor(private project: Project) {
    super();

    const startPoint = new Point(0, 0);

    this.onPointerDown = (e) => {
      startPoint.copyFrom(e.client);
    };

    this.onPointerUp = (e) => {
      if (e.button === 2 && e.client.equals(startPoint)) {
        project.emit("context-menu", e.client);
      }
    };

    project.viewport.on("pointerdown", this.onPointerDown).on("pointerup", this.onPointerUp);
  }

  destroy(options?: DestroyOptions): void {
    // 移除事件监听器
    if (this.onPointerDown) {
      this.project.viewport.off("pointerdown", this.onPointerDown);
    }
    if (this.onPointerUp) {
      this.project.viewport.off("pointerup", this.onPointerUp);
    }

    this.onPointerDown = null;
    this.onPointerUp = null;

    super.destroy(options);
  }
}
