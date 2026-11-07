// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { runThemeTransition } from "./themeTransition";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).animate;
  delete (document as Partial<Document>).startViewTransition;
});

describe("theme ripple", () => {
  it.each([1, 2, 3, 25, 26])(
    "overlaps %s ripples with one snapshot pair and preserves the final theme",
    async (clicks) => {
      vi.stubGlobal("innerWidth", 1200);
      vi.stubGlobal("innerHeight", 800);
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const update = vi.fn();
      const animations: { onfinish?: () => void; cancel: ReturnType<typeof vi.fn> }[] = [];
      Element.prototype.animate = vi.fn(() => {
        const animation = { cancel: vi.fn() };
        animations.push(animation);
        return animation;
      }) as any;
      document.startViewTransition = vi.fn((callback: any) => {
        callback();
        return { ready: Promise.resolve(), finished, updateCallbackDone: Promise.resolve(), skipTransition: finish };
      }) as any;
      const task = runThemeTransition({ x: 1100, y: 30 }, update);
      await Promise.resolve();
      const frames = vi.mocked(Element.prototype.animate).mock.calls[0][0] as { r: string[] };
      expect(parseFloat(frames.r[1])).toBeGreaterThan(Math.hypot(1100, 770));
      expect(document.documentElement.dataset.themeTransition).toBe("ripple");
      for (let i = 1; i < clicks; i++) void runThemeTransition({ x: 1100, y: 30 }, update);
      const newCircles = document.querySelectorAll("#pg-theme-ripple-mask circle");
      const oldCircles = document.querySelectorAll("#pg-theme-ripple-old-mask circle");
      expect(newCircles).toHaveLength(clicks);
      expect(oldCircles).toHaveLength(clicks);
      expect(document.querySelectorAll("#pg-theme-ripple-old-mask rect")).toHaveLength(1);
      newCircles.forEach((circle, i) => {
        expect(circle.getAttribute("fill")).toBe(i % 2 === 0 ? "white" : "black");
        expect(oldCircles[i].getAttribute("fill")).toBe(i % 2 === 0 ? "black" : "white");
      });
      expect(document.startViewTransition).toHaveBeenCalledOnce();
      expect(update).toHaveBeenCalledOnce();
      const rippleAnimations = animations.filter((animation) => animation.onfinish);
      expect(rippleAnimations).toHaveLength(clicks);
      for (const [index, animation] of rippleAnimations.entries()) {
        animation.onfinish!();
        expect(document.querySelectorAll("#pg-theme-ripple-mask circle")).toHaveLength(clicks - index);
        expect(document.querySelectorAll("#pg-theme-ripple-old-mask circle")).toHaveLength(clicks - index);
        expect(document.querySelectorAll("#pg-theme-ripple-old-mask rect")).toHaveLength(1);
      }
      await task;
      expect(update).toHaveBeenCalledTimes(clicks % 2 ? 1 : 2);
      expect(document.documentElement.dataset.themeTransition).toBeUndefined();
      expect(document.getElementById("pg-theme-ripple-mask")).toBeNull();
      expect(document.getElementById("pg-theme-ripple-old-mask")).toBeNull();
    },
  );

  it("switches immediately without snapshot support", async () => {
    const update = vi.fn();
    await runThemeTransition({ x: 0, y: 0 }, update);
    expect(update).toHaveBeenCalledOnce();
  });

  it("respects reduced motion", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    document.startViewTransition = vi.fn();
    const update = vi.fn();
    await runThemeTransition({ x: 0, y: 0 }, update);
    expect(update).toHaveBeenCalledOnce();
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it("cleans up after a skipped snapshot", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const skip = vi.fn();
    document.startViewTransition = vi.fn((callback: any) => {
      callback();
      return {
        ready: Promise.reject(new Error("hidden")),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: skip,
      };
    }) as any;
    await runThemeTransition({ x: 0, y: 0 }, vi.fn());
    expect(skip).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.themeTransition).toBeUndefined();
  });
});
