import { describe, expect, it } from "vitest";
import {
  createTabGroup,
  findTabGroup,
  findTabGroupByTabId,
  FIXED_SIDE_GROUP_IDS,
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
      sizes: [20, 80],
    });
  });

  it("defaults right side splits to one fifth for the new group", () => {
    const first = createTabGroup(["a"], "first");
    const second = createTabGroup(["b"], "second");
    const root = splitTabGroup(first, "first", second, "right", "split");

    expect(root).toMatchObject({
      direction: "horizontal",
      children: [{ id: "first" }, { id: "second" }],
      sizes: [80, 20],
    });
  });

  it("can create stable left/right side groups for reuse", () => {
    const center = createTabGroup(["project"], "center");
    const left = createTabGroup(["find"], FIXED_SIDE_GROUP_IDS.left);
    const withLeft = splitTabGroup(center, "center", left, "left");
    expect(findTabGroup(withLeft, FIXED_SIDE_GROUP_IDS.left)?.tabIds).toEqual(["find"]);

    const stacked = insertTabIntoGroup(withLeft, FIXED_SIDE_GROUP_IDS.left, "tags");
    expect(findTabGroup(stacked, FIXED_SIDE_GROUP_IDS.left)?.tabIds).toEqual(["find", "tags"]);

    const right = createTabGroup(["ai"], FIXED_SIDE_GROUP_IDS.right);
    const withRight = splitTabGroup(stacked, "center", right, "right");
    expect(findTabGroup(withRight, FIXED_SIDE_GROUP_IDS.left)?.tabIds).toEqual(["find", "tags"]);
    expect(findTabGroup(withRight, FIXED_SIDE_GROUP_IDS.right)?.tabIds).toEqual(["ai"]);
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
