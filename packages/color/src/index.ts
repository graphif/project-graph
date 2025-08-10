import { serializable } from "@graphif/serializer";

/**
 * 颜色对象
 * 不透明度最大值为1，最小值为0
 */
export class Color {
  static White = new Color(1, 0, 0);
  static Black = new Color(0, 0, 0);
  static Gray = new Color(0.6279554, 0.0, 0);
  static Red = new Color(0.6279554, 0.2576833, 29.2338859);
  static Green = new Color(0.8664396, 0.2948272, 142.4953387);
  static Blue = new Color(0.4520138, 0.3132144, 264.0520209);
  static Yellow = new Color(0.96798, 0.21101, 109.769);
  static Cyan = new Color(0.9053991, 0.1516765, 196.9126427);
  static Magenta = new Color(0.70168, 0.32247, 328.363);
  static Transparent = new Color(0, 0, 0, 0);

  /** 感知亮度 Lightness [0,1] */
  @serializable
  l: number;
  /** 色度 Chroma [0,Infinity) */
  @serializable
  c: number;
  /** 色相 Hue [0,360) */
  @serializable
  h: number;
  /** 不透明度 [0,1] */
  @serializable
  a: number;

  constructor(l: number, c: number, h: number, a: number = 1) {
    this.l = l;
    this.c = c;
    this.h = h;
    this.a = a;
  }
  toString() {
    return `oklch(${this.l} ${this.c} ${this.h}/${this.a})`;
  }
  equals(that: Color) {
    return this.l === that.l && this.c === that.c && this.h === that.h && this.a === that.a;
  }
  clone() {
    return new Color(this.l, this.c, this.h, this.a);
  }
  toSolid() {
    return new Color(this.l, this.c, this.h, 1);
  }
  toTransparent() {
    return new Color(this.l, this.c, this.h, 0);
  }
  static fromRGB(r: number, g: number, b: number) {
    const t = (v: number) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const lr = t(r),
      lg = t(g),
      lb = t(b);
    const x = lr * 0.4122214708 + lg * 0.5363325363 + lb * 0.0514459929;
    const y = lr * 0.2119034982 + lg * 0.6806995451 + lb * 0.1073969566;
    const z = lr * 0.0883024619 + lg * 0.2817188376 + lb * 0.6299787005;
    const l_ = x * 0.8190224432164319 + y * 0.3619062562801221 + z * -0.1288737826121643;
    const m_ = x * -0.0329836671980271 + y * 1.163346658310238 + z * -0.1303462935241813;
    const s_ = x * 0.048177199566046255 + y * 0.08440570088385368 + z * 0.7225954763756761;
    const l = l_ ** (1 / 3),
      m = m_ ** (1 / 3),
      s = s_ ** (1 / 3);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const b_ = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const C = Math.sqrt(a * a + b_ * b_);
    let h = (Math.atan2(b_, a) * 180) / Math.PI;
    if (h < 0) h += 360;
    return new Color(L, C, h, 1);
  }
  static fromRGBA(r: number, g: number, b: number, a: number) {
    return this.fromRGB(r, g, b).with({ a });
  }
  /**
   * 只支持oklch()
   * 第一个值：数字或百分比
   * 第二个值：数字或百分比（0%=0, 100%=0.4）
   * 第三个值：数字或角度（只支持deg）
   */
  static fromCSS(css: string) {
    const m = css.match(
      /^oklch\(\s*([^\s,]+)\s+([^\s,]+)\s+([^\s,]+(?:deg|grad|rad|turn)?)(?:\s*\/\s*([^\s,)]+))?\s*\)$/i,
    );
    if (!m) throw new Error(`Invalid oklch color format: ${css}`);
    const [, lRaw, cRaw, hRaw, aRaw] = m;
    const lMatch = lRaw.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(%)?$/i);
    if (!lMatch) throw new Error(`Invalid lightness value: ${lRaw}`);
    let l = parseFloat(lMatch[1]);
    if (isNaN(l)) throw new Error(`Invalid lightness value: ${lRaw}`);
    if (lMatch[2]) l /= 100;
    if (l < 0 || l > 1) throw new Error(`Invalid lightness value: ${lRaw}`);
    const cMatch = cRaw.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(%)?$/i);
    if (!cMatch) throw new Error(`Invalid chroma value: ${cRaw}`);
    let c = parseFloat(cMatch[1]);
    if (isNaN(c)) throw new Error(`Invalid chroma value: ${cRaw}`);
    if (cMatch[2]) c /= 250;
    if (c < 0) throw new Error(`Invalid chroma value: ${cRaw}`);
    const hMatch = hRaw.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(deg|grad|rad|turn)?$/i);
    if (!hMatch) throw new Error(`Invalid hue value: ${hRaw}`);
    let h = parseFloat(hMatch[1]);
    if (isNaN(h)) throw new Error(`Invalid hue value: ${hRaw}`);
    switch (hMatch[2]?.toLowerCase()) {
      case "grad":
        h = (h / 400) * 360;
        break;
      case "rad":
        h = (h / (2 * Math.PI)) * 360;
        break;
      case "turn":
        h *= 360;
        break;
      default:
        break;
    }
    h = ((h % 360) + 360) % 360;
    let alpha: number | undefined;
    if (aRaw !== undefined) {
      const aMatch = aRaw.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(%)?$/i);
      if (!aMatch) throw new Error(`Invalid alpha value: ${aRaw}`);
      alpha = parseFloat(aMatch[1]);
      if (isNaN(alpha)) throw new Error(`Invalid alpha value: ${aRaw}`);
      if (aMatch[2]) alpha /= 100;
      if (alpha < 0 || alpha > 1) throw new Error(`Invalid alpha value: ${aRaw}`);
    }
    return new Color(l, c, h, alpha ?? 1);
  }
  with(values: { l?: number; c?: number; h?: number; a?: number }) {
    return new Color(
      values.l !== undefined ? values.l : this.l,
      values.c !== undefined ? values.c : this.c,
      values.h !== undefined ? values.h : this.h,
      values.a !== undefined ? values.a : this.a,
    );
  }
  /**
   * @param weight 第二个颜色的权重，0-1之间
   */
  mix(that: Color, weight: number = 0.5) {
    const t = Math.max(0, Math.min(1, weight));
    const l = this.l * (1 - t) + that.l * t;
    const c = this.c * (1 - t) + that.c * t;
    let delta = (that.h - this.h + 360) % 360;
    if (delta > 180) delta -= 360;
    const h = (this.h + delta * t + 360) % 360;
    const a = this.a * (1 - t) + that.a * t;
    return new Color(l, c, h, a);
  }
  invert() {
    return this.with({ h: (this.h + 180) % 360 });
  }
}
