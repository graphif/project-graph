import { getFontIdentity, resolveFont, resolveFontFamily } from "@/utils/font";
import { Color, Vector } from "@graphif/data-structures";
import ShelfPack from "@mapbox/shelf-pack";
import TinySDF, { type TinySDFGlyph } from "@mapbox/tiny-sdf";

const SDF_FONT_SIZE = 48;
const SDF_BUFFER = 6;
const SDF_RADIUS = 12;
const SDF_CUTOFF = 0.25;
const ATLAS_SIZE = 2048;
const MAX_BATCH_CHARS = 512;

// 单位 Quad (0..1) 两个三角形顶点
const UNIT_QUAD_VERTICES = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

interface PackedGlyph {
  atlasX: number;
  atlasY: number;
  width: number;
  height: number;
  glyphWidth: number;
  glyphHeight: number;
  glyphTop: number;
  glyphLeft: number;
  glyphAdvance: number;
}

const VERTEX_SHADER_300_ES = `#version 300 es
layout(location = 0) in vec2 a_unit;
layout(location = 1) in vec4 a_instance_rect;
layout(location = 2) in vec4 a_instance_uv;

uniform vec2 u_resolution;
uniform vec2 u_texsize;

out vec2 v_texcoord;

void main() {
  vec2 pos = a_instance_rect.xy + a_unit * a_instance_rect.zw;
  vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  vec2 uv = a_instance_uv.xy + a_unit * a_instance_uv.zw;
  v_texcoord = uv / u_texsize;
}
`;

const FRAGMENT_SHADER_300_ES = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_fill_color;
uniform vec4 u_halo_color;
uniform float u_buffer;
uniform float u_halo_buffer;

in vec2 v_texcoord;
out vec4 fragColor;

void main() {
  float dist = texture(u_texture, v_texcoord).r;
  float fw = fwidth(dist);
  float edgeWidth = clamp(fw * 0.75, 0.01, 0.35);
  float fillAlpha = smoothstep(u_buffer - edgeWidth, u_buffer + edgeWidth, dist);
  if (u_halo_color.a > 0.001) {
    float haloAlpha = smoothstep(u_halo_buffer - edgeWidth, u_halo_buffer + edgeWidth, dist);
    vec3 rgb = mix(u_halo_color.rgb * u_halo_color.a, u_fill_color.rgb * u_fill_color.a, fillAlpha);
    float outAlpha = mix(u_halo_color.a * haloAlpha, u_fill_color.a, fillAlpha);
    fragColor = vec4(rgb, outAlpha);
  } else {
    fragColor = vec4(u_fill_color.rgb * u_fill_color.a, u_fill_color.a) * fillAlpha;
  }
}
`;

const VERTEX_SHADER_100 = `
attribute vec2 a_pos;
attribute vec2 a_texcoord;

uniform vec2 u_resolution;
uniform vec2 u_texsize;

varying vec2 v_texcoord;

