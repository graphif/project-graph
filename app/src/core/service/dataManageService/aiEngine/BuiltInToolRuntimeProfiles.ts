import type { BuiltInToolCapability } from "./BuiltInToolRegistry";

const closedProjectCapabilities = new Set<BuiltInToolCapability>([
  "project",
  "references",
  "history",
  "effects",
  "delete",
  "text",
  "graph",
  "layout",
  "tree-import",
  "node-connect",
  "attachments",
  "dom",
  "image",
  "settings",
  "network",
  "model",
  "abort-signal",
]);

export function canClosedProjectProvideCapabilities(capabilities: readonly BuiltInToolCapability[]): boolean {
  return capabilities.every((capability) => closedProjectCapabilities.has(capability));
}

export function canOpenProjectProvideCapabilities(capabilities: readonly BuiltInToolCapability[]): boolean {
  void capabilities;
  return true;
}
