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
        const textNode = new TextNode(project, { text: "...", position: project.viewport.toWorld(e.client) });
        project.stage.push(textNode);
        // 把节点的中心点移动到鼠标位置
        console.log(textNode.width);
        textNode.position.set(textNode.x - textNode.width / 2, textNode.y - textNode.height / 2);
        // 进入编辑状态
        textNode.textInput.activate();
      }
      lastClickTime = now;
      lastClickPoint = project.viewport.toWorld(e.client);
    });
  }
}
