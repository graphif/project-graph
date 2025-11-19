import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
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
    const renderViewRectangle = new Rectangle(
      this.project.renderer.transformWorld2View(referenceBlockNode.rectangle.location),
      referenceBlockNode.rectangle.size.multiply(this.project.camera.currentScale),
    );
    this.project.shapeRenderer.renderRect(
      renderViewRectangle,
      Color.Transparent,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      1 * this.project.camera.currentScale,
    );

    // 选中状态
    if (referenceBlockNode.isSelected) {
      this.project.collisionBoxRenderer.render(
        referenceBlockNode.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }

    if (referenceBlockNode.state === "loading") {
      // 渲染加载状态
      this.project.textRenderer.renderTextFromCenter(
        "Loading...",
        renderViewRectangle.center,
        12 * this.project.camera.currentScale,
        this.project.stageStyleManager.currentStyle.StageObjectBorder,
      );
      const i = this.project.renderer.frameIndex % 4;
      // 渲染四个边
      if (i === 0) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.leftTop,
          renderViewRectangle.rightTop,
          this.project.stageStyleManager.currentStyle.effects.dash,
          4 * this.project.camera.currentScale,
        );
      } else if (i === 1) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.rightTop,
          renderViewRectangle.rightBottom,
          this.project.stageStyleManager.currentStyle.effects.dash,
          4 * this.project.camera.currentScale,
        );
      } else if (i === 2) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.rightBottom,
          renderViewRectangle.leftBottom,
          this.project.stageStyleManager.currentStyle.effects.dash,
          4 * this.project.camera.currentScale,
        );
      } else if (i === 3) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.leftBottom,
          renderViewRectangle.leftTop,
          this.project.stageStyleManager.currentStyle.effects.dash,
          4 * this.project.camera.currentScale,
        );
      }
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

  /**
   * 渲染这个实体被引用的次数和提示边框
   */
  public renderOneEntityLinkTipAndCount(entity: Entity) {
    // 渲染边框
    const rect = entity.collisionBox.getRectangle();
    const expandRect = rect.expandFromCenter(20);
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(expandRect.location),
        expandRect.size.multiply(this.project.camera.currentScale),
      ),
      Color.Transparent,
      this.project.stageStyleManager.currentStyle.effects.successShadow,
      1 * this.project.camera.currentScale,
      10 * this.project.camera.currentScale,
    );
  }
}
