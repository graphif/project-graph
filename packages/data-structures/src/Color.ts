import { serializableType } from "@graphif/serializer";

/**
 * 颜色对象
 * 不透明度最大值为1，最小值为0
 */
@serializableType("Color", { fields: ["r", "g", "b", "a"] })
export class Color {
  static White = new Color(255, 255, 255);
  static Black = new Color(0, 0, 0);
  static Gray = new Color(128, 128, 128);
  static Red = new Color(255, 0, 0);
  static Green = new Color(0, 255, 0);
  static Blue = new Color(0, 0, 255);
  static Yellow = new Color(255, 255, 0);
  static Cyan = new Color(0, 255, 255);
  static Magenta = new Color(255, 0, 255);
  static Transparent = new Color(0, 0, 0, 0);

  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toString() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
  toHexString(): string {
    return `#${this.r.toString(16).padStart(2, "0")}${this.g.toString(16).padStart(2, "0")}${this.b.toString(16).padStart(2, "0")}${this.a.toString(16).padStart(2, "0")}`;
  }
  toHexStringWithoutAlpha(): string {
    return `#${this.r.toString(16).padStart(2, "0")}${this.g.toString(16).padStart(2, "0")}${this.b.toString(16).padStart(2, "0")}`;
  }
  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }
  /**
   * 将字符串十六进制转成颜色对象，注意带井号
   * @param hex
   * @returns
   */
  static fromHex(hex: string) {
    hex = hex.replace("#", "");
    hex = hex.toUpperCase();

    if (hex.length === 6) {
      // hex = "FF" + hex;  // 这一行代码是AI补出来的，实际上这是错的，被坑了
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return new Color(r, g, b);
    } else {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16);
      return new Color(r, g, b, a);
    }
  }
  static fromCss(color: string): Color {
    if (color === "transparent") {
      return this.Transparent;
    }

    // 处理十六进制格式
    if (/^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color)) {
      let hex = color.slice(1);
      // 扩展简写格式
      if (hex.length <= 4) {
        hex = hex.replace(/(.)/g, "$1$1");
      }
      const value = parseInt(hex, 16);
      switch (hex.length) {
        case 3: // #rgb
          return new Color(((value >> 8) & 0xf) * 17, ((value >> 4) & 0xf) * 17, (value & 0xf) * 17, 1);
        case 4: // #rgba
          return new Color(
            ((value >> 12) & 0xf) * 17,
            ((value >> 8) & 0xf) * 17,
            ((value >> 4) & 0xf) * 17,
            (value & 0xf) / 15,
          );
        case 6: // #rrggbb
          return new Color((value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff, 1);
        case 8: // #rrggbbaa
          return new Color((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, (value & 0xff) / 255);
      }
    }

    // 处理 rgb/rgba 格式
    const rgbMatch = color.match(/^rgba?\((.*)\)$/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(/[,/]\s*/).map((p) => p.trim());
      if (parts.length >= 3) {
        const parseValue = (v: string, max: number) => {
          if (v.endsWith("%")) {
            return Math.round((parseFloat(v) * max) / 100);
          }
          return parseFloat(v);
        };

        return new Color(
          parseValue(parts[0], 255),
          parseValue(parts[1], 255),
          parseValue(parts[2], 255),
          parts[3] ? parseFloat(parts[3]) : 1,
        );
      }
    }

    // 处理oklch格式
    const oklchMatch = color.match(/^oklch\((.*)\)$/i);
    if (oklchMatch) {
      const parts = oklchMatch[1]
        .split(/[,/]\s*|\s+/)
        .map((p) => p.trim())
        .filter((p) => p !== "");
      if (parts.length >= 3) {
        const parseHue = (hStr: string) => {
          const hueMatch = hStr.match(/^(-?\d*\.?\d+)(deg|rad|turn)?$/i);
          if (!hueMatch) return 0;
          const value = parseFloat(hueMatch[1]);
          const unit = hueMatch[2] ? hueMatch[2].toLowerCase() : "deg";
          switch (unit) {
            case "deg":
              return value;
            case "rad":
              return (value * 180) / Math.PI;
            case "turn":
              return value * 360;
            default:
              return value;
          }
        };

        const parsePercentOrNumber = (v: string, max: number = 1) => {
          if (v.endsWith("%")) {
            return Math.min(max, Math.max(0, parseFloat(v) / 100));
          }
          return Math.min(max, Math.max(0, parseFloat(v)));
        };

        const l = parsePercentOrNumber(parts[0]); // L 范围 0-1
        const c = parsePercentOrNumber(parts[1], Infinity); // C 允许非负
        const h = parseHue(parts[2]);
        const alpha = parts.length >= 4 ? parsePercentOrNumber(parts[3]) : 1;

        // 转换到Oklab的a、b
        const hRad = ((((h % 360) + 360) % 360) * Math.PI) / 180;
        const aVal = c * Math.cos(hRad);
        const bVal = c * Math.sin(hRad);

        // 转换到LMS线性值
        const lLMS = l + 0.3963377774 * aVal + 0.2158037573 * bVal;
        const mLMS = l - 0.1055613458 * aVal - 0.0638541728 * bVal;
        const sLMS = l - 0.0894841775 * aVal - 1.291485548 * bVal;

        // 立方转换得到非线性LMS
        const lNonlinear = Math.pow(lLMS, 3);
        const mNonlinear = Math.pow(mLMS, 3);
        const sNonlinear = Math.pow(sLMS, 3);

        // 转换到 XYZ
        const x = 1.2270138511 * lNonlinear - 0.5577999807 * mNonlinear + 0.281256149 * sNonlinear;
        const y = -0.0405801784 * lNonlinear + 1.1122568696 * mNonlinear - 0.0716766787 * sNonlinear;
        const z = -0.0763812845 * lNonlinear - 0.4214819784 * mNonlinear + 1.5861632204 * sNonlinear;

        // 转换到线性RGB
        const rLinear = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
        const gLinear = x * -0.969266 + y * 1.8760108 + z * 0.041556;
        const bLinear = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

        // Gamma校正
        const gammaCorrect = (v: number) => {
          v = Math.max(0, Math.min(1, v));
          return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        };

        const sr = gammaCorrect(rLinear);
        const sg = gammaCorrect(gLinear);
        const sb = gammaCorrect(bLinear);

        // 转换为0-255整数
        const toByte = (v: number) => Math.round(Math.min(255, Math.max(0, v * 255)));
        return new Color(toByte(sr), toByte(sg), toByte(sb), alpha);
      }
    }

    return this.Black;
  }

  /**
   * 将此颜色转换为透明色，
   * 和(0, 0, 0, 0)不一样
   * 因为(0, 0, 0, 0)是黑色的透明色，在颜色线性混合的时候会偏黑
   * @returns
   */
  toTransparent() {
    return new Color(this.r, this.g, this.b, 0);
  }

  /**
   * 和toTransparent完全相反
   * @returns
   */
  toSolid() {
    return new Color(this.r, this.g, this.b, 1);
  }

  toNewAlpha(a: number) {
    return new Color(this.r, this.g, this.b, a);
  }

  /**
   * 判断自己是否和另一个颜色相等
   */

  equals(color: Color) {
    return this.r === color.r && this.g === color.g && this.b === color.b && this.a === color.a;
  }

  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a];
  }

  static getRandom(): Color {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return new Color(r, g, b);
  }

  /**
   * 降低颜色的饱和度
   * @param amount 0 到 1 之间的值，表示去饱和的程度
   */
  desaturate(amount: number): Color {
    const grayScale = Math.round(this.r * 0.299 + this.g * 0.587 + this.b * 0.114);
    const newR = Math.round(grayScale + (this.r - grayScale) * (1 - amount));
    const newG = Math.round(grayScale + (this.g - grayScale) * (1 - amount));
    const newB = Math.round(grayScale + (this.b - grayScale) * (1 - amount));
    return new Color(newR, newG, newB, this.a);
  }

  /**
   * 将颜色转换为冷色调且低饱和度的版本
   * 注意：此方法是基于简单假设实现的，并不能精确地转换颜色空间。
   */
  toColdLowSaturation(): Color {
    // 转换至更冷的色调，这里简化处理，主要针对红色系向蓝色系偏移
    const hsl = this.rgbToHsl();
    hsl.h = Math.max(180, hsl.h); // 强制色调向冷色调偏移
    hsl.s = Math.min(hsl.s * 0.5, 1); // 减少饱和度

    const rgb = this.hslToRgb(hsl);
    return new Color(rgb.r, rgb.g, rgb.b, this.a).desaturate(0.3); // 进一步降低饱和度
  }

  // 辅助方法：RGB转HSL
  rgbToHsl(): { h: number; s: number; l: number } {
    const r = this.r / 255;
    const g = this.g / 255;
    const b = this.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s, l };
  }

  /**
   * 计算颜色的色相
   * @param color
   * @returns 色相值（0-360）
   */
  public static getHue(color: Color): number {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;

    if (max === min) {
      hue = 0; // achromatic
    } else {
      const diff = max - min;
      if (max === r) {
        hue = ((g - b) / diff) % 6;
      } else if (max === g) {
        hue = (b - r) / diff + 2;
      } else if (max === b) {
        hue = (r - g) / diff + 4;
      }
      hue = Math.round(hue * 60);
      if (hue < 0) {
        hue += 360;
      }
    }
    return hue;
  }

  // 辅助方法：HSL转RGB
  private hslToRgb(hsl: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
    let r, g, b;
    const h = hsl.h / 360;
    const s = hsl.s;
    const l = hsl.l;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = this.hueToRgb(p, q, h + 1 / 3);
      g = this.hueToRgb(p, q, h);
      b = this.hueToRgb(p, q, h - 1 / 3);
    }

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  private hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  /**
   * 改变色相
   * @param deHue 色相差值(角度)，正数表示顺时针，负数表示逆时针
   */
  public changeHue(deHue: number): Color {
    // 修复处理负值色相差的问题
    const hsl = this.rgbToHsl();
    // 确保色相值始终在0-360范围内
    hsl.h = (((hsl.h + deHue) % 360) + 360) % 360;
    const { r, g, b } = this.hslToRgb(hsl);
    return new Color(r, g, b, this.a);
  }
}
export function colorInvert(color: Color): Color {
  /**
   * 计算背景色的亮度 更精确的人眼感知亮度公式
   * 0.2126 * R + 0.7152 * G + 0.0722 * B，
   * 如果亮度较高，则使用黑色文字，
   * 如果亮度较低，则使用白色文字。
   * 这种方法能够确保无论背景色如何变化，文字都能保持足够的对比度。
   */

  const r = color.r;
  const g = color.g;
  const b = color.b;
  const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (brightness > 128) {
    return Color.Black; // 返回黑色
  } else {
    return Color.White; // 返回白色
  }
}
/**
 * 获取两个颜色的中间过渡色（线性混合）
 * 根据两个颜色，以及一个 0~1 的权重，返回一个新的颜色
 * 0 权重返回 color1，1 权重返回 color2
 * @param color1 颜色1
 * @param color2 颜色2
 */
export function mixColors(color1: Color, color2: Color, weight: number): Color {
  const r = Math.round(color1.r * (1 - weight) + color2.r * weight);
  const g = Math.round(color1.g * (1 - weight) + color2.g * weight);
  const b = Math.round(color1.b * (1 - weight) + color2.b * weight);
  const a = color1.a * (1 - weight) + color2.a * weight;
  return new Color(r, g, b, Math.round(a * 100) / 100); // 颜色混合很容易搞出科学计数法的小数，这里取两位小数精度
}

/**
 * 获取一个颜色列表的平均颜色
 */
export function averageColors(colors: Color[]): Color {
  const r = Math.round(colors.reduce((acc, cur) => acc + cur.r, 0) / colors.length);
  const g = Math.round(colors.reduce((acc, cur) => acc + cur.g, 0) / colors.length);
  const b = Math.round(colors.reduce((acc, cur) => acc + cur.b, 0) / colors.length);

  // const a = Math.round(colors.reduce((acc, cur) => acc + cur.a, 0.0) / colors.length);
  // 上面这种写法有bug，透明度平均不了

  let a = 0.0;
  for (const color of colors) {
    a += color.a;
  }
  a /= colors.length;
  console.log(a);
  return new Color(r, g, b, a);
}
