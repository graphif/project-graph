import { Project, service } from "@/core/Project";
import { Renderer } from "@/core/render/canvas2d/renderer";
import { Settings } from "@/core/service/Settings";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { getTextSize } from "@/utils/font";
import { Color, colorInvert, mixColors, Vector } from "@graphif/data-structures";
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
      mixColors(this.project.stageStyleManager.currentStyle.StageObjectBorder, Color.Black, 0.5),
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
          ? colorInvert(section.color)
          : colorInvert(this.project.stageStyleManager.currentStyle.Background),
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
          ? colorInvert(section.color)
          : colorInvert(this.project.stageStyleManager.currentStyle.Background),
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
    // TODO: 性能有待优化
    // 计算视野范围矩形
    const viewRect = this.project.renderer.getCoverWorldRectangle();
    // 计算section框的最长边
    const sectionMaxSide = Math.max(section.rectangle.size.x, section.rectangle.size.y);
    // 计算视野范围矩形的最长边
    const viewMaxSide = Math.max(viewRect.size.x, viewRect.size.y);
    // 判断是否需要渲染大标题形态
    if (
      sectionMaxSide >= viewMaxSide * Settings.sectionBigTitleThresholdRatio ||
      this.project.camera.currentScale > Settings.sectionBigTitleCameraScaleThreshold
    ) {
      return;
    }
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
    this.project.textRenderer.renderTextInRectangle(
      section.text,
      new Rectangle(
        this.project.renderer.transformWorld2View(section.rectangle.location),
        section.rectangle.size.multiply(this.project.camera.currentScale),
      ),
      section.color.a === 1
        ? colorInvert(section.color)
        : colorInvert(this.project.stageStyleManager.currentStyle.Background),
    );
  }

  /**
   * 渲染框的标题，以Figma白板的方式
   * @param section
   * @returns
   */
  renderTopTitle(section: Section) {
    // TODO: 性能有待优化
    // 计算视野范围矩形
    const viewRect = this.project.renderer.getCoverWorldRectangle();
    // 计算section框的最长边
    const sectionMaxSide = Math.max(section.rectangle.size.x, section.rectangle.size.y);
    // 计算视野范围矩形的最长边
    const viewMaxSide = Math.max(viewRect.size.x, viewRect.size.y);
    // 判断是否需要渲染大标题形态
    if (
      sectionMaxSide >= viewMaxSide * Settings.sectionBigTitleThresholdRatio ||
      this.project.camera.currentScale > Settings.sectionBigTitleCameraScaleThreshold
    ) {
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
      section.color.a === 1
        ? colorInvert(section.color)
        : colorInvert(this.project.stageStyleManager.currentStyle.Background);
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

  // private getFontSizeBySectionSize(section: Section): Vector {
  //   // 使用getTextSize获取准确的文本尺寸
  //   const baseFontSize = 100;
  //   const measuredSize = getTextSize(section.text, baseFontSize);
  //   const ratio = measuredSize.x / measuredSize.y;
  //   const sectionRatio = section.rectangle.size.x / section.rectangle.size.y;

  //   // 计算最大可用字体高度
  //   let fontHeight;
  //   const paddingRatio = 0.9; // 增加边距比例，确保文字不会贴边
  //   if (sectionRatio < ratio) {
  //     // 宽度受限
  //     fontHeight = (section.rectangle.size.x / ratio) * paddingRatio;
  //   } else {
  //     // 高度受限
  //     fontHeight = section.rectangle.size.y * paddingRatio;
  //   }

  //   // 确保字体大小合理
  //   const minFontSize = 8;
  //   const maxFontSize = Math.max(section.rectangle.size.x, section.rectangle.size.y) * 0.8; // 限制最大字体
  //   fontHeight = Math.max(minFontSize, Math.min(fontHeight, maxFontSize));

  //   return new Vector(ratio * fontHeight, fontHeight);
  // }

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

    if (!section.isSelected && this.project.references.sections[section.text]) {
      this.project.referenceBlockRenderer.renderSourceSectionBorder(
        section,
        this.project.references.sections[section.text].length,
      );
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
  }
}
