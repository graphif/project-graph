import { isMac } from "@/utils/platform";
import { MaxSizeCache, Vector } from "@graphif/data-structures";
import { Settings } from "@/core/service/Settings";

const _canvas = document.createElement("canvas");
const _context = _canvas.getContext("2d");

const _cache = new MaxSizeCache<string, number>(10000);

/** canvas中使用的字体 */
export let FONT = "-apple-system, BlinkMacSystemFont, MiSans, system-ui, sans-serif";
if (isMac) {
  // 只有 PingFang TC 在mac中，中英文混合文字 宽度才能计算正确，离谱
  FONT = "PingFang SC, PingFang TC, -apple-system";
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
export function getTextSize(text: string, size: number): Vector {
  // const t1 = performance.now();
  if (useCache) {
    const value = _cache.get(`${text}-${size}`);
    if (value) {
      return new Vector(value, size);
    }
  }

  if (!_context) {
    throw new Error("Failed to get canvas context");
  }

  _context.font = `${size}px normal ${FONT}`;
  const metrics = _context.measureText(text);
  // const t2 = performance.now();
  if (useCache) {
    _cache.set(`${text}-${size}`, metrics.width);
  }

  return new Vector(metrics.width, size);
}

/**
 * 获取多行文本的宽度和高度
 * @param text
 * @param fontSize
 * @param lineHeight 行高，是一个比率
 * @returns
 */
export function getMultiLineTextSize(text: string, fontSize: number, lineHeight: number): Vector {
  const lines = text.split("\n");
  let width = 0;
  let height = 0;
  for (const line of lines) {
    const size = getTextSize(line, fontSize);
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
