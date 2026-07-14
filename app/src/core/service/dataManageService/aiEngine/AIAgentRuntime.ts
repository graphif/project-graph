import type { ToolSet } from "ai";

export function mergeAgentToolSets(...toolSets: ToolSet[]): ToolSet {
  const result: ToolSet = {};
  for (const toolSet of toolSets) {
    for (const [name, agentTool] of Object.entries(toolSet)) {
      if (name in result) throw new Error(`Duplicate tool name: ${name}`);
      result[name] = agentTool;
    }
  }
  return result;
}

export function composeAgentSystemPrompt(base: string, skillContext: string, sessionMemory?: string): string {
  const sections = [base];
  if (skillContext) sections.push(`<agent-skills>\n${skillContext}\n</agent-skills>`);
  if (sessionMemory) sections.push(`<session-memory>\n${sessionMemory}\n</session-memory>`);
  return sections.join("\n\n");
}
