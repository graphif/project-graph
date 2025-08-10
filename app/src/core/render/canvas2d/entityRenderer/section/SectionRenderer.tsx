import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Settings } from "@/core/service/Settings";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { getTextSize } from "@/utils/font";
import { Color } from "@graphif/color";
import { Vector } from "@graphif/data-structures";
import { CubicBezierCurve, Rectangle } from "@graphif/shapes";

@service("sectionRenderer")
export class SectionRenderer {
  constructor(private readonly project: Project) {}

  /** 画折叠状态 */
  private renderCollapsed(section: Section) {
    // 折叠状态
    const renderRectangle = new Rectangle(
      this.project.renderer.transformWorld2View(section.rectangle.location),
      section.rectangle.size.multiply(this.project.camera.currentScale),
    );
    this.project.shapeRenderer.renderRect(
      renderRectangle,
      section.color,
      this.project.stageStyleManager.currentStyle.StageObjectBorder.mix(Color.Black, 0.5),
      2 * this.project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
    );
    // 外框
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(section.rectangle.location.subtract(Vector.same(4))),
        section.rectangle.size.add(Vector.same(4 * 2)).multiply(this.project.camera.currentScale),
      ),
      section.color,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * this.project.camera.currentScale,
      Renderer.NODE_ROUNDED_RADIUS * 1.5 * this.project.camera.currentScale,
    );
    if (!section.isEditingTitle) {
      this.project.textRenderer.renderText(
        section.text,
        this.project.renderer.transformWorld2View(section.rectangle.location.add(Vector.same(Renderer.NODE_PADDING))),
        Renderer.FONT_SIZE * this.project.camera.currentScale,
        section.color.a === 1
          ? section.color.invert()
          : this.project.stageStyleManager.currentStyle.Background.invert(),
      );
    }
  }

  // 非折叠状态
  private renderNoCollapse(section: Section) {
    let borderWidth = 2 * this.project.camera.currentScale;
    if (Settings.sectionBitTitleRenderType !== "none") {
      borderWidth =
        this.project.camera.currentScale > Settings.ignoreTextNodeTextRenderLessThanCameraScale
          ? 2 * this.project.camera.currentScale
          : 2;
    }
    // 注意：这里只能画边框
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(section.rectangle.location),
        section.rectangle.size.multiply(this.project.camera.currentScale),
      ),
      Color.Transparent,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      borderWidth,
      Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
    );

    if (
      this.project.camera.currentScale > Settings.ignoreTextNodeTextRenderLessThanCameraScale &&
      !section.isEditingTitle
    ) {
      // 正常显示标题
      this.project.textRenderer.renderText(
        section.text,
        this.project.renderer.transformWorld2View(section.rectangle.location.add(Vector.same(Renderer.NODE_PADDING))),
        Renderer.FONT_SIZE * this.project.camera.currentScale,
        section.color.a === 1
          ? section.color.invert()
          : this.project.stageStyleManager.currentStyle.Background.invert(),
      );
    }
  }

  renderBackgroundColor(section: Section) {
    const color = section.color.clone();
    color.a = Math.min(color.a, 0.5);
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(section.rectangle.location),
        section.rectangle.size.multiply(this.project.camera.currentScale),
      ),
      color,
      Color.Transparent,
      0,
      Renderer.NODE_ROUNDED_RADIUS * this.project.camera.currentScale,
    );
  }

  /**
   * 渲染覆盖了的大标题
   * @param section
   * @returns
   */
  renderBigCoveredTitle(section: Section) {
    if (this.project.camera.currentScale >= Section.bigTitleCameraScale) {
      return;
    }
    const fontSizeVector = this.getFontSizeBySectionSize(section);
    const fontHeight = fontSizeVector.y;
    this.project.shapeRenderer.renderRect(
      new Rectangle(
        this.project.renderer.transformWorld2View(section.rectangle.location),
        section.rectangle.size.multiply(this.project.camera.currentScale),
      ),
      section.color.a === 0
        ? this.project.stageStyleManager.currentStyle.Background.toNewAlpha(0.5)
        : section.color.toNewAlpha(0.5),
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * this.project.camera.currentScale,
    );
    // 缩放过小了，显示巨大化文字
    this.project.textRenderer.renderTextFromCenter(
      section.text,
      this.project.renderer.transformWorld2View(section.rectangle.center),
      fontHeight * this.project.camera.currentScale,
      section.color.a === 1 ? section.color.invert() : this.project.stageStyleManager.currentStyle.Background.invert(),
    );
  }

  /**
   * 渲染框的标题，以Figma白板的方式
   * @param section
   * @returns
   */
  renderTopTitle(section: Section) {
    if (this.project.camera.currentScale >= Section.bigTitleCameraScale) {
      return;
    }
    const fontSize = 20 * (0.5 * this.project.camera.currentScale + 0.5);
    const leftTopLocation = section.collisionBox.getRectangle().leftTop;
    const leftTopViewLocation = this.project.renderer.transformWorld2View(leftTopLocation);
    const leftTopFontViewLocation = leftTopViewLocation.subtract(new Vector(0, fontSize));
    const bgColor =
      section.color.a === 0
        ? this.project.stageStyleManager.currentStyle.Background.toNewAlpha(0.5)
        : section.color.toNewAlpha(0.5);

    const textColor =
      section.color.a === 1 ? section.color.invert() : this.project.stageStyleManager.currentStyle.Background.invert();
    const textSize = getTextSize(section.text, fontSize);
    this.project.shapeRenderer.renderRect(
      new Rectangle(leftTopFontViewLocation, textSize).expandFromCenter(2),
      bgColor,
      this.project.stageStyleManager.currentStyle.StageObjectBorder,
      2 * this.project.camera.currentScale,
      2,
    );

    this.project.textRenderer.renderText(section.text, leftTopFontViewLocation, fontSize, textColor);
  }

  private getFontSizeBySectionSize(section: Section): Vector {
    // 缩放过小了，显示巨大化文字
    this.project.textRenderer.renderText("", Vector.getZero(), 100);

    const textSize = this.project.canvas.ctx.measureText(section.text);
    const width = textSize.width;
    const height = 100;
    // 计算文字宽高比
    const ratio = width / height;
    // 计算section宽高比
    const sectionRatio = section.rectangle.size.x / section.rectangle.size.y;

    let fontHeight;
    if (sectionRatio < ratio) {
      fontHeight = section.rectangle.size.x / ratio;
    } else {
      fontHeight = section.rectangle.size.y;
    }
    return new Vector(ratio * fontHeight, fontHeight);
  }

  render(section: Section): void {
    if (section.isHiddenBySectionCollapse) {
      return;
    }

    if (section.isCollapsed) {
      // 折叠状态
      this.renderCollapsed(section);
    } else {
      // 非折叠状态
      this.renderNoCollapse(section);
    }

    if (section.isSelected) {
      // 在外面增加一个框
      this.project.collisionBoxRenderer.render(
        section.collisionBox,
        this.project.stageStyleManager.currentStyle.CollideBoxSelected,
      );
    }
    // debug: 绿色虚线 观察父子关系
    if (Settings.showDebug) {
      for (const child of section.children) {
        const start = section.rectangle.topCenter;
        const end = child.collisionBox.getRectangle().leftTop;
        const DIS = 100;
        // const rate = (end.y - start.y) / section.rectangle.height;
        this.project.curveRenderer.renderGradientBezierCurve(
          new CubicBezierCurve(
            this.project.renderer.transformWorld2View(start),
            this.project.renderer.transformWorld2View(start.add(new Vector(0, -DIS))),
            this.project.renderer.transformWorld2View(end.add(new Vector(0, -DIS))),
            this.project.renderer.transformWorld2View(end),
          ),
          Color.Green,
          Color.Red,
          2 * this.project.camera.currentScale,
        );
      }
    }
    this.project.entityRenderer.renderEntityDetails(section);
  }
}
