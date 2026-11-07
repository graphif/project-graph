import fontUrl from "@/assets/fonts/NotoSansSC-Regular.otf?url";
import { createMsdfgen } from "@playcanvas/msdfgen-wasm";
import wasmUrl from "@playcanvas/msdfgen-wasm/msdfgen.wasm?url";

const CELL_SIZE = 64;
const PIXEL_RANGE = 8;

const fontPromise = Promise.all([
  createMsdfgen({ moduleOverrides: { locateFile: () => wasmUrl } }),
  fetch(fontUrl),
]).then(async ([module, response]) => {
  if (!response.ok) throw new Error(`字体加载失败：${response.status}`);
  const font = module.loadFont(await response.arrayBuffer());
  if (!font) throw new Error("MSDF 无法读取内置字体");
  return font;
});

fontPromise.then(
  () => self.postMessage({ type: "ready" }),
  (error: unknown) => self.postMessage({ type: "error", error: String(error) }),
);

self.addEventListener("message", (event: MessageEvent<{ type: string; codepoint: number }>) => {
  if (event.data.type !== "glyph") return;
  void fontPromise
    .then((font) => {
      const glyph = font.generateGlyph(event.data.codepoint, CELL_SIZE, PIXEL_RANGE);
      if (glyph) {
        self.postMessage(
          { type: "glyph", codepoint: event.data.codepoint, glyph },
          { transfer: [glyph.rgba.buffer as ArrayBuffer] },
        );
      } else {
        self.postMessage({ type: "glyph", codepoint: event.data.codepoint, glyph: null });
      }
    })
    .catch((error: unknown) => {
      self.postMessage({ type: "error", error: `字形 ${event.data.codepoint} 生成失败：${String(error)}` });
    });
});
