import { Settings } from "@/core/service/Settings";
import { MaxSizeCache, Vector } from "@graphif/data-structures";

const _canvas = document.createElement("canvas");
const _context = _canvas.getContext("2d");

const _cache = new MaxSizeCache<string, number>(10000);
const _fontDescriptorCache = new MaxSizeCache<string, string>(100);
const REFERENCE_FONT_SIZE = 100;

export function getFontIdentity(fontFamily?: string, fontWeight?: string): string {
  return JSON.stringify([fontWeight || "normal", fontFamily || Settings.defaultFontFamily]);
}

function resolveFontFamily(fontFamily?: string, fontWeight?: string): string {
  const cacheKey = getFontIdentity(fontFamily, fontWeight);
  const cached = _fontDescriptorCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const resolvedFamily = fontFamily ? `"${fontFamily}"` : Settings.defaultFontFamily;
  _fontDescriptorCache.set(cacheKey, resolvedFamily);
  return resolvedFamily;
}

/**
 * 解析字体字符串，支持自定义字体族和字重
 * @param fontSize 字体大小
 * @param fontFamily 自定义字体族，空字符串或 undefined 时使用全局默认字体
 * @param fontWeight 自定义字重，空字符串或 undefined 时使用 normal
 */
export function resolveFont(fontSize: number, fontFamily?: string, fontWeight?: string): string {
  return `${fontWeight || "normal"} ${fontSize}px ${resolveFontFamily(fontFamily, fontWeight)}`;
}

// eslint-disable-next-line prefer-const
let useCache = true;
/**
 * 测量文本的宽度（高度不测量）
 * 不要在循环中调用，会影响性能
 * @param text
 * @param size
 * @returns
 */
export function getTextSize(text: string, size: number, fontFamily?: string, fontWeight?: string): Vector {
  const cacheKey = JSON.stringify([text, getFontIdentity(fontFamily, fontWeight)]);
  if (useCache) {
    const referenceWidth = _cache.get(cacheKey);
    if (referenceWidth !== undefined) {
      return new Vector((referenceWidth * size) / REFERENCE_FONT_SIZE, size);
    }
  }

  if (!_context) {
    throw new Error("Failed to get canvas context");
  }

  _context.font = resolveFont(REFERENCE_FONT_SIZE, fontFamily, fontWeight);
  const metrics = _context.measureText(text);
  if (useCache) {
    _cache.set(cacheKey, metrics.width);
  }

  return new Vector((metrics.width * size) / REFERENCE_FONT_SIZE, size);
}

/**
 * 获取多行文本的宽度和高度
 * @param text
 * @param fontSize
 * @param lineHeight 行高，是一个比率
 * @returns
 */
export function getMultiLineTextSize(
  text: string,
  fontSize: number,
  lineHeight: number,
  _limitWidth?: number,
  fontFamily?: string,
  fontWeight?: string,
): Vector {
  const lines = text.split("\n");
  let width = 0;
  let height = 0;
  for (const line of lines) {
    const size = getTextSize(line, fontSize, fontFamily, fontWeight);
    width = Math.max(width, size.x);
    height += size.y * lineHeight;
  }
  return new Vector(width, height);
}

/**
 * 隐私保护文本替换
 * 根据设置的保护模式进行不同的替换
 * @param text
 */
export function replaceTextWhenProtect(text: string) {
  // 检查是否设置了保护模式，如果没有，默认为secretWord
  const mode = Settings.protectingPrivacyMode || "secretWord";

  if (mode === "caesar") {
    // 凯撒移位加密：所有字符往后移动一位
    return text
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);

        // 对于可打印ASCII字符进行移位
        if (code >= 32 && code <= 126) {
          // 特殊处理：'z' 移到 'a'，'Z' 移到 'A'，'9' 移到 '0'
          if (char === "z") return "a";
          if (char === "Z") return "A";
          if (char === "9") return "0";
          // 其他字符直接 +1
          return String.fromCharCode(code + 1);
        }

        // 对于中文字符，进行移位加密
        if (code >= 0x4e00 && code <= 0x9fa5) {
          // 中文字符在Unicode范围内循环移位
          // 0x4e00是汉字起始，0x9fa5是汉字结束，总共约20902个汉字
          const shiftedCode = code + 1;
          // 如果超过汉字范围，则回到起始位置
          return String.fromCharCode(shiftedCode <= 0x9fa5 ? shiftedCode : 0x4e00);
        }

        // 其他字符保持不变
        return char;
      })
      .join("");
  }

  // 默认的secretWord模式
  return text
    .replace(/[\u4e00-\u9fa5]/g, "㊙")
    .replace(/[a-z]/g, "a")
    .replace(/[A-Z]/g, "A")
    .replace(/\d/g, "6");
}

export function camelCaseToDashCase(text: string) {
  return text.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * 将文本按宽度限制分割成多行数组
 * 遇到宽度限制或换行符时进行换行
 * @param text 原始文本
 * @param fontSize 字体大小
 * @param limitWidth 宽度限制
 * @returns 分割后的行数组
 */
export function textToTextArray(
  text: string,
  fontSize: number,
  limitWidth: number,
  fontFamily?: string,
  fontWeight?: string,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
    const paragraph = paragraphs[paragraphIndex];
    const characters = Array.from(paragraph);
    let start = 0;
    let isFirstWrappedLine = true;

    while (start < characters.length) {
      const remaining = characters.slice(start);
      const remainingText = remaining.join("");
      if (getTextSize(remainingText, fontSize, fontFamily, fontWeight).x <= limitWidth) {
        lines.push(remainingText);
        start = characters.length;
        break;
      }

      let low = 1;
      let high = remaining.length;
      let fittingLength = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const width = getTextSize(remaining.slice(0, middle).join(""), fontSize, fontFamily, fontWeight).x;
        if (width <= limitWidth) {
          fittingLength = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      if (fittingLength === 0) {
        if (isFirstWrappedLine) lines.push("");
        fittingLength = 1;
      }
      lines.push(remaining.slice(0, fittingLength).join(""));
      start += fittingLength;
      isFirstWrappedLine = false;
    }

    if (paragraphIndex < paragraphs.length - 1 && paragraph.length === 0) {
      lines.push("");
    } else if (paragraphIndex < paragraphs.length - 1 && start === 0) {
      lines.push(paragraph);
    }
  }

  return lines;
}
