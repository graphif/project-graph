import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/service/Settings", () => ({ Settings: { defaultFontFamily: "sans-serif" } }));
vi.mock("@/core/service/ProjectToolSettingsSchema", () => ({
  DEFAULT_FONT_FAMILY: "sans-serif",
  MAC_DEFAULT_FONT_FAMILY: "sans-serif",
}));
vi.hoisted(() => {
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
});

import { isBundledCanvasFont, resolveFont, setCanvasFont } from "./font";

function context() {
  let actual = "10px sans-serif";
  const assign = vi.fn((font: string) => {
    actual = font.replace(/^normal /, "");
  });
  return {
    ctx: {
      get font() {
        return actual;
      },
      set font(value: string) {
        assign(value);
      },
    } as CanvasRenderingContext2D,
    assign,
    restore: (font: string) => {
      actual = font;
    },
  };
}

describe("setCanvasFont", () => {
  it("avoids assigning the same font after Canvas normalizes its representation", () => {
    const { ctx, assign } = context();
    for (let i = 0; i < 600; i++) setCanvasFont(ctx, "normal 24px sans-serif");
    expect(ctx.font).toBe("24px sans-serif");
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("applies changes in size, family and weight", () => {
    const { ctx, assign } = context();
    for (const font of ["normal 24px sans-serif", "normal 25px sans-serif", "normal 25px serif", "bold 25px serif"]) {
      setCanvasFont(ctx, font);
    }
    expect(assign).toHaveBeenCalledTimes(4);
    expect(ctx.font).toBe("bold 25px serif");
  });

  it("detects external assignments and canvas restore or resize", () => {
    const { ctx, assign, restore } = context();
    setCanvasFont(ctx, "normal 24px sans-serif");
    ctx.font = "bold 16px serif";
    setCanvasFont(ctx, "normal 24px sans-serif");
    restore("10px sans-serif");
    setCanvasFont(ctx, "normal 24px sans-serif");
    expect(ctx.font).toBe("24px sans-serif");
    expect(assign).toHaveBeenCalledTimes(4);
  });

  it("keeps independent state for each canvas", () => {
    const a = context();
    const b = context();
    setCanvasFont(a.ctx, "normal 24px sans-serif");
    setCanvasFont(b.ctx, "normal 24px sans-serif");
    expect(a.assign).toHaveBeenCalledTimes(1);
    expect(b.assign).toHaveBeenCalledTimes(1);
  });
});

it("keeps the configured system font on desktop instead of swapping in the MSDF font", () => {
  vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
  try {
    expect(isBundledCanvasFont()).toBe(false);
    expect(resolveFont(32)).toBe("normal 32px sans-serif");
  } finally {
    vi.unstubAllGlobals();
  }
});
