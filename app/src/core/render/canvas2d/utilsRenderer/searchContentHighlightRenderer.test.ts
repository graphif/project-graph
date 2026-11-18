import type { Project } from "@/core/Project";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));

import { SearchContentHighlightRenderer } from "./searchContentHighlightRenderer";

describe("SearchContentHighlightRenderer", () => {
  it("skips offscreen matches while keeping visible highlights during camera shake", () => {
    const fullyVisible = new Rectangle(new Vector(20, 20), new Vector(10, 10));
    const visibleStroke = new Rectangle(new Vector(-21.5, 20), new Vector(10, 10));
    const outside = new Rectangle(new Vector(-23, 20), new Vector(10, 10));
    const searchResultNodes = [fullyVisible, visibleStroke, outside].map((rect) => ({
      collisionBox: { getRectangle: () => rect },
    }));
    const transformWorld2View = vi.fn((rect: Rectangle) => rect);
    const renderRect = vi.fn();
    const renderer = new SearchContentHighlightRenderer({
      camera: { currentScale: 2, shakeLocation: new Vector(2, 0) },
      contentSearch: { searchResultNodes },
      renderer: { transformWorld2View },
      shapeRenderer: { renderRect },
      stageStyleManager: { currentStyle: { effects: { warningShadow: Color.White } } },
    } as unknown as Project);

    renderer.render(0, new Rectangle(Vector.getZero(), new Vector(100, 100)));

    expect(transformWorld2View.mock.calls).toEqual([
      [fullyVisible.expandFromCenter(10)],
      [visibleStroke.expandFromCenter(10)],
    ]);
    expect(renderRect).toHaveBeenCalledTimes(2);
    expect(searchResultNodes).toHaveLength(3);
  });
});
