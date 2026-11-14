import { afterEach, describe, expect, it } from "vitest";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Project } from "@/core/Project";
import type { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import {
  markRuleNodeCreated,
  matchRuleQuery,
  normalizeRuleText,
  refreshNodeTextRules,
  registerNodeTextRules,
  ruleDisplayColor,
  ruleDisplayText,
  ruleKind,
  unregisterNodeTextRules,
} from "./NodeTextRules";

const options = {
  enabled: true,
  numbering: true,
  frameTitles: true,
  questionColor: [255, 235, 59],
  conclusionColor: [52, 103, 180],
  questionSuffixes: ["?", "？"],
  conclusionPrefixes: ["结论:", "结论："],
  statusPrefixes: ["✅ ", "❌ "],
  conclusionShortcut: "/jl",
  conclusionReplacement: "结论:",
  questionQuery: "/问题",
  conclusionQuery: "/结论",
};
function enable() {
  registerNodeTextRules("test", {
    ...options,
    questionColor: [255, 235, 59],
    conclusionColor: [52, 103, 180],
  });
}
function fixture(texts: string[]) {
  const nodes = texts.map((text, index) => ({
    text,
    uuid: String(index),
    sizeAdjust: "auto",
    rectangle: new Rectangle(Vector.getZero(), new Vector(100, 40)),
    forceAdjustSizeByText() {},
    forceAdjustHeightByText() {},
  })) as TextNode[];
  const p = {
    stageManager: { getTextNodes: () => nodes },
    controller: { resetCountdownTimer() {} },
  } as unknown as Project;
  return { p, nodes };
}
afterEach(() => unregisterNodeTextRules("test"));

describe("extension node text rules", () => {
  it("does not recolor or number without an active extension", () => {
    const { p, nodes } = fixture(["旧问题？"]);
    expect(ruleDisplayColor(nodes[0].text, Color.Red)).toBe(Color.Red);
    expect(ruleDisplayText(p, nodes[0])).toBe("旧问题？");
  });
  it("keeps legacy nodes unnumbered and recognizes old conclusions", () => {
    enable();
    const { p, nodes } = fixture(["旧问题？", "结论：历史"]);
    refreshNodeTextRules(p);
    expect(nodes.map((n) => ruleDisplayText(p, n))).toEqual(["旧问题？", "结论：历史"]);
    expect(ruleDisplayColor(nodes[1].text, Color.Transparent).b).toBe(180);
  });
  it("normalizes only the leading shorthand", () => {
    enable();
    expect(normalizeRuleText("/jl结果")).toBe("结论:结果");
    expect(normalizeRuleText("文字 /jl")).toBe("文字 /jl");
  });
  it("respects Task Arrange and TODO List status prefixes", () => {
    enable();
    for (const text of ["✅ 问题？", "❌ 问题？", "✅ 结论:结果", "❌ 结论:结果"]) {
      expect(ruleKind(text)).toBeUndefined();
      expect(ruleDisplayColor(text, Color.Red)).toBe(Color.Red);
      expect(matchRuleQuery("/问题", text)).toBe(false);
    }
  });
  it("renumbers independent categories without rewriting raw text", () => {
    enable();
    const { p, nodes } = fixture(["甲？", "乙？", "结论:甲"]);
    nodes.forEach(markRuleNodeCreated);
    refreshNodeTextRules(p);
    expect(nodes.map((n) => ruleDisplayText(p, n))).toEqual(["1. 甲？", "2. 乙？", "1. 结论:甲"]);
    nodes[0].text = "✅ 甲？";
    refreshNodeTextRules(p);
    expect(ruleDisplayText(p, nodes[1])).toBe("1. 乙？");
    expect(nodes[1].text).toBe("乙？");
    unregisterNodeTextRules("test");
    refreshNodeTextRules(p);
    expect(ruleDisplayText(p, nodes[1])).toBe("乙？");
  });
  it("prevents multiple extensions competing for these rules", () => {
    enable();
    expect(() =>
      registerNodeTextRules("other", { ...options, questionColor: [255, 235, 59], conclusionColor: [52, 103, 180] }),
    ).toThrow();
  });
});
