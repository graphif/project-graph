import { describe, expect, it } from "vitest";
import {
  createTabGroup,
  findTabGroupByTabId,
  getTabGroups,
  insertTabIntoGroup,
  removeTabFromGroups,
  splitTabGroup,
  updateTabSplitSizes,
} from "./TabGroup";

describe("TabGroup", () => {
  it("splits groups on either side", () => {
    const first = createTabGroup(["a"], "first");
    const second = createTabGroup(["b"], "second");
    const root = splitTabGroup(first, first.id, second, "left", "split");

    expect(root).toMatchObject({
      id: "split",
      type: "split",
      direction: "horizontal",
      children: [{ id: "second" }, { id: "first" }],
    });
  });

  it("moves and reorders tabs without duplicates", () => {
    const root = createTabGroup(["a", "b", "c"], "group");
    const reordered = insertTabIntoGroup(root, "group", "a", 2);

    expect(getTabGroups(reordered)[0].tabIds).toEqual(["b", "c", "a"]);
  });

  it("collapses an empty source group", () => {
    const first = createTabGroup(["a"], "first");
    const second = createTabGroup(["b"], "second");
    const root = splitTabGroup(first, "first", second, "right", "split");
    const result = removeTabFromGroups(root, "a");

    expect(result.root).toEqual(second);
    expect(findTabGroupByTabId(result.root, "b")?.id).toBe("second");
  });

  it("selects a neighboring tab when removing the active tab", () => {
    const group = createTabGroup(["a", "b", "c"], "group");
    group.activeTabId = "b";
    const result = removeTabFromGroups(group, "b");

    expect(result.nextActiveTabId).toBe("c");
    expect(getTabGroups(result.root)[0]).toMatchObject({ tabIds: ["a", "c"], activeTabId: "c" });
  });

  it("updates nested split sizes", () => {
    const first = createTabGroup(["a"], "first");
    const second = createTabGroup(["b"], "second");
    const root = splitTabGroup(first, "first", second, "bottom", "split");
    const updated = updateTabSplitSizes(root, "split", [30, 70]);

    expect(updated).toMatchObject({ direction: "vertical", sizes: [30, 70] });
  });
});
