import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailsManager } from "./entityDetailsManager";
import type { Entity } from "../abstract/StageEntity";

afterEach(() => vi.restoreAllMocks());

describe("headless details conversion", () => {
  it("preserves headings, marks, links, lists, code, tables and math without UI plugins", () => {
    const markdown = [
      "# 标题",
      "",
      "**粗体** 和 *斜体* [链接](https://example.com)",
      "",
      "- 第一项",
      "- 第二项",
      "",
      "```typescript",
      "const n = 1;",
      "```",
      "",
      "| 名称 | 数量 |",
      "| --- | --- |",
      "| 苹果 | 2 |",
      "",
      "$$",
      "x^2",
      "$$",
    ].join("\n");
    const details = DetailsManager.markdownToDetails(markdown);
    const before = JSON.stringify(details);
    const result = DetailsManager.detailsToMarkdown(details);
    for (const expected of [
      "# 标题",
      "**粗体**",
      "_斜体_",
      "https://example.com",
      "第一项",
      "第二项",
      "```typescript",
      "const n = 1;",
      "苹果",
      "x^2",
    ])
      expect(result).toContain(expected);
    expect(JSON.stringify(details)).toBe(before);
  });

  it("shares conversion across repeated searches and canvas frames, invalidating on edits", () => {
    const entity = { details: [{ type: "p", children: [{ text: "before" }] }] } as Entity;
    const manager = new DetailsManager(entity);
    const convert = vi.spyOn(DetailsManager, "detailsToMarkdown");
    expect(manager.getBeSearchingText()).toContain("before");
    for (let frame = 0; frame < 120; frame++) manager.getRenderStageString();
    manager.getBeSearchingText();
    expect(convert).toHaveBeenCalledTimes(1);
    entity.details = [{ type: "p", children: [{ text: "after" }] }];
    expect(manager.getRenderStageString()).toContain("after");
    expect(convert).toHaveBeenCalledTimes(2);
  });
});
