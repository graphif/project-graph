import z from "zod/v4";
import { builtInToolCatalog, getBuiltInToolDefinition, type BuiltInToolDefinition } from "./BuiltInToolRegistry";

export type BuiltInToolCliEntry = {
  name: string;
  description: string;
  inputSchema: object;
};

function toCliEntry({ name, description, inputSchema }: BuiltInToolDefinition): BuiltInToolCliEntry {
  return {
    name,
    description,
    inputSchema: z.toJSONSchema(inputSchema),
  };
}

export function getBuiltInToolCliEntries(): BuiltInToolCliEntry[] {
  return builtInToolCatalog.map(toCliEntry);
}

export function getBuiltInToolCliEntry(name: string): BuiltInToolCliEntry | undefined {
  const definition = getBuiltInToolDefinition(name);
  return definition ? toCliEntry(definition) : undefined;
}
