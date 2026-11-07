import { readFile } from "node:fs/promises";
import { createMsdfgen } from "@playcanvas/msdfgen-wasm";
import { isMsdfCompatibleText, MsdfTextAtlasRenderer } from "./msdfTextAtlas";
import { Color, Vector } from "@graphif/data-structures";
import { afterEach, describe, expect, it, vi } from "vitest";

async function setupRenderer() {
  vi.stubEnv("MODE", "production");
  vi.stubEnv("LR_VITEST", "false");
  const gl = new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
    get(target, key: string) {
      return (target[key] ??= vi.fn(() => ({})));
    },
  });
  const canvas = Object.assign(new EventTarget(), { width: 0, height: 0, getContext: () => gl });
  const createElement = vi.fn<() => { width: number; height: number; getContext: () => object }>(() => ({
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: vi.fn() }),
  }));
  createElement.mockReturnValueOnce(canvas);
  vi.stubGlobal("document", { createElement });
  const dispatchEvent = vi.fn();
  vi.stubGlobal("window", { devicePixelRatio: 1, dispatchEvent });
  vi.stubGlobal("ErrorEvent", class {});
  const worker = new EventTarget() as EventTarget & {
    terminate: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
  };
  worker.terminate = vi.fn();
  worker.postMessage = vi.fn(({ codepoint }) => {
    worker.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "glyph",
          codepoint,
          glyph: {
            advance: 1,
            translateX: 0,
            translateY: 0,
            boundsL: 0,
            boundsR: 1,
            boundsB: 0,
            boundsT: 1,
            rgba: new Uint8Array(64 * 64 * 4),
          },
        },
      }),
    );
  });
  vi.stubGlobal(
    "Worker",
    class {
      constructor() {
        queueMicrotask(() => worker.dispatchEvent(new MessageEvent("message", { data: { type: "ready" } })));
        return worker;
      }
    },
  );
  const renderer = new MsdfTextAtlasRenderer();
  const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
  const draw = (text: string) => renderer.drawLine(ctx, text, Vector.getZero(), 24, Color.White);
  draw("A");
  await vi.waitFor(() => expect(gl.blendFunc).toHaveBeenCalled());
  return { renderer, draw, worker, gl, canvas, dispatchEvent };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("lazy MSDF resources", () => {
  it("keeps cached lines after atlas eviction without requesting their glyphs again", async () => {
    const { draw, worker, gl } = await setupRenderer();
    draw("A");
    expect(draw("A")).toBe(true);
    for (let index = 0; index < 961; index++) draw(String.fromCodePoint(0x4e00 + index));
    const requests = worker.postMessage.mock.calls.length;
    expect(draw("A")).toBe(true);
    expect(worker.postMessage).toHaveBeenCalledTimes(requests);
    // The newest glyph survives capacity overflow; a full atlas flush would lose it.
    expect(draw(String.fromCodePoint(0x4e00 + 960))).toBe(true);
    expect(worker.postMessage).toHaveBeenCalledTimes(requests);
    expect(gl.getUniformLocation).toHaveBeenCalledTimes(5);
    expect(gl.bufferData).toHaveBeenCalledOnce();
    expect(gl.bufferSubData).toHaveBeenCalledTimes(2);
  });

  it.each(["worker", "context"])("releases resources and falls back after a %s failure", async (source) => {
    const { renderer, draw, worker, gl, canvas, dispatchEvent } = await setupRenderer();
    if (source === "worker") {
      worker.dispatchEvent(new MessageEvent("message", { data: { type: "error", error: "glyph failed" } }));
    } else {
      canvas.dispatchEvent(new Event("webglcontextlost"));
    }
    expect(draw("A")).toBe(false);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(gl.deleteTexture).toHaveBeenCalledOnce();
    expect(gl.deleteBuffer).toHaveBeenCalledOnce();
    expect(gl.deleteProgram).toHaveBeenCalledOnce();
    expect(dispatchEvent).toHaveBeenCalledOnce();
    renderer.dispose();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("does not load a font at startup, for emoji, or without WebGL2", () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("LR_VITEST", "false");
    const createElement = vi.fn(() => ({ getContext: () => null }));
    const worker = vi.fn();
    vi.stubGlobal("document", { createElement });
    vi.stubGlobal("window", {});
    vi.stubGlobal("Worker", worker);
    const renderer = new MsdfTextAtlasRenderer();
    expect(createElement).not.toHaveBeenCalled();
    const ctx = {} as CanvasRenderingContext2D;
    expect(renderer.drawLine(ctx, "😀", Vector.getZero(), 16, Color.White)).toBe(false);
    expect(createElement).not.toHaveBeenCalled();
    expect(renderer.drawLine(ctx, "字", Vector.getZero(), 16, Color.White)).toBe(false);
    expect(createElement).toHaveBeenCalledOnce();
    renderer.drawLine(ctx, "字", Vector.getZero(), 16, Color.White);
    expect(createElement).toHaveBeenCalledOnce();
    expect(worker).not.toHaveBeenCalled();
  });

  it("terminates a failed font worker and surfaces the failure", async () => {
    vi.stubEnv("MODE", "production");
    vi.stubEnv("LR_VITEST", "false");
    const terminate = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({}) }) });
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("ErrorEvent", class {});
    vi.stubGlobal(
      "Worker",
      class {
        terminate = terminate;
        addEventListener(type: string, callback: (event: unknown) => void) {
          if (type === "message") queueMicrotask(() => callback({ data: { type: "error", error: "invalid font" } }));
        }
      },
    );
    const renderer = new MsdfTextAtlasRenderer();
    renderer.drawLine({} as CanvasRenderingContext2D, "字", Vector.getZero(), 16, Color.White);
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});

describe("MSDF font generation", () => {
  it("routes color emoji and shaped text to native Canvas rendering", () => {
    expect(isMsdfCompatibleText("A字")).toBe(true);
    for (const text of ["A😀", "👩‍💻", "👍🏽", "🇨🇳", "1️⃣", "مرحبا", "e\u0301"]) {
      expect(isMsdfCompatibleText(text)).toBe(false);
    }
  });
  it("generates genuine multichannel glyphs for Latin and Chinese", async () => {
    const bytes = await readFile(new URL("../../../../assets/fonts/NotoSansSC-Regular.otf", import.meta.url));
    const module = await createMsdfgen();
    const font = module.loadFont(bytes);
    expect(font).not.toBeNull();
    if (!font) return;

    for (const char of ["A", "字"]) {
      const glyph = font.generateGlyph(char.codePointAt(0)!, 64, 8);
      expect(glyph).not.toBeNull();
      expect(glyph?.rgba).toHaveLength(64 * 64 * 4);
      expect(
        glyph &&
          Array.from({ length: 64 * 64 }, (_, index) => index * 4).some(
            (index) => glyph.rgba[index] !== glyph.rgba[index + 1] || glyph.rgba[index + 1] !== glyph.rgba[index + 2],
          ),
      ).toBe(true);
    }
    font.delete();
  });
});
