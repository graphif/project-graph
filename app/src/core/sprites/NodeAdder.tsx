import { Container, DestroyOptions, Point } from "pixi.js";
import { Project } from "../Project";
import { TextNode } from "./TextNode";

export class NodeAdder extends Container {
  private onClickHandler: ((e: any) => void) | null = null;

  constructor(private project: Project) {
    super();
    let lastClickTime = 0;
    let lastClickPoint = new Point(0, 0);

    this.onClickHandler = (e) => {
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
    };

    project.viewport.on("click", this.onClickHandler);
  }

  override destroy(options?: DestroyOptions): void {
    // 移除事件监听器
    if (this.onClickHandler) {
      this.project.viewport.off("click", this.onClickHandler);
      this.onClickHandler = null;
    }
    super.destroy(options);
  }
}
