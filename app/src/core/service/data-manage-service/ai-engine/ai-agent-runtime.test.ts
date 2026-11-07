import { describe, expect, it } from "vitest";
import { composeAgentSystemPrompt, mergeAgentToolSets } from "./AIAgentRuntime";

describe("AI agent runtime composition", () => {
  it("combines built-in, MCP, and Skill tools without overwriting a name", () => {
    const builtIn = { read_node: { description: "Read" } } as any;
    const mcp = { mcp__docs__search: { description: "Search" } } as any;
    const skills = { activate_skill: { description: "Activate" } } as any;

    expect(Object.keys(mergeAgentToolSets(builtIn, mcp, skills))).toEqual([
      "read_node",
      "mcp__docs__search",
      "activate_skill",
    ]);
    expect(() => mergeAgentToolSets(builtIn, { read_node: {} } as any)).toThrow(/duplicate tool name/i);
  });

  it("injects skill snapshots outside the compacted message history", () => {
    const prompt = composeAgentSystemPrompt("base", "<available_skills />\n<skill_content />", "saved memory");

    expect(prompt).toBe(
      "base\n\n<agent-skills>\n<available_skills />\n<skill_content />\n</agent-skills>\n\n<session-memory>\nsaved memory\n</session-memory>",
    );
  });
});