void main() {
  vec2 clipSpace = (a_pos / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_texcoord = a_texcoord / u_texsize;
}
`;

const FRAGMENT_SHADER_100 = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_fill_color;
uniform vec4 u_halo_color;
uniform float u_buffer;
uniform float u_halo_buffer;
uniform float u_gamma;

varying vec2 v_texcoord;

void main() {
  float dist = texture2D(u_texture, v_texcoord).a;
#ifdef GL_OES_standard_derivatives
  float fw = fwidth(dist);
  float edgeWidth = clamp(fw * 0.75, 0.01, 0.35);
#else
  float edgeWidth = clamp(u_gamma, 0.02, 0.35);
#endif
  float fillAlpha = smoothstep(u_buffer - edgeWidth, u_buffer + edgeWidth, dist);
  if (u_halo_color.a > 0.001) {
    float haloAlpha = smoothstep(u_halo_buffer - edgeWidth, u_halo_buffer + edgeWidth, dist);
    vec3 rgb = mix(u_halo_color.rgb * u_halo_color.a, u_fill_color.rgb * u_fill_color.a, fillAlpha);
    float outAlpha = mix(u_halo_color.a * haloAlpha, u_fill_color.a, fillAlpha);
    gl_FragColor = vec4(rgb, outAlpha);
  } else {
    gl_FragColor = vec4(u_fill_color.rgb * u_fill_color.a, u_fill_color.a) * fillAlpha;
  }
}
`;

/**
 * 路线 2 实现：
 * - 图集生成与装箱：@mapbox/tiny-sdf + @mapbox/shelf-pack（按需对画布可见去重字符增量生成 SDF Tile，直接复用 resolveFont 字体栈）。
 * - GPU 渲染层：WebGL2 Instanced Quad (drawArraysInstanced) + fwidth(dist) + smoothstep 自适应抗锯齿与 Halo 描边着色器。
 * - 接入方式：完全封装在 @service("textRenderer") 内部，对外接口零改动。
 */
export class SdfTextAtlasRenderer {
  private glCanvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private isWebGL2 = false;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private atlasTexture: WebGLTexture | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private texcoordBuffer: WebGLBuffer | null = null;

  private aPosLoc = -1;
  private aTexcoordLoc = -1;
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTexsizeLoc: WebGLUniformLocation | null = null;
  private uTextureLoc: WebGLUniformLocation | null = null;
  private uFillColorLoc: WebGLUniformLocation | null = null;
  private uHaloColorLoc: WebGLUniformLocation | null = null;
  private uBufferLoc: WebGLUniformLocation | null = null;
  private uHaloBufferLoc: WebGLUniformLocation | null = null;
  private uGammaLoc: WebGLUniformLocation | null = null;

  private pack = new ShelfPack(ATLAS_SIZE, ATLAS_SIZE);
  private glyphMap = new Map<string, PackedGlyph>();
  private sdfGenerators = new Map<string, TinySDF>();
  private instanceArray = new Float32Array(MAX_BATCH_CHARS * 8);
  private vertexArray = new Float32Array(MAX_BATCH_CHARS * 12);
  private texcoordArray = new Float32Array(MAX_BATCH_CHARS * 12);
  private failed = false;

  private ensureInitialized(): boolean {
    if (this.failed) return false;
    if (this.gl && this.program && this.atlasTexture) return true;
    if (typeof document === "undefined" || import.meta.env.LR_VITEST === "true") {
      this.failed = true;
      return false;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const gl2 = canvas.getContext("webgl2", {
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    const gl =
      gl2 ??
      canvas.getContext("webgl", {
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
      });
    if (!gl) {
      this.failed = true;
      return false;
    }

    this.isWebGL2 = Boolean(gl2 && typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext);
    if (!this.isWebGL2) {
      gl.getExtension("OES_standard_derivatives");
    }

    const vsSource = this.isWebGL2 ? VERTEX_SHADER_300_ES : VERTEX_SHADER_100;
    const fsSource = this.isWebGL2 ? FRAGMENT_SHADER_300_ES : FRAGMENT_SHADER_100;
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) {
      this.failed = true;
      return false;
    }

    const program = gl.createProgram();
    if (!program) {
      this.failed = true;
      return false;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      this.failed = true;
      return false;
    }

    const atlasTexture = gl.createTexture();
    if (!atlasTexture) {
      this.failed = true;
      return false;
    }

    gl.useProgram(program);
    this.uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    this.uTexsizeLoc = gl.getUniformLocation(program, "u_texsize");
    this.uTextureLoc = gl.getUniformLocation(program, "u_texture");
    this.uFillColorLoc = gl.getUniformLocation(program, "u_fill_color");
    this.uHaloColorLoc = gl.getUniformLocation(program, "u_halo_color");
    this.uBufferLoc = gl.getUniformLocation(program, "u_buffer");
    this.uHaloBufferLoc = gl.getUniformLocation(program, "u_halo_buffer");
    this.uGammaLoc = gl.getUniformLocation(program, "u_gamma");

    if (this.isWebGL2) {
      const wgl2 = gl as WebGL2RenderingContext;
      const vao = wgl2.createVertexArray();
      const unitQuadBuffer = wgl2.createBuffer();
      const instanceBuffer = wgl2.createBuffer();
      if (!vao || !unitQuadBuffer || !instanceBuffer) {
        this.failed = true;
        return false;
      }
      wgl2.bindVertexArray(vao);

      wgl2.bindBuffer(wgl2.ARRAY_BUFFER, unitQuadBuffer);
      wgl2.bufferData(wgl2.ARRAY_BUFFER, UNIT_QUAD_VERTICES, wgl2.STATIC_DRAW);
      wgl2.enableVertexAttribArray(0);
      wgl2.vertexAttribPointer(0, 2, wgl2.FLOAT, false, 0, 0);
      wgl2.vertexAttribDivisor(0, 0);

      wgl2.bindBuffer(wgl2.ARRAY_BUFFER, instanceBuffer);
      const stride = 8 * 4;
      wgl2.enableVertexAttribArray(1);
      wgl2.vertexAttribPointer(1, 4, wgl2.FLOAT, false, stride, 0);
      wgl2.vertexAttribDivisor(1, 1);

      wgl2.enableVertexAttribArray(2);
      wgl2.vertexAttribPointer(2, 4, wgl2.FLOAT, false, stride, 4 * 4);
      wgl2.vertexAttribDivisor(2, 1);

      wgl2.bindVertexArray(null);
      this.vao = vao;
      this.instanceBuffer = instanceBuffer;
    } else {
      const vertexBuffer = gl.createBuffer();
      const texcoordBuffer = gl.createBuffer();
      if (!vertexBuffer || !texcoordBuffer) {
        this.failed = true;
        return false;
      }
      this.aPosLoc = gl.getAttribLocation(program, "a_pos");
      this.aTexcoordLoc = gl.getAttribLocation(program, "a_texcoord");
      gl.enableVertexAttribArray(this.aPosLoc);
      gl.enableVertexAttribArray(this.aTexcoordLoc);
      this.vertexBuffer = vertexBuffer;
      this.texcoordBuffer = texcoordBuffer;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const internalFormat = this.isWebGL2 ? (gl as WebGL2RenderingContext).R8 : gl.ALPHA;
    const format = this.isWebGL2 ? (gl as WebGL2RenderingContext).RED : gl.ALPHA;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      ATLAS_SIZE,
      ATLAS_SIZE,
      0,
      format,
      gl.UNSIGNED_BYTE,
      new Uint8Array(ATLAS_SIZE * ATLAS_SIZE),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.uniform1i(this.uTextureLoc, 0);
    gl.uniform2f(this.uTexsizeLoc, ATLAS_SIZE, ATLAS_SIZE);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.glCanvas = canvas;
    this.gl = gl;
    this.program = program;
    this.atlasTexture = atlasTexture;
    return true;
  }

  private compileShader(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * 复用项目原生 resolveFont / resolveFontFamily 字体栈构造 TinySDF 实例
   */
  private getGenerator(fontFamily?: string, fontWeight?: string): { key: string; sdf: TinySDF } {
    const key = getFontIdentity(fontFamily, fontWeight);
    let sdf = this.sdfGenerators.get(key);
    if (!sdf) {
      const resolvedFamily = resolveFontFamily(fontFamily, fontWeight);
      const resolvedWeight = fontWeight?.trim() || "normal";
      sdf = new TinySDF({
        fontSize: SDF_FONT_SIZE,
        buffer: SDF_BUFFER,
        radius: SDF_RADIUS,
        cutoff: SDF_CUTOFF,
        fontFamily: resolvedFamily,
        fontWeight: resolvedWeight,
      });
      // 确保内部离屏 2D 上下文与 resolveFont 完全一致
      const sdfCtx = (sdf as unknown as { ctx?: CanvasRenderingContext2D }).ctx;
      if (sdfCtx) {
        sdfCtx.font = resolveFont(SDF_FONT_SIZE, fontFamily, fontWeight);
      }
      this.sdfGenerators.set(key, sdf);
    }
    return { key, sdf };
  }

  private resetAtlas(): void {
    if (!this.gl || !this.atlasTexture) return;
    this.pack = new ShelfPack(ATLAS_SIZE, ATLAS_SIZE);
    this.glyphMap.clear();
    const internalFormat = this.isWebGL2 ? (this.gl as WebGL2RenderingContext).R8 : this.gl.ALPHA;
    const format = this.isWebGL2 ? (this.gl as WebGL2RenderingContext).RED : this.gl.ALPHA;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      internalFormat,
      ATLAS_SIZE,
      ATLAS_SIZE,
      0,
      format,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array(ATLAS_SIZE * ATLAS_SIZE),
    );
  }

  private getOrPackGlyph(char: string, fontFamily?: string, fontWeight?: string): PackedGlyph | null {
    if (!this.gl || !this.atlasTexture) return null;
    const { key: fontKey, sdf } = this.getGenerator(fontFamily, fontWeight);
    const cacheKey = `${fontKey}::${char}`;
    const existing = this.glyphMap.get(cacheKey);
    if (existing) return existing;

    const rawGlyph: TinySDFGlyph = sdf.draw(char);
    if (rawGlyph.width === 0 || rawGlyph.height === 0) {
      const emptyGlyph: PackedGlyph = {
        atlasX: 0,
        atlasY: 0,
        width: 0,
        height: 0,
        glyphWidth: rawGlyph.glyphWidth,
        glyphHeight: rawGlyph.glyphHeight,
        glyphTop: rawGlyph.glyphTop,
        glyphLeft: rawGlyph.glyphLeft,
        glyphAdvance: rawGlyph.glyphAdvance,
      };
      this.glyphMap.set(cacheKey, emptyGlyph);
      return emptyGlyph;
    }

    let bin = this.pack.packOne(rawGlyph.width + 2, rawGlyph.height + 2);
    if (!bin) {
      this.resetAtlas();
      bin = this.pack.packOne(rawGlyph.width + 2, rawGlyph.height + 2);
      if (!bin) return null;
    }

    const atlasX = bin.x + 1;
    const atlasY = bin.y + 1;
    const format = this.isWebGL2 ? (this.gl as WebGL2RenderingContext).RED : this.gl.ALPHA;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      atlasX,
      atlasY,
      rawGlyph.width,
      rawGlyph.height,
      format,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array(rawGlyph.data.buffer, rawGlyph.data.byteOffset, rawGlyph.data.byteLength),
    );

    const packed: PackedGlyph = {
      atlasX,
      atlasY,
      width: rawGlyph.width,
      height: rawGlyph.height,
      glyphWidth: rawGlyph.glyphWidth,
      glyphHeight: rawGlyph.glyphHeight,
      glyphTop: rawGlyph.glyphTop,
      glyphLeft: rawGlyph.glyphLeft,
      glyphAdvance: rawGlyph.glyphAdvance,
    };
    this.glyphMap.set(cacheKey, packed);
    return packed;
  }

  private ensureScratchCapacity(charCount: number): void {
    const neededInstanceFloats = charCount * 8;
    if (this.instanceArray.length < neededInstanceFloats) {
      const nextSize = Math.max(neededInstanceFloats, this.instanceArray.length * 2);
      this.instanceArray = new Float32Array(nextSize);
    }
    if (!this.isWebGL2) {
      const neededVertFloats = charCount * 12;
      if (this.vertexArray.length < neededVertFloats) {
        const nextSize = Math.max(neededVertFloats, this.vertexArray.length * 2);
        this.vertexArray = new Float32Array(nextSize);
        this.texcoordArray = new Float32Array(nextSize);
      }
    }
  }

  /**
   * 使用 WebGL2 Instanced Quad + fwidth(dist) + smoothstep SDF 着色器绘制单行文本。
   * 返回 true 表示已通过 SDF 管线完成渲染；返回 false 时由调用方回退到原生 fillText。
   */
  drawLine(
    ctx: CanvasRenderingContext2D,
    text: string,
    location: Vector,
    size: number,
    fillColor: Color,
    fontFamily?: string,
    fontWeight?: string,
    strokeColor?: Color,
  ): boolean {
    if (!this.ensureInitialized() || !this.gl || !this.glCanvas) {
      return false;
    }

    const chars = Array.from(text);
    if (chars.length === 0) return true;
    this.ensureScratchCapacity(chars.length);

    const scale = size / SDF_FONT_SIZE;
    const pad = Math.ceil(SDF_BUFFER * scale) + 4;
    const glyphs: (PackedGlyph | null)[] = new Array(chars.length);

    for (let i = 0; i < chars.length; i++) {
      const g = this.getOrPackGlyph(chars[i], fontFamily, fontWeight);
      if (!g) return false;
      glyphs[i] = g;
    }

    let penX = pad;
    const baselineY = pad + size * 0.82;
    let quadCount = 0;
    let maxRight = penX;
    let maxBottom = pad + size * 1.25;

    for (let i = 0; i < chars.length; i++) {
      const glyph = glyphs[i]!;
      if (glyph.width > 0 && glyph.height > 0 && glyph.glyphWidth > 0 && glyph.glyphHeight > 0) {
        const x = penX + (glyph.glyphLeft - SDF_BUFFER) * scale;
        const y = baselineY - (glyph.glyphTop + SDF_BUFFER) * scale;
        const w = glyph.width * scale;
        const h = glyph.height * scale;
        const x2 = x + w;
        const y2 = y + h;

        if (this.isWebGL2) {
          const instBase = quadCount * 8;
          this.instanceArray[instBase] = x;
          this.instanceArray[instBase + 1] = y;
          this.instanceArray[instBase + 2] = w;
          this.instanceArray[instBase + 3] = h;
          this.instanceArray[instBase + 4] = glyph.atlasX;
          this.instanceArray[instBase + 5] = glyph.atlasY;
          this.instanceArray[instBase + 6] = glyph.width;
          this.instanceArray[instBase + 7] = glyph.height;
        } else {
          const u1 = glyph.atlasX;
          const v1 = glyph.atlasY;
          const u2 = glyph.atlasX + glyph.width;
          const v2 = glyph.atlasY + glyph.height;
          const base = quadCount * 12;
          this.vertexArray[base] = x;
          this.vertexArray[base + 1] = y;
          this.vertexArray[base + 2] = x2;
          this.vertexArray[base + 3] = y;
          this.vertexArray[base + 4] = x;
          this.vertexArray[base + 5] = y2;
          this.vertexArray[base + 6] = x;
          this.vertexArray[base + 7] = y2;
          this.vertexArray[base + 8] = x2;
          this.vertexArray[base + 9] = y;
          this.vertexArray[base + 10] = x2;
          this.vertexArray[base + 11] = y2;

          this.texcoordArray[base] = u1;
          this.texcoordArray[base + 1] = v1;
          this.texcoordArray[base + 2] = u2;
          this.texcoordArray[base + 3] = v1;
          this.texcoordArray[base + 4] = u1;
          this.texcoordArray[base + 5] = v2;
          this.texcoordArray[base + 6] = u1;
          this.texcoordArray[base + 7] = v2;
          this.texcoordArray[base + 8] = u2;
          this.texcoordArray[base + 9] = v1;
          this.texcoordArray[base + 10] = u2;
          this.texcoordArray[base + 11] = v2;
        }

        quadCount++;
        if (x2 > maxRight) maxRight = x2;
        if (y2 > maxBottom) maxBottom = y2;
      }
      penX += glyph.glyphAdvance * scale;
      if (penX > maxRight) maxRight = penX;
    }

    if (quadCount === 0) return true;

    const targetW = Math.min(4096, Math.max(16, Math.ceil(maxRight + pad)));
    const targetH = Math.min(2048, Math.max(16, Math.ceil(maxBottom + pad)));
    if (this.glCanvas.width < targetW || this.glCanvas.height < targetH) {
      this.glCanvas.width = Math.max(this.glCanvas.width, targetW);
      this.glCanvas.height = Math.max(this.glCanvas.height, targetH);
    }

    const gl = this.gl;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, this.glCanvas.height - targetH, targetW, targetH);
    gl.viewport(0, this.glCanvas.height - targetH, targetW, targetH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(this.uResolutionLoc, targetW, targetH);
    gl.uniform4f(this.uFillColorLoc, fillColor.r / 255, fillColor.g / 255, fillColor.b / 255, fillColor.a);
    if (strokeColor && strokeColor.a > 0) {
      gl.uniform4f(this.uHaloColorLoc, strokeColor.r / 255, strokeColor.g / 255, strokeColor.b / 255, strokeColor.a);
    } else {
      gl.uniform4f(this.uHaloColorLoc, 0, 0, 0, 0);
    }
    gl.uniform1f(this.uBufferLoc, 1.0 - SDF_CUTOFF);
    gl.uniform1f(this.uHaloBufferLoc, Math.max(0.2, 1.0 - SDF_CUTOFF - 0.3));
    if (this.uGammaLoc) {
      gl.uniform1f(this.uGammaLoc, (1.4142 / size) * 1.2);
    }

    if (this.isWebGL2 && this.vao && this.instanceBuffer) {
      const wgl2 = gl as WebGL2RenderingContext;
      wgl2.bindVertexArray(this.vao);
      wgl2.bindBuffer(wgl2.ARRAY_BUFFER, this.instanceBuffer);
      wgl2.bufferData(wgl2.ARRAY_BUFFER, this.instanceArray.subarray(0, quadCount * 8), wgl2.STREAM_DRAW);
      wgl2.drawArraysInstanced(wgl2.TRIANGLES, 0, 6, quadCount);
      wgl2.bindVertexArray(null);
    } else if (this.vertexBuffer && this.texcoordBuffer) {
      const floatCount = quadCount * 12;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray.subarray(0, floatCount), gl.STREAM_DRAW);
      gl.vertexAttribPointer(this.aPosLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.texcoordArray.subarray(0, floatCount), gl.STREAM_DRAW);
      gl.vertexAttribPointer(this.aTexcoordLoc, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, quadCount * 6);
    }

    gl.disable(gl.SCISSOR_TEST);

    ctx.drawImage(this.glCanvas, 0, 0, targetW, targetH, location.x - pad, location.y - pad, targetW, targetH);
    return true;
  }
}
