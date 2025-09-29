import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { FONT, getTextSize, replaceTextWhenProtect } from "@/utils/font";
import { Color, LruCache, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import md5 from "md5";

/**
 * 专门用于在Canvas上渲染文字
 * 支持缓存
 * 注意：基于View坐标系
 */
@service("textRenderer")
export class TextRenderer {
  private cache = new LruCache<string, ImageBitmap>(Settings.textCacheSize);

  constructor(private readonly project: Project) {}

  private hash(text: string, size: number): string {
    // md5(text)_fontSize
    const textHash = md5(text);
    return `${textHash}_${size}`;
  }
  private getCache(text: string, size: number) {
    const cacheKey = this.hash(text, size);
    const cacheValue = this.cache.get(cacheKey);
    return cacheValue;
  }
  /**
   * 获取text相同，fontSize最接近的缓存图片
   */
  private getCacheNearestSize(text: string, size: number): ImageBitmap | undefined {
    const textHash = md5(text);
    let nearestBitmap: ImageBitmap | undefined;
    let minDiff = Infinity;

    // 遍历缓存中所有key
    for (const key of this.cache.keys()) {
      // 解构出textHash和fontSize
      const [cachedTextHash, cachedFontSizeStr] = key.split("_");
      const cachedFontSize = Number(cachedFontSizeStr);

      // 只处理相同text的缓存
      if (cachedTextHash === textHash) {
        const diff = Math.abs(cachedFontSize - size);
        if (diff < minDiff) {
          minDiff = diff;
          nearestBitmap = this.cache.get(key);
        }
      }
    }

    return nearestBitmap;
  }

  private buildCache(text: string, size: number, color: Color): CanvasImageSource {
    const textSize = getTextSize(text, size);
    // 这里用OffscreenCanvas而不是document.createElement("canvas")
    // 因为OffscreenCanvas有神秘优化，后续也方便移植到Worker中渲染
    if (textSize.x <= 1 || textSize.y <= 1) {
      // 如果文本大小为0，直接返回一个透明图片
      return new Image();
    }
    const canvas = new OffscreenCanvas(textSize.x, textSize.y * 1.5);
    const ctx = canvas.getContext("2d")!;
    // 如果这里开了抗锯齿，并且外层的canvas也开了抗锯齿，会导致文字模糊
    ctx.imageSmoothingEnabled = false;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `${size}px normal ${FONT}`;
    ctx.fillStyle = color.toString();
    ctx.fillText(text, 0, size / 2);
    createImageBitmap(canvas)
      .then((bmp) => {
        const cacheKey = this.hash(text, size);
        this.cache.set(cacheKey, bmp);
      })
      .catch(() => {});
    return canvas;
  }

  /**
   * 从左上角画文本
   */
  renderText(text: string, location: Vector, size: number, color: Color = Color.White): void {
    if (text.trim().length === 0) return;
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;

    if (!Settings.cacheTextAsBitmap) {
      // 如果不开启位图渲染，则直接渲染
      this.renderTempText(text, location, size, color);
      return;
    }

    // 如果有缓存，直接渲染
    const cache = this.getCache(text, size);
    if (cache) {
      this.project.canvas.ctx.drawImage(cache, location.x, location.y);
      return;
    }
    const currentScale = this.project.camera.currentScale.toFixed(2);
    const targetScale = this.project.camera.targetScale.toFixed(2);
    // 如果摄像机正在缩放，就找到大小最接近的缓存图片，然后位图缩放
    if (currentScale !== targetScale) {
      if (Settings.textScalingBehavior === "cacheEveryTick") {
        // 每帧都缓存
        this.project.canvas.ctx.drawImage(this.buildCache(text, size, color), location.x, location.y);
      } else if (Settings.textScalingBehavior === "nearestCache") {
        // 文字应该渲染成什么大小
        const textSize = getTextSize(text, size);
        const nearestBitmap = this.getCacheNearestSize(text, size);
        if (nearestBitmap) {
          this.project.canvas.ctx.drawImage(nearestBitmap, location.x, location.y, textSize.x, textSize.y * 1.5);
          return;
        }
      } else if (Settings.textScalingBehavior === "temp") {
        // 不走缓存
        this.renderTempText(text, location, size, color);
        return;
      }
    } else {
      // 如果摄像机没有缩放，直接缓存然后渲染
      const cache = this.getCache(text, size) ?? this.buildCache(text, size, color);
      this.project.canvas.ctx.drawImage(cache, location.x, location.y);
    }
  }
  /**
   * 渲染临时文字，不构建缓存，不使用缓存
   */
  renderTempText(text: string, location: Vector, size: number, color: Color = Color.White): void {
    if (text.trim().length === 0) return;
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    if (Settings.textIntegerLocationAndSizeRender) {
      location = location.toInteger();
      size = Math.round(size);
    }
    this.project.canvas.ctx.textBaseline = "middle";
    this.project.canvas.ctx.textAlign = "left";
    this.project.canvas.ctx.font = `${size}px normal ${FONT}`;
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fillText(text, location.x, location.y + size / 2);
  }

  /**
   * 从中心位置开始绘制文本
   */
  renderTextFromCenter(text: string, centerLocation: Vector, size: number, color: Color = Color.White): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
    }
    const textSize = getTextSize(text, size);
    this.renderText(text, centerLocation.subtract(textSize.divide(2)), size, color);
  }
  renderTempTextFromCenter(text: string, centerLocation: Vector, size: number, color: Color = Color.White): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
    }
    const textSize = getTextSize(text, size);
    this.renderTempText(text, centerLocation.subtract(textSize.divide(2)), size, color);
  }

  renderTextInRectangle(text: string, rectangle: Rectangle, color: Color): void {
    if (text.trim().length === 0) return;
    this.renderTextFromCenter(text, rectangle.center, this.getFontSizeByRectangleSize(text, rectangle).y, color);
  }

  private getFontSizeByRectangleSize(text: string, rectangle: Rectangle): Vector {
    // 使用getTextSize获取准确的文本尺寸
    const baseFontSize = 100;
    const measuredSize = getTextSize(text, baseFontSize);
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
  ): void {
    if (!text) return;
    if (text.length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      location = location.toInteger();
      fontSize = Math.round(fontSize);
      limitWidth = Math.round(limitWidth);
    }
    // 如果文本里面没有换行符就直接渲染单行文本，不要计算了
    // if (!text.includes("\n")) {
    //   this.renderText(text, location, fontSize, color);
    //   return;
    // }
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, fontSize, limitWidth);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.renderText(line, location.add(new Vector(0, currentY)), fontSize, color);
      currentY += fontSize * lineHeight;
    }
  }
  renderTempMultiLineText(
    text: string,
    location: Vector,
    fontSize: number,
    limitWidth: number,
    color: Color = Color.White,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      location = location.toInteger();
      fontSize = Math.round(fontSize);
      limitWidth = Math.round(limitWidth);
    }
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, fontSize, limitWidth);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.renderTempText(line, location.add(new Vector(0, currentY)), fontSize, color);
      currentY += fontSize * lineHeight;
    }
  }

  renderMultiLineTextFromCenter(
    text: string,
    centerLocation: Vector,
    size: number,
    limitWidth: number,
    color: Color,
    lineHeight: number = 1.2,
    limitLines: number = Infinity,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
      limitWidth = Math.round(limitWidth);
    }
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.renderTextFromCenter(
        line,
        centerLocation.add(new Vector(0, currentY - ((textLineArray.length - 1) * size) / 2)),
        size,
        color,
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
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      centerLocation = centerLocation.toInteger();
      size = Math.round(size);
      limitWidth = Math.round(limitWidth);
    }
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.renderTempTextFromCenter(
        line,
        centerLocation.add(new Vector(0, currentY - ((textLineArray.length - 1) * size) / 2)),
        size,
        color,
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
  private textToTextArrayWrapCache(text: string, fontSize: number, limitWidth: number): string[] {
    const cacheKey = `${fontSize}_${limitWidth}_${text}`;
    const cacheValue = this.textArrayCache.get(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }
    const lines = this.textToTextArray(text, fontSize, limitWidth);
    this.textArrayCache.set(cacheKey, lines);
    return lines;
  }

  /**
   * 渲染多行文本的辅助函数
   * 将一段字符串分割成多行数组，遇到宽度限制和换行符进行换行。
   * @param text
   */
  private textToTextArray(text: string, fontSize: number, limitWidth: number): string[] {
    let currentLine = "";
    // 先渲染一下空字符串，否则长度大小可能不匹配，造成蜜汁bug
    this.renderText("", Vector.getZero(), fontSize, Color.White);
    const lines: string[] = [];

    // 保存当前的字体设置
    const originalFont = this.project.canvas.ctx.font;
    // 确保使用与实际渲染相同的字体大小
    this.project.canvas.ctx.font = `${fontSize}px normal ${FONT}`;

    for (const char of text) {
      // 新来字符的宽度
      const measureSize = this.project.canvas.ctx.measureText(currentLine + char);
      // 先判断是否溢出
      if (measureSize.width > limitWidth || char === "\n") {
        // 溢出了，将这一整行渲染出来
        lines.push(currentLine);
        if (char !== "\n") {
          currentLine = char;
        } else {
          currentLine = "";
        }
      } else {
        // 未溢出，继续添加字符
        // 当前行更新
        currentLine += char;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // 恢复原始字体设置
    this.project.canvas.ctx.font = originalFont;

    return lines;
  }

  /**
   * 测量多行文本的大小
   * @param text
   * @param fontSize
   * @param limitWidth
   * @returns
   */
  measureMultiLineTextSize(text: string, fontSize: number, limitWidth: number, lineHeight: number = 1.2): Vector {
    const lines = this.textToTextArrayWrapCache(text, fontSize, limitWidth);
    let maxWidth = 0;
    let totalHeight = 0;

    // 保存当前的字体设置
    const originalFont = this.project.canvas.ctx.font;
    // 确保使用与实际渲染相同的字体大小
    this.project.canvas.ctx.font = `${fontSize}px normal ${FONT}`;

    for (const line of lines) {
      const measureSize = this.project.canvas.ctx.measureText(line);
      maxWidth = Math.max(maxWidth, measureSize.width);
      totalHeight += fontSize * lineHeight;
    }

    // 恢复原始字体设置
    this.project.canvas.ctx.font = originalFont;

    return new Vector(Math.ceil(maxWidth), totalHeight);
  }
}
