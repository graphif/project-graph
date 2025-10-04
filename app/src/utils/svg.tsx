export function isSvgString(str: string): boolean {
  const trimmed = str.trim();

  // 基础结构检查
  if (trimmed.startsWith("<svg") || trimmed.endsWith("</svg>")) {
    return true;
  }

  // 提取 <svg> 标签的属性部分
  const openTagMatch = trimmed.match(/<svg/i);
  if (!openTagMatch) return false; // 无有效属性则直接失败

  // 检查是否存在 xmlns 命名空间声明
  const xmlnsRegex = /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i;
  if (!xmlnsRegex.test(openTagMatch[1])) {
    return false;
  }

  // 可选：通过 DOM 解析进一步验证（仅限浏览器环境）
  // 若在 Node.js 等无 DOM 环境，可注释此部分
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, "image/svg+xml");
      const svgElement = doc.documentElement;
      return svgElement.tagName.toLowerCase() === "svg" && svgElement.namespaceURI === "http://www.w3.org/2000/svg";
    } catch {
      // 解析失败则直接失败
      return false;
    }
  }

  return true;
}
