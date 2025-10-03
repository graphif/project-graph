import { Container, Point } from "pixi.js";
import { Project } from "../Project";
import { TextNode } from "./TextNode";

export class NodeAdder extends Container {
  constructor(project: Project) {
    super();
    let lastClickTime = 0;
    let lastClickPoint = new Point(0, 0);
    project.viewport.on("click", (e) => {
      const now = Date.now();
      if (now - lastClickTime < 300 && lastClickPoint.equals(project.viewport.toWorld(e.client))) {
        project.stage.push(new TextNode(project, { text: "...", position: project.viewport.toWorld(e.client) }));
      }
      lastClickTime = now;
      lastClickPoint = project.viewport.toWorld(e.client);
    });
  }
}
