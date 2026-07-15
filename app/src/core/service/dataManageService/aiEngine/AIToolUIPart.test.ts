import { describe, expect, it } from "vitest";
import { getAIToolPartName, isAIToolPart } from "./AIToolUIPart";

describe("AI tool UI parts", () => {
  it("recognizes built-in and dynamic tool parts", () => {
    expect(isAIToolPart({ type: "tool-delete_node" })).toBe(true);
    expect(isAIToolPart({ type: "dynamic-tool", toolName: "mcp__demo__remove" })).toBe(true);
    expect(isAIToolPart({ type: "text" })).toBe(false);
  });

  it("gets the visible tool name from both part formats", () => {
    expect(getAIToolPartName({ type: "tool-delete_node" })).toBe("delete_node");
    expect(getAIToolPartName({ type: "dynamic-tool", toolName: "mcp__demo__remove" })).toBe("mcp__demo__remove");
  });

  it("does not treat a dynamic part without a tool name as a tool", () => {
    expect(isAIToolPart({ type: "dynamic-tool" })).toBe(false);
    expect(() => getAIToolPartName({ type: "dynamic-tool" })).toThrow(/tool name/i);
  });
});
