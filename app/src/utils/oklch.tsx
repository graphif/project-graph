export function parseOklch(oklch: string): { r: number; g: number; b: number; a: number } {
  // 匹配 oklch 格式
  const oklchMatch = oklch.match(/^oklch\((.*)\)$/i);
  if (!oklchMatch) {
    throw new Error("Invalid oklch format");
  }

  const parts = oklchMatch[1]
    .split(/[,/]\s*|\s+/)
    .map((p) => p.trim())
    .filter((p) => p !== "");

  if (parts.length < 3) {
    throw new Error("Invalid oklch values");
  }

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
  return { r: toByte(sr), g: toByte(sg), b: toByte(sb), a: alpha };
}
