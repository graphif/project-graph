import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import {
  getFontIdentity,
  getTextSize,
  replaceTextWhenProtect,
  resolveFont,
  textToTextArray as splitTextToLines,
} from "@/utils/font";
import { Color, LruCache, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

const TEXT_RENDER_SIZE = 100;

/**
 * 专门用于在Canvas上渲染文字
 * 支持缓存
 * 注意：基于View坐标系
 */
@service("textRenderer")
export class TextRenderer {
  constructor(private readonly project: Project) {}

  private prefixWidth(
    characters: string[],
    length: number,
    size: number,
    fontFamily?: string,
    fontWeight?: string,
  ): number {
    return getTextSize(characters.slice(0, length).join(""), size, fontFamily, fontWeight).x;
  }

  private findPrefixAtWidth(
    characters: string[],
    targetWidth: number,
    size: number,
    fontFamily?: string,
    fontWeight?: string,
  ): number {
    let low = 0;
    let high = characters.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.prefixWidth(characters, middle, size, fontFamily, fontWeight) < targetWidth) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  }

  private visibleTextRun(
    text: string,
    left: number,
    size: number,
    textWidth: number,
    fontFamily?: string,
    fontWeight?: string,
  ): { text: string; left: number } | undefined {
    const viewportWidth = this.project.renderer.w;
    if (viewportWidth <= 0) return { text, left };
    if (left >= viewportWidth || left + textWidth <= 0) return undefined;
    if (textWidth <= viewportWidth * 2 || text.length < 16) return { text, left };

    const characters = Array.from(text);
    const visibleStart = Math.max(0, -left);
    const visibleEnd = Math.min(textWidth, viewportWidth - left);
    const start = Math.max(0, this.findPrefixAtWidth(characters, visibleStart, size, fontFamily, fontWeight) - 1);
    const end = Math.min(
      characters.length,
      this.findPrefixAtWidth(characters, visibleEnd, size, fontFamily, fontWeight) + 1,
    );
    const prefixWidth = this.prefixWidth(characters, start, size, fontFamily, fontWeight);
    return { text: characters.slice(start, end).join(""), left: left + prefixWidth };
  }

  private drawText(
    text: string,
    location: Vector,
    size: number,
    color: Color,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (!Number.isFinite(size) || size <= 0) return;
    const viewportHeight = this.project.renderer.h;
    if (viewportHeight > 0 && (location.y - size * 0.25 >= viewportHeight || location.y + size * 1.25 <= 0)) return;

    const textWidth = getTextSize(text, size, fontFamily, fontWeight).x;
    const visibleRun = this.visibleTextRun(text, location.x, size, textWidth, fontFamily, fontWeight);
    if (!visibleRun) return;

    const ctx = this.project.canvas.ctx;
    const font = resolveFont(TEXT_RENDER_SIZE, fontFamily, fontWeight);
    const fillStyle = color.toString();
    if (ctx.textBaseline !== "middle") ctx.textBaseline = "middle";
    if (ctx.textAlign !== "left") ctx.textAlign = "left";
    if (ctx.font !== font) ctx.font = font;
    if (ctx.fillStyle !== fillStyle) ctx.fillStyle = fillStyle;
    ctx.save();
    ctx.translate(visibleRun.left, location.y);
    ctx.scale(size / TEXT_RENDER_SIZE, size / TEXT_RENDER_SIZE);
    ctx.fillText(visibleRun.text, 0, TEXT_RENDER_SIZE / 2);
    ctx.restore();
  }

  private prepareText(text: string): string {
    return Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
  }

  private drawTextFromCenter(
    text: string,
    centerLocation: Vector,
    size: number,
    color: Color,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    const textWidth = getTextSize(text, size, fontFamily, fontWeight).x;
    this.drawText(
      text,
      new Vector(centerLocation.x - textWidth / 2, centerLocation.y - size / 2),
      size,
      color,
      fontFamily,
      fontWeight,
    );
  }

  /**
   * 从左上角画文本
   */
  renderText(
    text: string,
    location: Vector,
    size: number,
    color: Color = Color.White,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    this.renderTempText(text, location, size, color, fontFamily, fontWeight);
  }
  /**
   * 渲染临时文字，不构建缓存，不使用缓存
   */
  renderTempText(
    text: string,
    location: Vector,
    size: number,
    color: Color = Color.White,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    text = this.prepareText(text);
    if (Settings.textIntegerLocationAndSizeRender) {
      location = location.toInteger();
      size = Math.round(size);
      if (size === 0) return;
    }
    this.drawText(text, location, size, color, fontFamily, fontWeight);
  }

  /**
   * 从中心位置开始绘制文本
   */
  renderTextFromCenter(
    text: string,
    centerLocation: Vector,
    size: number,
    color: Color = Color.White,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
      if (size === 0) return;
    }
    text = this.prepareText(text);
    this.drawTextFromCenter(text, centerLocation, size, color, fontFamily, fontWeight);
  }
  renderTempTextFromCenter(
    text: string,
    centerLocation: Vector,
    size: number,
    color: Color = Color.White,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
      if (size === 0) return;
    }
    text = this.prepareText(text);
    this.drawTextFromCenter(text, centerLocation, size, color, fontFamily, fontWeight);
  }

  renderTextInRectangle(
    text: string,
    rectangle: Rectangle,
    color: Color,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    this.renderTextFromCenter(
      text,
      rectangle.center,
      this.getFontSizeByRectangleSize(text, rectangle, fontFamily, fontWeight).y,
      color,
      fontFamily,
      fontWeight,
    );
  }

  private getFontSizeByRectangleSize(
    text: string,
    rectangle: Rectangle,
    fontFamily?: string,
    fontWeight?: string,
  ): Vector {
    // 使用getTextSize获取准确的文本尺寸
    const baseFontSize = 100;
    const measuredSize = getTextSize(text, baseFontSize, fontFamily, fontWeight);
    const ratio = measuredSize.x / measuredSize.y;
    const sectionRatio = rectangle.size.x / rectangle.size.y;

    // 计算最大可用字体高度
    let fontHeight;
    const paddingRatio = 0.9; // 增加边距比例，确保文字不会贴边
    if (sectionRatio < ratio) {
      // 宽度受限
      fontHeight = (rectangle.size.x / ratio) * paddingRatio;
    } else {
      // 高度受限
      fontHeight = rectangle.size.y * paddingRatio;
    }

    // 最小字体
    const minFontSize = 0.1;
    const maxFontSize = Math.max(rectangle.size.x, rectangle.size.y) * 0.8; // 限制最大字体
    fontHeight = Math.max(minFontSize, Math.min(fontHeight, maxFontSize));

    return new Vector(ratio * fontHeight, fontHeight);
  }

  /**
   * 渲染多行文本
   * @param text
   * @param location
   * @param fontSize
   * @param color
   * @param lineHeight
   */
  renderMultiLineText(
    text: string,
    location: Vector,
    fontSize: number,
    limitWidth: number,
    color: Color = Color.White,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    this.renderTempMultiLineText(
      text,
      location,
      fontSize,
      limitWidth,
      color,
      lineHeight,
      limitLines,
      fontFamily,
      fontWeight,
    );
  }
  renderTempMultiLineText(
    text: string,
    location: Vector,
    fontSize: number,
    limitWidth: number,
    color: Color = Color.White,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      location = location.toInteger();
      fontSize = Math.round(fontSize);
      limitWidth = Math.round(limitWidth);
      if (fontSize === 0) return;
    }
    text = this.prepareText(text);
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, fontSize, limitWidth, fontFamily, fontWeight);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.drawText(line, location.add(new Vector(0, currentY)), fontSize, color, fontFamily, fontWeight);
      currentY += fontSize * lineHeight;
    }
  }

  /**
   * 从中心位置绘制带描边的多行文本。
   * 描边颜色通常设为背景色，用于让文字"压住"穿过它的连线，
   * 比矩形遮罩更简洁且不依赖坐标求交。
   */
  renderMultiLineTextFromCenterWithStroke(
    text: string,
    centerLocation: Vector,
    size: number,
    fillColor: Color,
    strokeColor: Color,
    limitWidth: number = Infinity,
    lineHeight: number = 1.2,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
      if (size === 0) return;
      limitWidth = Math.round(limitWidth);
    }
    text = this.prepareText(text);
    const textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth, fontFamily, fontWeight);
    const ctx = this.project.canvas.ctx;
    const renderScale = size / TEXT_RENDER_SIZE;

    ctx.save();
    ctx.translate(centerLocation.x, centerLocation.y);
    ctx.scale(renderScale, renderScale);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = resolveFont(TEXT_RENDER_SIZE, fontFamily, fontWeight);
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor.toString();
    ctx.lineWidth = TEXT_RENDER_SIZE * 0.4;
    ctx.fillStyle = fillColor.toString();

    for (let i = 0; i < textLineArray.length; i++) {
      const line = textLineArray[i];
      const y = (i - (textLineArray.length - 1) / 2) * TEXT_RENDER_SIZE * lineHeight;
      ctx.strokeText(line, 0, y);
      ctx.fillText(line, 0, y);
    }
    ctx.restore();
  }

  renderMultiLineTextFromCenter(
    text: string,
    centerLocation: Vector,
    size: number,
    limitWidth: number,
    color: Color,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
      if (size === 0) return;
      limitWidth = Math.round(limitWidth);
    }
    text = this.prepareText(text);
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth, fontFamily, fontWeight);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.drawTextFromCenter(
        line,
        centerLocation.add(new Vector(0, currentY - ((textLineArray.length - 1) * size) / 2)),
        size,
        color,
        fontFamily,
        fontWeight,
      );
      currentY += size * lineHeight;
    }
  }
  renderTempMultiLineTextFromCenter(
    text: string,
    centerLocation: Vector,
    size: number,
    limitWidth: number,
    color: Color,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
      if (size === 0) return;
      limitWidth = Math.round(limitWidth);
    }
    text = this.prepareText(text);
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth, fontFamily, fontWeight);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.drawTextFromCenter(
        line,
        centerLocation.add(new Vector(0, currentY - ((textLineArray.length - 1) * size) / 2)),
        size,
        color,
        fontFamily,
        fontWeight,
      );
      currentY += size * lineHeight;
    }
  }

  textArrayCache: LruCache<string, string[]> = new LruCache(1000);

  /**
   * 加了缓存后的多行文本渲染函数
   * @param text
   * @param fontSize
   * @param limitWidth
   */
  private textToTextArrayWrapCache(
    text: string,
    fontSize: number,
    limitWidth: number,
    fontFamily?: string,
    fontWeight?: string,
  ): string[] {
    const widthInEm = limitWidth / fontSize;
    const normalizedWidthInEm = Number.isFinite(widthInEm) ? Number(widthInEm.toPrecision(12)) : widthInEm;
    const cacheKey = JSON.stringify([text, normalizedWidthInEm, getFontIdentity(fontFamily, fontWeight)]);
    const cacheValue = this.textArrayCache.get(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }
    const lines = this.textToTextArray(
      text,
      TEXT_RENDER_SIZE,
      normalizedWidthInEm * TEXT_RENDER_SIZE,
      fontFamily,
      fontWeight,
    );
    this.textArrayCache.set(cacheKey, lines);
    return lines;
  }

  /**
   * 渲染多行文本的辅助函数
   * 将一段字符串分割成多行数组，遇到宽度限制和换行符进行换行。
   * 复用 font.tsx 中的公共函数
   * @param text
   */
  private textToTextArray(
    text: string,
    fontSize: number,
    limitWidth: number,
    fontFamily?: string,
    fontWeight?: string,
  ): string[] {
    return splitTextToLines(text, fontSize, limitWidth, fontFamily, fontWeight);
  }

  /**
   * 测量多行文本的大小
   * @param text
   * @param fontSize
   * @param limitWidth
   * @returns
   */
  measureMultiLineTextSize(
    text: string,
    fontSize: number,
    limitWidth: number,
    lineHeight: number = 1.2,
    fontFamily?: string,
    fontWeight?: string,
  ): Vector {
    const lines = this.textToTextArrayWrapCache(text, fontSize, limitWidth, fontFamily, fontWeight);
    let maxWidth = 0;
    let totalHeight = 0;

    for (const line of lines) {
      maxWidth = Math.max(maxWidth, getTextSize(line, fontSize, fontFamily, fontWeight).x);
      totalHeight += fontSize * lineHeight;
    }

    return new Vector(maxWidth, totalHeight);
  }
}
