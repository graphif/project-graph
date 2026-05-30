import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { getTextSize, replaceTextWhenProtect, resolveFont, textToTextArray as splitTextToLines } from "@/utils/font";
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

  private hash(text: string, size: number, fontFamily?: string, fontWeight?: string): string {
    // md5(text)_fontSize_fontFamilyHash_fontWeightHash
    const textHash = md5(text);
    const fontHash = fontFamily ? md5(fontFamily) : "";
    const weightHash = fontWeight ? md5(fontWeight) : "";
    return `${textHash}_${size}_${fontHash}_${weightHash}`;
  }
  private getCache(text: string, size: number, fontFamily?: string, fontWeight?: string) {
    const cacheKey = this.hash(text, size, fontFamily, fontWeight);
    const cacheValue = this.cache.get(cacheKey);
    return cacheValue;
  }
  /**
   * 获取text相同，fontSize最接近的缓存图片
   */
  private getCacheNearestSize(
    text: string,
    size: number,
    fontFamily?: string,
    fontWeight?: string,
  ): ImageBitmap | undefined {
    const textHash = md5(text);
    const fontHash = fontFamily ? md5(fontFamily) : "";
    const weightHash = fontWeight ? md5(fontWeight) : "";
    let nearestBitmap: ImageBitmap | undefined;
    let minDiff = Infinity;

    // 遍历缓存中所有key
    for (const key of this.cache.keys()) {
      // 解构出textHash, fontFamilyHash, fontWeightHash 和 fontSize
      const [cachedTextHash, cachedFontSizeStr, cachedFontHash, cachedWeightHash] = key.split("_");
      const cachedFontSize = Number(cachedFontSizeStr);

      // 只处理相同text且相同font的缓存
      if (cachedTextHash === textHash && cachedFontHash === fontHash && cachedWeightHash === weightHash) {
        const diff = Math.abs(cachedFontSize - size);
        if (diff < minDiff) {
          minDiff = diff;
          nearestBitmap = this.cache.get(key);
        }
      }
    }

    return nearestBitmap;
  }

  private buildCache(
    text: string,
    size: number,
    color: Color,
    fontFamily?: string,
    fontWeight?: string,
  ): CanvasImageSource {
    const textSize = getTextSize(text, size, fontFamily, fontWeight);
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
    ctx.font = resolveFont(size, fontFamily, fontWeight);
    ctx.fillStyle = color.toString();
    ctx.fillText(text, 0, size / 2);
    createImageBitmap(canvas)
      .then((bmp) => {
        const cacheKey = this.hash(text, size, fontFamily, fontWeight);
        this.cache.set(cacheKey, bmp);
      })
      .catch(() => {});
    return canvas;
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
    if (text.trim().length === 0) return;
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;

    if (!Settings.cacheTextAsBitmap) {
      // 如果不开启位图渲染，则直接渲染
      this.renderTempText(text, location, size, color, fontFamily, fontWeight);
      return;
    }

    // 如果有缓存，直接渲染
    const cache = this.getCache(text, size, fontFamily, fontWeight);
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
        this.project.canvas.ctx.drawImage(
          this.buildCache(text, size, color, fontFamily, fontWeight),
          location.x,
          location.y,
        );
      } else if (Settings.textScalingBehavior === "nearestCache") {
        // 文字应该渲染成什么大小
        const textSize = getTextSize(text, size, fontFamily, fontWeight);
        const nearestBitmap = this.getCacheNearestSize(text, size, fontFamily, fontWeight);
        if (nearestBitmap) {
          this.project.canvas.ctx.drawImage(nearestBitmap, location.x, location.y, textSize.x, textSize.y * 1.5);
          return;
        }
      } else if (Settings.textScalingBehavior === "temp") {
        // 不走缓存
        this.renderTempText(text, location, size, color, fontFamily, fontWeight);
        return;
      }
    } else {
      // 如果摄像机没有缩放，直接缓存然后渲染
      const cache =
        this.getCache(text, size, fontFamily, fontWeight) ?? this.buildCache(text, size, color, fontFamily, fontWeight);
      this.project.canvas.ctx.drawImage(cache, location.x, location.y);
    }
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
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    if (Settings.textIntegerLocationAndSizeRender) {
      location = location.toInteger();
      size = Math.round(size);
      if (size === 0) return;
    }
    this.project.canvas.ctx.textBaseline = "middle";
    this.project.canvas.ctx.textAlign = "left";
    this.project.canvas.ctx.font = resolveFont(size, fontFamily, fontWeight);
    this.project.canvas.ctx.fillStyle = color.toString();
    this.project.canvas.ctx.fillText(text, location.x, location.y + size / 2);
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
    const textSize = getTextSize(text, size, fontFamily, fontWeight);
    this.renderText(text, centerLocation.subtract(textSize.divide(2)), size, color, fontFamily, fontWeight);
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
    const textSize = getTextSize(text, size, fontFamily, fontWeight);
    this.renderTempText(text, centerLocation.subtract(textSize.divide(2)), size, color, fontFamily, fontWeight);
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
    let textLineArray = this.textToTextArrayWrapCache(text, fontSize, limitWidth, fontFamily, fontWeight);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.renderText(line, location.add(new Vector(0, currentY)), fontSize, color, fontFamily, fontWeight);
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
    fontFamily?: string,
    fontWeight?: string,
  ): void {
    if (text.trim().length === 0) return;
    if (Settings.textIntegerLocationAndSizeRender) {
      location = location.toInteger();
      fontSize = Math.round(fontSize);
      limitWidth = Math.round(limitWidth);
    }
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, fontSize, limitWidth, fontFamily, fontWeight);
    // 限制行数
    if (limitLines < textLineArray.length) {
      textLineArray = textLineArray.slice(0, limitLines);
      textLineArray[limitLines - 1] += "..."; // 最后一行加省略号
    }
    for (const line of textLineArray) {
      this.renderTempText(line, location.add(new Vector(0, currentY)), fontSize, color, fontFamily, fontWeight);
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
    }
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    const textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth, fontFamily, fontWeight);
    const ctx = this.project.canvas.ctx;

    ctx.save();
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = resolveFont(size, fontFamily, fontWeight);
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor.toString();
    ctx.lineWidth = size * 0.4;
    ctx.fillStyle = fillColor.toString();

    for (let i = 0; i < textLineArray.length; i++) {
      const line = textLineArray[i];
      const y = centerLocation.y + (i - (textLineArray.length - 1) / 2) * size * lineHeight;
      ctx.strokeText(line, centerLocation.x, y);
      ctx.fillText(line, centerLocation.x, y);
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
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth, fontFamily, fontWeight);
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
    text = Settings.protectingPrivacy ? replaceTextWhenProtect(text) : text;
    let currentY = 0; // 顶部偏移量
    let textLineArray = this.textToTextArrayWrapCache(text, size, limitWidth, fontFamily, fontWeight);
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
    const cacheKey = `${fontSize}_${limitWidth}_${fontFamily || ""}_${fontWeight || ""}_${text}`;
    const cacheValue = this.textArrayCache.get(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }
    const lines = this.textToTextArray(text, fontSize, limitWidth, fontFamily, fontWeight);
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

    // 保存当前的字体设置
    const originalFont = this.project.canvas.ctx.font;
    // 确保使用与实际渲染相同的字体大小
    this.project.canvas.ctx.font = resolveFont(fontSize, fontFamily, fontWeight);

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
