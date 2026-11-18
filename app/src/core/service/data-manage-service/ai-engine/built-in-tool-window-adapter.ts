import { builtInToolCatalog, type BuiltInToolDefinition } from "./built-in-tool-registry";

export type BuiltInToolWindowEntry = {
  name: string;
  description: string;
  parameters: BuiltInToolDefinition["inputSchema"];
};

export function getBuiltInToolWindowEntries(): BuiltInToolWindowEntry[] {
  return builtInToolCatalog.map(({ name, description, inputSchema }) => ({
    name,
    description,
    parameters: inputSchema,
  }));
}
