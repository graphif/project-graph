import { Project, service } from "@/core/Project";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { ReferenceBlockNode } from "@/core/stage/stageObject/entity/ReferenceBlockNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Color, Vector } from "@graphif/data-structures";
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
      const dashColor = new Color(197, 174, 243);
      const lineWidth = 16 * this.project.camera.currentScale;
      // 渲染四个边
      if (i === 0) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.leftTop,
          renderViewRectangle.rightTop,
          dashColor,
          lineWidth,
        );
      } else if (i === 1) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.rightTop,
          renderViewRectangle.rightBottom,
          dashColor,
          lineWidth,
        );
      } else if (i === 2) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.rightBottom,
          renderViewRectangle.leftBottom,
          dashColor,
          lineWidth,
        );
      } else if (i === 3) {
        this.project.curveRenderer.renderSolidLine(
          renderViewRectangle.leftBottom,
          renderViewRectangle.leftTop,
          dashColor,
          lineWidth,
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

    if (referenceBlockNode.state === "success" && !referenceBlockNode.isSelected) {
      const baseRect = referenceBlockNode.collisionBox.getRectangle();
      // 渲染外层括号
      this.renderBrackets(baseRect.expandFromCenter(8), new Color(118, 78, 209));
      // 渲染内层括号
      this.renderBrackets(baseRect.expandFromCenter(4), new Color(169, 136, 238));
    }
  }

  /**
   * 渲染中括号边框
   */
  private renderBrackets(rect: Rectangle, color: Color) {
    const renderViewRectangle = new Rectangle(
      this.project.renderer.transformWorld2View(rect.location),
      rect.size.multiply(this.project.camera.currentScale),
    );
    const lineWidth = 4 * this.project.camera.currentScale;
    const bracketLength = 30 * this.project.camera.currentScale;

    // 渲染左右竖线
    this.project.curveRenderer.renderSolidLine(
      renderViewRectangle.leftTop,
      renderViewRectangle.leftBottom,
      color,
      lineWidth,
    );
    this.project.curveRenderer.renderSolidLine(
      renderViewRectangle.rightTop,
      renderViewRectangle.rightBottom,
      color,
      lineWidth,
    );

    // 渲染左括号的上下横线
    this.project.curveRenderer.renderSolidLine(
      renderViewRectangle.leftTop,
      renderViewRectangle.leftTop.add(new Vector(bracketLength, 0)),
      color,
      lineWidth,
    );
    this.project.curveRenderer.renderSolidLine(
      renderViewRectangle.leftBottom,
      renderViewRectangle.leftBottom.add(new Vector(bracketLength, 0)),
      color,
      lineWidth,
    );

    // 渲染右括号的上下横线
    this.project.curveRenderer.renderSolidLine(
      renderViewRectangle.rightTop,
      renderViewRectangle.rightTop.add(new Vector(-bracketLength, 0)),
      color,
      lineWidth,
    );
    this.project.curveRenderer.renderSolidLine(
      renderViewRectangle.rightBottom,
      renderViewRectangle.rightBottom.add(new Vector(-bracketLength, 0)),
      color,
      lineWidth,
    );
  }

  /**
   * 渲染被引用的section边框
   */
  public renderSourceSectionBorder(section: Section, countNumber: number, color: Color = new Color(118, 78, 209)) {
    // 获取section的矩形，向外膨胀20像素
    const worldRect = section.rectangle.expandFromCenter(8);
    const renderViewRect = new Rectangle(
      this.project.renderer.transformWorld2View(worldRect.location),
      worldRect.size.multiply(this.project.camera.currentScale),
    );

    const lineWidth = 8 * this.project.camera.currentScale;

    // 计算各边中点
    const topMid = new Vector(renderViewRect.leftTop.x + renderViewRect.size.x / 2, renderViewRect.leftTop.y);
    const leftMid = new Vector(renderViewRect.leftTop.x, renderViewRect.leftTop.y + renderViewRect.size.y / 2);
    const bottomMid = new Vector(
      renderViewRect.rightBottom.x - renderViewRect.size.x / 2,
      renderViewRect.rightBottom.y,
    );
    const rightMid = new Vector(renderViewRect.rightBottom.x, renderViewRect.rightBottom.y - renderViewRect.size.y / 2);

    // 绘制左上角括号：左到上中点，上到左中点
    this.project.curveRenderer.renderSolidLine(renderViewRect.leftTop, topMid, color, lineWidth);
    this.project.curveRenderer.renderSolidLine(renderViewRect.leftTop, leftMid, color, lineWidth);

    // 绘制右下角括号：右到下中点，下到右中点
    this.project.curveRenderer.renderSolidLine(renderViewRect.rightBottom, bottomMid, color, lineWidth);
    this.project.curveRenderer.renderSolidLine(renderViewRect.rightBottom, rightMid, color, lineWidth);

    // 在左上角渲染计数
    const textWorldLocation = worldRect.leftTop.add(new Vector(0, -10));
    const textViewLocation = this.project.renderer.transformWorld2View(textWorldLocation);
    const textViewPosition = textViewLocation.add(new Vector(-20, -20).multiply(this.project.camera.currentScale));
    const fontSize = 32 * this.project.camera.currentScale;
    const circleRadius = fontSize * 0.8;

    // 绘制紫色圆形背景
    this.project.shapeRenderer.renderCircle(textViewPosition, circleRadius, color, Color.Transparent, 0);

    // 绘制白色文字，中心对准圆心
    this.project.textRenderer.renderTextFromCenter(countNumber.toString(), textViewPosition, fontSize, Color.White);
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
