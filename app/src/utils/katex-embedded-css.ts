import css from "katex/dist/katex.min.css?raw";
import AMSRegular from "katex/dist/fonts/KaTeX_AMS-Regular.woff2?inline";
import CaligraphicBold from "katex/dist/fonts/KaTeX_Caligraphic-Bold.woff2?inline";
import CaligraphicRegular from "katex/dist/fonts/KaTeX_Caligraphic-Regular.woff2?inline";
import FrakturBold from "katex/dist/fonts/KaTeX_Fraktur-Bold.woff2?inline";
import FrakturRegular from "katex/dist/fonts/KaTeX_Fraktur-Regular.woff2?inline";
import MainBold from "katex/dist/fonts/KaTeX_Main-Bold.woff2?inline";
import MainBoldItalic from "katex/dist/fonts/KaTeX_Main-BoldItalic.woff2?inline";
import MainItalic from "katex/dist/fonts/KaTeX_Main-Italic.woff2?inline";
import MainRegular from "katex/dist/fonts/KaTeX_Main-Regular.woff2?inline";
import MathBoldItalic from "katex/dist/fonts/KaTeX_Math-BoldItalic.woff2?inline";
import MathItalic from "katex/dist/fonts/KaTeX_Math-Italic.woff2?inline";
import SansSerifBold from "katex/dist/fonts/KaTeX_SansSerif-Bold.woff2?inline";
import SansSerifItalic from "katex/dist/fonts/KaTeX_SansSerif-Italic.woff2?inline";
import SansSerifRegular from "katex/dist/fonts/KaTeX_SansSerif-Regular.woff2?inline";
import ScriptRegular from "katex/dist/fonts/KaTeX_Script-Regular.woff2?inline";
import Size1Regular from "katex/dist/fonts/KaTeX_Size1-Regular.woff2?inline";
import Size2Regular from "katex/dist/fonts/KaTeX_Size2-Regular.woff2?inline";
import Size3Regular from "katex/dist/fonts/KaTeX_Size3-Regular.woff2?inline";
import Size4Regular from "katex/dist/fonts/KaTeX_Size4-Regular.woff2?inline";
import TypewriterRegular from "katex/dist/fonts/KaTeX_Typewriter-Regular.woff2?inline";

const fonts: Record<string, string> = {
  AMSRegular,
  CaligraphicBold,
  CaligraphicRegular,
  FrakturBold,
  FrakturRegular,
  MainBold,
  MainBoldItalic,
  MainItalic,
  MainRegular,
  MathBoldItalic,
  MathItalic,
  SansSerifBold,
  SansSerifItalic,
  SansSerifRegular,
  ScriptRegular,
  Size1Regular,
  Size2Regular,
  Size3Regular,
  Size4Regular,
  TypewriterRegular,
};

// SVG 图片不能依赖外部字体请求；使用同一套内嵌字体测量和绘制公式。
export const katexEmbeddedCss = css.replace(/src:[^;}]+/g, (source) => {
  const name = source.match(/KaTeX_([\w-]+)\.woff2/)?.[1].replaceAll("-", "");
  const font = name && fonts[name];
  if (!font) throw new Error(`Missing embedded KaTeX font: ${name}`);
  return `src:url("${font}") format("woff2")`;
});
