import { describe, expect, it } from "vitest";
import { codeHighlighter, ensureCodeLanguage } from "./codeHighlight";

describe("on-demand syntax highlighting", () => {
  it("keeps common languages ready and loads uncommon languages on demand", async () => {
    expect(codeHighlighter.registered("javascript")).toBe(true);
    expect(codeHighlighter.registered("brainfuck")).toBe(false);
    expect(await ensureCodeLanguage("javascript")).toBe(false);
    expect(await ensureCodeLanguage("plaintext")).toBe(false);
    expect(await ensureCodeLanguage("brainfuck")).toBe(true);
    expect(codeHighlighter.highlight("brainfuck", "++[>++<-].").children.length).toBeGreaterThan(0);
    expect(await ensureCodeLanguage("brainfuck")).toBe(false);
    expect(await ensureCodeLanguage("not-a-real-language")).toBe(false);
  });
});
