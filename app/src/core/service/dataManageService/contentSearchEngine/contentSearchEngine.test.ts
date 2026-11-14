import type { Project } from "@/core/Project";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (target: unknown) => target }));
vi.mock("@/core/stage/stageObject/abstract/StageEntity", () => ({ Entity: class {} }));
vi.mock("@/core/stage/stageObject/association/Edge", () => ({ Edge: class {} }));
vi.mock("@/core/stage/stageObject/entity/Section", () => ({ Section: class {} }));
vi.mock("@/core/stage/stageObject/entity/TextNode", () => ({ TextNode: class {} }));
vi.mock("@/core/stage/stageObject/entity/UrlNode", () => ({ UrlNode: class {} }));

import { ContentSearch, SearchScope } from "./contentSearchEngine";

function createSearch() {
  const texts = ["Alpha 12", "alpha 34", "Beta 56", "alpha.\\d+"];
  const nodes = texts.map(
    (_, index) =>
      ({
        uuid: String(index),
        isSelected: index === 0 || index === 2,
        collisionBox: {
          getRectangle: () => new Rectangle(new Vector(index * 20, 0), new Vector(10, 10)),
        },
      }) as StageObject,
  );
  const search = new ContentSearch({
    stageManager: { getStageObjects: () => nodes },
  } as unknown as Project);
  vi.spyOn(search, "getStageObjectText").mockImplementation((node) => texts[Number(node.uuid)]);
  return { search, nodes };
}

describe("ContentSearch", () => {
  it("treats regular expression characters literally by default", () => {
    const { search, nodes } = createSearch();
    expect(search.startSearch("alpha.\\d+", false)).toBe(true);
    expect(search.searchResultNodes).toEqual([nodes[3]]);
  });

  it("matches patterns across all nodes and respects case sensitivity", () => {
    const { search, nodes } = createSearch();
    search.isRegex = true;
    search.startSearch("^alpha\\s+\\d+$", false);
    expect(search.searchResultNodes).toEqual([nodes[0], nodes[1]]);

    search.isCaseSensitive = true;
    search.startSearch("^alpha\\s+\\d+$", false);
    expect(search.searchResultNodes).toEqual([nodes[1]]);

    search.isRegex = false;
    search.startSearch("^alpha\\s+\\d+$", false);
    expect(search.searchResultNodes).toEqual([]);
  });

  it.each([
    [SearchScope.ALL, [0, 1, 3]],
    [SearchScope.SELECTED, [0]],
    [SearchScope.SELECTED_BOUNDS, [0, 1]],
  ])("respects the %s search scope in regex mode", (scope, indexes) => {
    const { search, nodes } = createSearch();
    search.isRegex = true;
    search.searchScope = scope;
    search.startSearch("alpha", false);
    expect(search.searchResultNodes).toEqual(indexes.map((index) => nodes[index]));
  });

  it("clears stale matches before reporting an invalid expression and can recover", () => {
    const { search, nodes } = createSearch();
    search.isRegex = true;
    search.startSearch("alpha", false);
    search.currentSearchResultIndex = 1;

    expect(() => search.startSearch("[", false)).toThrow(SyntaxError);
    expect(search.searchResultNodes).toEqual([]);
    expect(search.currentSearchResultIndex).toBe(-1);

    expect(search.startSearch("Beta \\d+", false)).toBe(true);
    expect(search.searchResultNodes).toEqual([nodes[2]]);
  });

  it("clears matches for an empty pattern instead of matching every node", () => {
    const { search } = createSearch();
    search.isRegex = true;
    search.startSearch("alpha", false);
    search.currentSearchResultIndex = 1;

    expect(search.startSearch("", false)).toBe(false);
    expect(search.searchResultNodes).toEqual([]);
    expect(search.currentSearchResultIndex).toBe(-1);
  });
});
