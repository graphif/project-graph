import { beforeEach, describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Project } from "@/core/Project";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/service/Settings", () => ({
  Settings: { protectingPrivacy: false, textIntegerLocationAndSizeRender: false },
}));
const msdf = vi.hoisted(() => ({ drawLine: vi.fn(() => false), enabled: false }));
beforeEach(() => {
  msdf.drawLine.mockReset().mockReturnValue(false);
  msdf.enabled = false;
});
vi.mock("./msdfTextAtlas", () => ({
  MsdfTextAtlasRenderer: class {
    drawLine = msdf.drawLine;
  },
}));
vi.mock("@/utils/font", () => ({
  getFontIdentity: () => "font",
  getTextSize: (text: string, size: number) => new Vector((text.length * size) / 2, size),
  isBundledCanvasFont: () => msdf.enabled,
  replaceTextWhenProtect: (text: string) => text,
  resolveFont: (size: number, family = "sans-serif", weight = "normal") => `${weight} ${size}px ${family}`,
  setCanvasFont: (ctx: CanvasRenderingContext2D, font: string) => {
    ctx.font = font;
  },
  textToTextArray: (text: string) => text.split("\n"),
}));
import { TextRenderer } from "./textRenderer";

function setup() {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    font: "",
    lineWidth: 1,
  };
  const renderer = new TextRenderer({ canvas: { ctx }, renderer: { w: 800, h: 600 } } as unknown as Project);
  return { ctx, renderer };
}
describe("scaled vector text", () => {
  it("falls back only for missing MSDF lines while keeping their original positions", () => {
    msdf.enabled = true;
    msdf.drawLine.mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { ctx, renderer } = setup();
    renderer.renderMultiLineTextFromCenterWithStroke(
      "first\nsecond\nthird",
      new Vector(200, 100),
      24,
      Color.White,
      Color.Black,
    );
    expect(msdf.drawLine).toHaveBeenCalledTimes(3);
    expect(ctx.fillText).toHaveBeenCalledExactlyOnceWith("second", 0, 0);
    expect(ctx.strokeText).toHaveBeenCalledExactlyOnceWith("second", 0, 0);
  });
  it.each([0.5, 12, 24, 120])("keeps placement and font style at %ipx", (size) => {
    const { ctx, renderer } = setup();
    renderer.renderTextFromCenter("中文ABC", new Vector(200, 100), size, Color.White, "serif", "bold");
    expect(ctx.font).toBe("bold 100px serif");
    expect(ctx.translate).toHaveBeenCalledWith(200 - (5 * size) / 4, 100);
    expect(ctx.scale).toHaveBeenCalledWith(size / 100, size / 100);
    expect(ctx.fillText).toHaveBeenCalledWith("中文ABC", 0, 0);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });
  it("preserves multiline spacing and outline thickness after scaling", () => {
    const { ctx, renderer } = setup();
    renderer.renderMultiLineTextFromCenterWithStroke(
      "first\nsecond",
      new Vector(200, 100),
      20,
      Color.White,
      Color.Black,
    );
    expect(ctx.scale).toHaveBeenCalledWith(0.2, 0.2);
    expect(ctx.lineWidth * 0.2).toBe(8);
    expect(ctx.strokeText).toHaveBeenNthCalledWith(1, "first", 0, -60);
    expect(ctx.strokeText).toHaveBeenNthCalledWith(2, "second", 0, 60);
    expect(ctx.restore).toHaveBeenCalledOnce();
  });
  it("culls offscreen text and rejects invalid sizes without touching the transform", () => {
    const { ctx, renderer } = setup();
    renderer.renderText("offscreen", new Vector(20, 700), 24);
    renderer.renderText("invalid", new Vector(20, 20), NaN);
    renderer.renderMultiLineTextFromCenterWithStroke("invalid", Vector.getZero(), 0, Color.White, Color.Black);
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
  it("draws only visible outlined lines without shifting the original layout", () => {
    const { ctx, renderer } = setup();
    const text = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
    renderer.renderMultiLineTextFromCenterWithStroke(text, new Vector(400, 300), 20, Color.White, Color.Black);
    // 100 lines at 24px spacing: only 28 intersect the viewport including stroke margins.
    expect(ctx.fillText).toHaveBeenCalledTimes(28);
    expect(ctx.strokeText).toHaveBeenCalledTimes(28);
    expect(ctx.fillText).toHaveBeenNthCalledWith(1, "line 36", 0, -1620);
    expect(ctx.fillText).toHaveBeenLastCalledWith("line 63", 0, 1620);
  });
  it("keeps edge-overlapping text and culls fully offscreen outlined labels", () => {
    const { ctx, renderer } = setup();
    renderer.renderMultiLineTextFromCenterWithStroke("edge", new Vector(-40, 100), 20, Color.White, Color.Black);
    expect(ctx.fillText).toHaveBeenCalledOnce();
    ctx.fillText.mockClear();
    ctx.save.mockClear();
    renderer.renderMultiLineTextFromCenterWithStroke("outside", new Vector(-1000, 100), 20, Color.White, Color.Black);
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.save).not.toHaveBeenCalled();
  });
  it("omits unreadable fitted titles only when a minimum size is requested", () => {
    const { ctx, renderer } = setup();
    const rect = new Rectangle(new Vector(20, 20), new Vector(80, 40));
    const text = "a very long section title that cannot fit";
    renderer.renderTextInRectangle(text, rect, Color.White, undefined, undefined, 6);
    expect(ctx.fillText).not.toHaveBeenCalled();
    renderer.renderTextInRectangle(text, rect, Color.White);
    expect(ctx.fillText).toHaveBeenCalledOnce();
    ctx.fillText.mockClear();
    renderer.renderTextInRectangle("short", rect, Color.White, undefined, undefined, 6);
    expect(ctx.fillText).toHaveBeenCalledOnce();
  });
});
