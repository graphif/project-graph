import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { UrlNode } from "@/core/stage/stageObject/entity/UrlNode";
import { colorInvert, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

@service("urlNodeRenderer")
export class UrlNodeRenderer {
  constructor(private readonly project: Project) {}

  render(urlNode: UrlNode): void {
    if (urlNode.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        urlNode.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }
    // 节点身体矩形
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(urlNode.rectangle.location),
        urlNode.rectangle.size.multiply(this.project.camera.currentScale),
      ),
      urlNode.color,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * this.project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
    );
    // 绘制标题
    if (!urlNode.isEditingTitle) {
      this.project.textRenderer.renderText(
        urlNode.title,
        this.project.renderer.transformWorld2View(urlNode.rectangle.location.add(Vector.same(Renderer.NODE_PADDING))),
        Renderer.FONT_SIZE * this.project.camera.currentScale,
        urlNode.color.a === 1
          ? colorInvert(urlNode.color)
          : colorInvert(this.project.stageStyleManager.currentStyle.Background),
      );
    }
    // 绘制分界线
    this.project.curveRenderer.renderDashedLine(
      this.project.renderer.transformWorld2View(urlNode.rectangle.location.add(new Vector(0, UrlNode.titleHeight))),
      this.project.renderer.transformWorld2View(
        urlNode.rectangle.location.add(new Vector(urlNode.rectangle.size.x, UrlNode.titleHeight)),
      ),
      urlNode.color.a === 1
        ? colorInvert(urlNode.color)
        : colorInvert(this.project.stageStyleManager.currentStyle.Background),
      1 * this.project.camera.currentScale,
      4 * this.project.camera.currentScale,
    );
    // 绘制url
    this.project.textRenderer.renderText(
      urlNode.url.length > 35 ? urlNode.url.slice(0, 35) + "..." : urlNode.url,
      this.project.renderer.transformWorld2View(
        urlNode.rectangle.location.add(new Vector(Renderer.NODE_PADDING, UrlNode.titleHeight + Renderer.NODE_PADDING)),
      ),
      Renderer.FONT_SIZE * 0.5 * this.project.camera.currentScale,
      urlNode.color.a === 1
        ? colorInvert(urlNode.color)
        : colorInvert(this.project.stageStyleManager.currentStyle.Background),
    );
    // 绘制特效
    this.renderHoverState(urlNode);
  }

  private renderHoverState(urlNode: UrlNode): void {
    const mouseLocation = this.project.renderer.transformView2World(MouseLocation.vector());
    if (urlNode.titleRectangle.isPointIn(mouseLocation)) {
      // 鼠标在标题上
      this.project.shapeRenderer.renderRect(
        this.project.renderer.transformWorld2View(urlNode.titleRectangle),
        this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
        2 * this.project.camera.currentScale,
        0,
      );
    } else if (urlNode.urlRectangle.isPointIn(mouseLocation)) {
      // 鼠标在url上
      this.project.shapeRenderer.renderRect(
        this.project.renderer.transformWorld2View(urlNode.urlRectangle),
        this.project.stageStyleManager.currentStyle.CollideBoxPreSelected,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
        2 * this.project.camera.currentScale,
        0,
      );
      // 绘制提示
      this.project.textRenderer.renderText(
        "双击打开链接",
        this.project.renderer.transformWorld2View(urlNode.rectangle.leftBottom.add(new Vector(0, 20))),
        Renderer.FONT_SIZE * 0.5 * this.project.camera.currentScale,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
    }
  }
}
