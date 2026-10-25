import { describe, expect, it, vi } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Project } from "@/core/Project";
import type { Section } from "@/core/stage/stageObject/entity/Section";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/render/canvas2d/renderer", () => ({
  Renderer: { FONT_SIZE: 16, NODE_PADDING: 4, NODE_ROUNDED_RADIUS: 12 },
}));
vi.mock("@/core/service/Settings", () => ({ Settings: { sectionBigTitleOpacity: 0.5 } }));
vi.mock("@/utils/font", () => ({ getTextSize: vi.fn() }));
import { SectionRenderer } from "./SectionRenderer";
import { Settings } from "@/core/service/Settings";

describe("section overview title detail", () => {
  it("clips the title strip from the full section outline", () => {
    const ctx = { save: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), restore: vi.fn() };
    const draw = vi.fn();
    const renderer = new SectionRenderer({
      camera: { currentScale: 0.1 },
      canvas: { ctx },
      renderer: { transformWorld2View: (point: Vector) => point },
      shapeRenderer: { renderRect: draw },
    } as unknown as Project);
    const previousMode = Settings.sectionBackgroundFillMode;
    Settings.sectionBackgroundFillMode = "titleOnly";
    try {
      renderer.renderBackgroundColor({
        text: "title",
        color: Color.Black,
        rectangle: new Rectangle(new Vector(10, 20), new Vector(800, 400)),
      } as Section);
      expect(ctx.rect).toHaveBeenCalledWith(10, 20, 80, 2.4000000000000004);
      expect(ctx.clip).toHaveBeenCalledOnce();
      expect(draw.mock.calls[0][0].size).toEqual(new Vector(80, 40));
      expect(draw.mock.calls[0][4]).toBe(12);
      expect(ctx.restore).toHaveBeenCalledOnce();
    } finally {
      Settings.sectionBackgroundFillMode = previousMode;
    }
  });
  it.each([0.1, 0.25, 1, 2])("keeps overview borders visible at scale %s", (scale) => {
    const draw = vi.fn();
    const renderer = new SectionRenderer({
      camera: { currentScale: scale },
      renderer: { transformWorld2View: (point: Vector) => point },
      sectionMethods: { isSectionBigTitleActive: () => true },
      stageStyleManager: { currentStyle: { StageObjectBorder: Color.Black } },
      shapeRenderer: { renderRect: draw, renderDashedRect: draw },
    } as unknown as Project);
    for (const borderStyle of ["solid", "dashed"]) {
      renderer["renderNoCollapse"]({
        borderStyle,
        rectangle: new Rectangle(Vector.getZero(), new Vector(800, 400)),
      } as Section);
      expect(draw.mock.lastCall?.[3]).toBe(Math.max(1, 2 * scale));
      renderer["renderNoCollapse"]({
        borderStyle,
        parentSection: {} as Section,
        rectangle: new Rectangle(Vector.getZero(), new Vector(800, 400)),
      } as Section);
      expect(draw.mock.lastCall?.[3]).toBe(2 * scale);
    }
  });

  it("retains selected titles and the background while editing", () => {
    const draw = vi.fn(),
      background = vi.fn();
    const renderer = new SectionRenderer({
      camera: { currentScale: 1 },
      renderer: { transformWorld2View: (point: Vector) => point },
      sectionMethods: { isSectionBigTitleActive: () => true },
      stageStyleManager: { currentStyle: { Background: Color.Black } },
      textRenderer: { renderTextInRectangle: draw },
      shapeRenderer: { renderRect: background },
    } as unknown as Project);
    const section = {
      text: "section",
      color: Color.Transparent,
      rectangle: new Rectangle(Vector.getZero(), new Vector(80, 40)),
      isSelected: false,
      isEditingTitle: false,
    } as Section;
    renderer.renderBigCoveredTitle(section);
    expect(draw.mock.calls[0][5]).toBe(6);
    section.isSelected = true;
    section.rectangle.size = new Vector(10, 10);
    renderer.renderBigCoveredTitle(section);
    expect(draw.mock.calls[1][5]).toBe(0);
    section.isEditingTitle = true;
    renderer.renderBigCoveredTitle(section);
    expect(draw).toHaveBeenCalledTimes(2);
    expect(background).toHaveBeenCalledTimes(3);
  });
});
