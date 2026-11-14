import { afterEach, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import { serialize, deserialize } from "@graphif/serializer";
import type { Project } from "@/core/Project";
vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/render/canvas2d/renderer", () => ({
  Renderer: { FONT_SIZE: 24, NODE_PADDING: 10, NODE_ROUNDED_RADIUS: 12 },
}));
vi.mock("@/core/service/Settings", () => ({ Settings: {} }));
vi.mock("@/core/stage/stageObject/abstract/ConnectableEntity", () => ({
  ConnectableEntity: class {
    _isSyncing = false;
    updateFatherSectionByMove() {}
  },
}));
vi.mock("@/utils/font", () => ({
  getMultiLineTextSize: (text: string) => new Vector(text.length * 12, 36),
  getTextSize: () => new Vector(50, 24),
}));
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import {
  applyRuleFrameTitles,
  markRuleNodeCreated,
  refreshNodeTextRules,
  registerNodeTextRules,
  ruleDisplayText,
  unregisterNodeTextRules,
} from "./NodeTextRules";

afterEach(() => unregisterNodeTextRules("integration"));
it("preserves real node metadata, raw text, manual titles and separate number sequences", () => {
  const nodes: TextNode[] = [],
    frames: Section[] = [];
  const p = {
    stageManager: { getTextNodes: () => nodes, getSections: () => frames, getAssociations: () => [] },
    textRenderer: { measureMultiLineTextSize: (text: string) => new Vector(text.length * 12, 36) },
    syncAssociationManager: { syncFrom: vi.fn() },
  } as unknown as Project;
  const old = new TextNode(p, { text: "历史结论" });
  expect(serialize(old)).not.toHaveProperty("nodeRuleCreatedAt");
  registerNodeTextRules("integration", {
    enabled: true,
    numbering: true,
    frameTitles: true,
    questionColor: [255, 235, 59],
    conclusionColor: [52, 103, 180],
  });
  const a = new TextNode(p, { text: "甲？" }),
    b = new TextNode(p, { text: "乙？" });
  nodes.push(old, a, b);
  markRuleNodeCreated(a);
  markRuleNodeCreated(b);
  refreshNodeTextRules(p);
  const encoded = serialize(b);
  const loaded = deserialize(encoded, p) as TextNode;
  expect(loaded.nodeRuleCreatedAt).toBe(b.nodeRuleCreatedAt);
  expect(loaded.text).toBe("乙？");
  a.rename("✅ 甲？");
  expect(ruleDisplayText(p, b)).toBe("1. 乙？");
  b.rename("/jl结果");
  expect(b.text).toBe("结论:结果");
  expect(ruleDisplayText(p, b)).toBe("1. 结论:结果");
  const frame = new Section(p, { text: "section" });
  frame.rename("");
  frames.push(frame);
  a.rename("甲？");
  a.parentSection = frame;
  applyRuleFrameTitles(p);
  expect(frame.text).toBe("");
  const automatic = new Section(p, { text: "section" });
  frames.push(automatic);
  a.parentSection = automatic;
  applyRuleFrameTitles(p);
  expect(automatic.text).toBe("甲？");
  a.rename("后续问题？");
  applyRuleFrameTitles(p);
  expect(automatic.text).toBe("甲？");
});
