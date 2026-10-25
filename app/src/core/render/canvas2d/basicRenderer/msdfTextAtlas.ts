import { Color, Vector } from "@graphif/data-structures";
import type { MsdfGlyph } from "@playcanvas/msdfgen-wasm";

const CELL_SIZE = 64;
const ATLAS_SIZE = 2048;
const ATLAS_COLUMNS = Math.floor(ATLAS_SIZE / (CELL_SIZE + 2));
const ATLAS_CAPACITY = ATLAS_COLUMNS ** 2;
const MAX_CACHE_ENTRIES = 48;
const MAX_CACHE_BYTES = 48 * 1024 * 1024;
const MAX_OUTPUT_WIDTH = 4096;

export function isMsdfCompatibleText(text: string): boolean {
  return !(
    ["\u200d", "\ufe0e", "\ufe0f", "\u20e3"].some((mark) => text.includes(mark)) ||
    /\p{Mark}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\p{Extended_Pictographic}/u.test(text) ||
    /[\u0590-\u08ff\u0900-\u0dff]/u.test(text)
  );
}

interface PackedGlyph {
  x: number;
  y: number;
  advance: number;
  translateX: number;
  translateY: number;
  hasInk: boolean;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
uniform vec2 u_resolution;
out vec2 v_uv;
void main() {
  vec2 clip = a_position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_atlas;
uniform vec4 u_fill;
uniform vec4 u_halo;
uniform float u_halo_width;
in vec2 v_uv;
out vec4 out_color;
void main() {
  vec3 sampled = texture(u_atlas, v_uv).rgb;
  float distance = max(min(sampled.r, sampled.g), min(max(sampled.r, sampled.g), sampled.b));
  float screen_distance = (distance - 0.5) / max(fwidth(distance), 0.00001);
  float fill_alpha = clamp(screen_distance + 0.5, 0.0, 1.0);
  float halo_alpha = clamp(screen_distance + u_halo_width + 0.5, 0.0, 1.0);
  float outline_alpha = max(0.0, halo_alpha - fill_alpha);
  out_color = vec4(
    u_fill.rgb * u_fill.a * fill_alpha + u_halo.rgb * u_halo.a * outline_alpha,
    u_fill.a * fill_alpha + u_halo.a * outline_alpha
  );
}`;

export class MsdfTextAtlasRenderer {
  private worker: Worker | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private buffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private nextSlot = 0;
  private vertices = new Float32Array(0);
  private bufferBytes = 0;
  private glyphs = new Map<number, PackedGlyph | null>();
  private pendingGlyphs = new Set<number>();
  private cache = new Map<string, HTMLCanvasElement>();
  private cacheBytes = 0;
  private unavailable = false;
  private initializationStarted = false;

  private fail(error: unknown) {
    if (this.unavailable) return;
    this.dispose();
    window.dispatchEvent(new ErrorEvent("error", { error, message: `MSDF 渲染失败：${String(error)}` }));
  }

  dispose() {
    this.unavailable = true;
    this.worker?.terminate();
    this.worker = null;
    this.gl?.deleteBuffer(this.buffer);
    this.gl?.deleteTexture(this.texture);
    this.gl?.deleteProgram(this.program);
    this.gl = null;
    this.canvas = null;
    this.buffer = null;
    this.texture = null;
    this.program = null;
    this.uniforms = {};
    this.vertices = new Float32Array(0);
    this.bufferBytes = 0;
    this.glyphs.clear();
    this.pendingGlyphs.clear();
    this.cache.clear();
    this.cacheBytes = 0;
  }

  private ensureInitialized() {
    if (
      this.initializationStarted ||
      this.unavailable ||
      typeof document === "undefined" ||
      import.meta.env.MODE === "test" ||
      import.meta.env.LR_VITEST === "true" ||
      "__TAURI_INTERNALS__" in window
    )
      return;
    this.initializationStarted = true;
    void this.initialize().catch((error: unknown) => this.fail(error));
  }

  private async initialize() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      depth: false,
      stencil: false,
    });
    if (!gl) {
      this.unavailable = true;
      return;
    }
    const worker = new Worker(new URL("./msdfGlyphWorker.ts", import.meta.url), { type: "module" });
    this.worker = worker;
    await new Promise<void>((resolve, reject) => {
      worker.addEventListener("message", (event: MessageEvent<{ type: string; error?: string }>) => {
        if (event.data.type === "ready") resolve();
        if (event.data.type === "error") reject(new Error(event.data.error));
      });
      worker.addEventListener("error", reject, { once: true });
    });
    if (this.unavailable) return;
    this.canvas = canvas;
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", () => this.fail(new Error("WebGL 上下文已丢失，已回退 Canvas")), {
      once: true,
    });
    const vertex = this.compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    let fragment: WebGLShader;
    try {
      fragment = this.compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    } catch (error) {
      gl.deleteShader(vertex);
      throw error;
    }
    const program = gl.createProgram();
    this.program = program;
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      throw new Error("无法创建 MSDF 着色器程序");
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`MSDF 着色器链接失败：${gl.getProgramInfoLog(program)}`);
    }
    const texture = gl.createTexture();
    const buffer = gl.createBuffer();
    this.texture = texture;
    this.buffer = buffer;
    if (!texture || !buffer) throw new Error("无法创建 MSDF 图集纹理或顶点缓冲");
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, ATLAS_SIZE, ATLAS_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.uniform1i(gl.getUniformLocation(program, "u_atlas"), 0);
    for (const name of ["u_resolution", "u_fill", "u_halo", "u_halo_width"]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.canvas = canvas;
    this.gl = gl;
    this.program = program;
    this.texture = texture;
    this.buffer = buffer;
    worker.addEventListener("error", (event) => this.fail(event.error ?? new Error(event.message)));
    worker.addEventListener(
      "message",
      (event: MessageEvent<{ type: string; codepoint: number; glyph: MsdfGlyph | null; error?: string }>) => {
        if (event.data.type === "error") this.fail(new Error(event.data.error));
        if (event.data.type !== "glyph") return;
        this.pendingGlyphs.delete(event.data.codepoint);
        this.packGlyph(event.data.codepoint, event.data.glyph);
      },
    );
  }

  private compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("无法创建 MSDF 着色器");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = new Error(`MSDF 着色器编译失败：${gl.getShaderInfoLog(shader)}`);
      gl.deleteShader(shader);
      throw error;
    }
    return shader;
  }

  private queueGlyph(codepoint: number) {
    if (!this.worker || this.pendingGlyphs.has(codepoint)) return;
    this.pendingGlyphs.add(codepoint);
    this.worker.postMessage({ type: "glyph", codepoint });
  }

  private packGlyph(codepoint: number, glyph: MsdfGlyph | null) {
    if (!this.gl || !this.texture || this.glyphs.has(codepoint)) return;
    if (!glyph) {
      this.glyphs.set(codepoint, null);
      return;
    }
    let x: number;
    let y: number;
    if (this.nextSlot < ATLAS_CAPACITY) {
      x = (this.nextSlot % ATLAS_COLUMNS) * (CELL_SIZE + 2) + 1;
      y = Math.floor(this.nextSlot / ATLAS_COLUMNS) * (CELL_SIZE + 2) + 1;
      this.nextSlot++;
    } else {
      const oldest = this.oldestPackedGlyph();
      x = oldest[1].x;
      y = oldest[1].y;
      this.glyphs.delete(oldest[0]);
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      x,
      y,
      CELL_SIZE,
      CELL_SIZE,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      glyph.rgba,
    );
    this.glyphs.set(codepoint, {
      x,
      y,
      advance: glyph.advance,
      translateX: glyph.translateX,
      translateY: glyph.translateY,
      hasInk: glyph.boundsL !== glyph.boundsR || glyph.boundsB !== glyph.boundsT,
    });
  }

  private oldestPackedGlyph(): [number, PackedGlyph] {
    for (const [codepoint, glyph] of this.glyphs) {
      if (glyph) return [codepoint, glyph];
    }
    throw new Error("MSDF 图集没有可替换的字形");
  }

  drawLine(
    ctx: CanvasRenderingContext2D,
    text: string,
    location: Vector,
    size: number,
    fill: Color,
    halo?: Color,
  ): boolean {
    if (this.unavailable || !text || !isMsdfCompatibleText(text)) return false;
    this.ensureInitialized();
    if (!this.gl || !this.canvas || !this.program) return false;

    const dpr = window.devicePixelRatio || 1;
    const key = JSON.stringify([text, size, dpr, fill.toString(), halo?.toString()]);
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      const padding = size * 2;
      ctx.drawImage(cached, location.x - padding, location.y - padding, cached.width / dpr, cached.height / dpr);
      return true;
    }

    const codepoints = Array.from(text, (character) => character.codePointAt(0)!);
    if (new Set(codepoints).size > ATLAS_CAPACITY) return false;
    let pending = false;
    for (const codepoint of codepoints) {
      if (!this.glyphs.has(codepoint)) {
        this.queueGlyph(codepoint);
        pending = true;
      } else if (this.glyphs.get(codepoint) === null) {
        return false;
      } else {
        const glyph = this.glyphs.get(codepoint)!;
        this.glyphs.delete(codepoint);
        this.glyphs.set(codepoint, glyph);
      }
    }
    if (pending) return false;

    let advance = 0;
    for (const codepoint of codepoints) advance += this.glyphs.get(codepoint)!.advance * size;
    const padding = size * 2;
    const cssWidth = Math.ceil(advance + padding * 2);
    const cssHeight = Math.ceil(size * 5);
    const width = Math.ceil(cssWidth * dpr);
    const height = Math.ceil(cssHeight * dpr);
    if (width > MAX_OUTPUT_WIDTH || height > 2048) return false;

    if (this.vertices.length < codepoints.length * 24) {
      this.vertices = new Float32Array(codepoints.length * 24);
    }
    const vertices = this.vertices;
    let vertexLength = 0;
    let penX = padding;
    const baseline = padding + size * 0.82;
    for (const codepoint of codepoints) {
      const glyph = this.glyphs.get(codepoint)!;
      if (glyph.hasInk) {
        const left = (penX - glyph.translateX * size) * dpr;
        const top = (baseline - (2 - glyph.translateY) * size) * dpr;
        const right = left + 2 * size * dpr;
        const bottom = top + 2 * size * dpr;
        const u0 = glyph.x / ATLAS_SIZE;
        const v0 = glyph.y / ATLAS_SIZE;
        const u1 = (glyph.x + CELL_SIZE) / ATLAS_SIZE;
        const v1 = (glyph.y + CELL_SIZE) / ATLAS_SIZE;
        vertices.set(
          [
            left,
            top,
            u0,
            v0,
            right,
            top,
            u1,
            v0,
            left,
            bottom,
            u0,
            v1,
            left,
            bottom,
            u0,
            v1,
            right,
            top,
            u1,
            v0,
            right,
            bottom,
            u1,
            v1,
          ],
          vertexLength,
        );
        vertexLength += 24;
      }
      penX += glyph.advance * size;
    }

    const gl = this.gl;
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform2f(this.uniforms.u_resolution, width, height);
    gl.uniform4f(this.uniforms.u_fill, fill.r / 255, fill.g / 255, fill.b / 255, fill.a);
    gl.uniform4f(this.uniforms.u_halo, (halo?.r ?? 0) / 255, (halo?.g ?? 0) / 255, (halo?.b ?? 0) / 255, halo?.a ?? 0);
    gl.uniform1f(this.uniforms.u_halo_width, halo ? size * dpr * 0.2 : 0);
    if (this.bufferBytes < vertices.byteLength) {
      gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.STREAM_DRAW);
      this.bufferBytes = vertices.byteLength;
    }
    if (vertexLength > 0) gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices.subarray(0, vertexLength));
    gl.drawArrays(gl.TRIANGLES, 0, vertexLength / 4);

    const image = document.createElement("canvas");
    image.width = width;
    image.height = height;
    image.getContext("2d")!.drawImage(this.canvas, 0, 0);
    this.cache.set(key, image);
    this.cacheBytes += width * height * 4;
    while (this.cache.size > MAX_CACHE_ENTRIES || this.cacheBytes > MAX_CACHE_BYTES) {
      const oldestKey = this.cache.keys().next().value!;
      const oldest = this.cache.get(oldestKey)!;
      this.cacheBytes -= oldest.width * oldest.height * 4;
      this.cache.delete(oldestKey);
    }
    ctx.drawImage(image, location.x - padding, location.y - padding, cssWidth, cssHeight);
    return true;
  }
}
