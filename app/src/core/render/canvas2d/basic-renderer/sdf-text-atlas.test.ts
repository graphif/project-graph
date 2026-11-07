// @vitest-environment jsdom

import { Vector } from "@graphif/data-structures";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/service/Settings", () => ({
  Settings: {
    protectingPrivacy: false,
    textIntegerLocationAndSizeRender: false,
    customFontFamily: "",
    customFontWeight: "",
  },
}));
vi.mock("@/core/Project", () => ({
  Project: class Project {},
  service: () => (target: unknown) => target,
}));
vi.mock("@/utils/font", () => ({
  getFontIdentity: (fontFamily?: string, fontWeight?: string) =>
    JSON.stringify([fontWeight || "normal", fontFamily || "sans-serif"]),
  isBundledCanvasFont: () => false,
  getTextSize: (text: string, size: number) => new Vector(text.length * size * 0.6, size),
  replaceTextWhenProtect: (text: string) => text,
  resolveFont: (size: number, fontFamily?: string, fontWeight?: string) =>
    `${fontWeight || "normal"} ${size}px ${fontFamily || "sans-serif"}`,
  resolveFontFamily: (fontFamily?: string) => fontFamily || "sans-serif",
  setCanvasFont: (ctx: { font: string }, font: string) => {
    ctx.font = font;
  },
  textToTextArray: (text: string) => text.split("\n"),
}));

import { SdfTextAtlasRenderer } from "@/core/render/canvas2d/basicRenderer/sdfTextAtlas";
import { TextRenderer } from "@/core/render/canvas2d/basicRenderer/textRenderer";
import { Color } from "@graphif/data-structures";
import ShelfPack from "@mapbox/shelf-pack";
import TinySDF from "@mapbox/tiny-sdf";

describe("SDF Text Atlas & TextRenderer", () => {
  it("packs dynamic glyphs with @mapbox/shelf-pack and generates distance fields with @mapbox/tiny-sdf", () => {
    const pack = new ShelfPack(512, 512);
    const first = pack.packOne(48, 48);
    const second = pack.packOne(48, 48);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.x).not.toBe(second?.x);
    expect(typeof TinySDF).toBe("function");
  });

  it("gracefully falls back to Canvas 2D fillText in headless Vitest environments", () => {
    const fillText = vi.fn();
    const save = vi.fn();
    const restore = vi.fn();
    const translate = vi.fn();
    const scale = vi.fn();

    const fakeProject = {
      renderer: { w: 1920, h: 1080 },
      canvas: {
        ctx: {
          textBaseline: "alphabetic",
          textAlign: "start",
          font: "",
          fillStyle: "",
          save,
          restore,
          translate,
          scale,
          fillText,
        },
      },
    } as any;

    const sdfRenderer = new SdfTextAtlasRenderer();
    expect(sdfRenderer.drawLine(fakeProject.canvas.ctx, "Hello", new Vector(10, 20), 24, Color.White)).toBe(false);

    const textRenderer = new TextRenderer(fakeProject);
    textRenderer.renderText("Project Graph SDF", new Vector(100, 100), 24, Color.White);
    expect(fillText).toHaveBeenCalledTimes(1);
  });
});
