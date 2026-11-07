import { builtInToolCatalog, type BuiltInToolDefinition } from "./BuiltInToolRegistry";

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
