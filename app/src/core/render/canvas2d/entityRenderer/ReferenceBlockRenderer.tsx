import { Project, service } from "@/core/Project";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { Color } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 引用块节点渲染器
 */
@service("referenceBlockRenderer")
export class ReferenceBlockRenderer {
  constructor(private readonly project: Project) {}

  render(referenceBlockNode: ReferenceBlockNode) {
    // 需要有一个边框
    const renderRectangle = new Rectangle(
      this.project.renderer.transformWorld2View(referenceBlockNode.rectangle.location),
      referenceBlockNode.rectangle.size.multiply(this.project.camera.currentScale),
    );
    this.project.shapeRenderer.renderRect(
      renderRectangle,
      Color.Transparent,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      1 * this.project.camera.currentScale,
    );
    if (referenceBlockNode.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        referenceBlockNode.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }

    if (referenceBlockNode.state === "loading") {
      // 渲染加载状态
      this.project.textRenderer.renderText(
        "Loading...",
        this.project.renderer.transformWorld2View(referenceBlockNode.collisionBox.getRectangle().location),
        12 * this.project.camera.currentScale,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
      return;
    }

    if (referenceBlockNode.state === "notFound" || !referenceBlockNode.bitmap) {
      const rect = referenceBlockNode.collisionBox.getRectangle();
      // 渲染错误状态
      this.project.textRenderer.renderMultiLineTextFromCenter(
        `Not Found: \nfile:"${referenceBlockNode.fileName}"\nsection:"${referenceBlockNode.sectionName}"`,
        this.project.renderer.transformWorld2View(rect.center),
        12 * this.project.camera.currentScale,
        rect.width * 2 * this.project.camera.currentScale,
        this.project.stageStyleManager.currentStyle.effects.warningShadow,
      );
      return;
    }

    // 渲染图片
    this.project.imageRenderer.renderImageBitmap(
      referenceBlockNode.bitmap,
      this.project.renderer.transformWorld2View(referenceBlockNode.collisionBox.getRectangle().location),
      referenceBlockNode.scale,
    );
  }
}
