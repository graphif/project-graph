type ToolPartLike = {
  type?: unknown;
  toolName?: unknown;
};

export function isAIToolPart(part: ToolPartLike): boolean {
  if (typeof part.type !== "string") return false;
  if (part.type.startsWith("tool-")) return part.type.length > "tool-".length;
  return part.type === "dynamic-tool" && typeof part.toolName === "string" && part.toolName.length > 0;
}

export function getAIToolPartName(part: ToolPartLike): string {
  if (typeof part.type === "string" && part.type.startsWith("tool-") && part.type.length > "tool-".length) {
    return part.type.slice("tool-".length);
  }
  if (part.type === "dynamic-tool" && typeof part.toolName === "string" && part.toolName.length > 0) {
    return part.toolName;
  }
  throw new Error("AI tool part does not contain a tool name");
}
