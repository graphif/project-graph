import { Container, Point } from "pixi.js";
import { Project } from "../Project";

/** 在舞台空白处右键触发右键菜单 */
export class GlobalContextMenuTrigger extends Container {
  constructor(project: Project) {
    super();

    const startPoint = new Point(0, 0);
    project.viewport
      .on("pointerdown", (e) => {
        startPoint.copyFrom(e.client);
      })
      .on("pointerup", (e) => {
        if (e.button === 2 && e.client.equals(startPoint)) {
          project.emit("context-menu", e.client);
        }
      });
  }
}
