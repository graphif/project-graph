import { expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  definition: {
    name: "fixture_tool",
    description: "Fixture tool visible through every built-in consumer",
    inputSchema: { fixture: true },
  },
}));

vi.mock("@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry", () => ({
  AIObjectReferenceError: class AIObjectReferenceError extends Error {},
  AIObjectReferenceRegistry: class AIObjectReferenceRegistry {},
}));
vi.mock("@toon-format/toon", () => ({ encode: (value: unknown) => JSON.stringify(value) }));
vi.mock("ai", () => ({ tool: (definition: unknown) => definition }));
vi.mock("zod/v4", () => ({ default: { toJSONSchema: (schema: unknown) => ({ schema }) } }));
vi.mock("./BuiltInToolRegistry", () => ({
  builtInToolCatalog: [fixture.definition],
  invokeBuiltInTool: vi.fn(),
}));

import { createBuiltInToolAgentTools } from "./BuiltInToolAgentAdapter";
import { getBuiltInToolCliEntries } from "./BuiltInToolCliAdapter";
import { getBuiltInToolWindowEntries } from "./BuiltInToolWindowAdapter";

it("makes a Registry-only fixture tool visible to the Agent, CLI, and tool-window adapters", () => {
  const agentTools = createBuiltInToolAgentTools({} as never, {} as never) as Record<string, Record<string, unknown>>;

  expect(Object.keys(agentTools)).toEqual(["fixture_tool"]);
  expect(agentTools.fixture_tool).toMatchObject({
    description: fixture.definition.description,
    inputSchema: fixture.definition.inputSchema,
  });
  expect(getBuiltInToolWindowEntries()).toEqual([
    {
      name: fixture.definition.name,
      description: fixture.definition.description,
      parameters: fixture.definition.inputSchema,
    },
  ]);
  expect(getBuiltInToolCliEntries()).toEqual([
    {
      name: fixture.definition.name,
      description: fixture.definition.description,
      inputSchema: { schema: fixture.definition.inputSchema },
    },
  ]);
});
