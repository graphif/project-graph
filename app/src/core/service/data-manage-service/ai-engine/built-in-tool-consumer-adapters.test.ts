import { expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  definition: {
    name: "fixture_tool",
    description: "Fixture tool visible through every built-in consumer",
    inputSchema: { fixture: true },
  },
}));

vi.mock("@/core/service/data-manage-service/ai-engine/ai-object-reference-registry", () => ({
  AIObjectReferenceError: class AIObjectReferenceError extends Error {},
  AIObjectReferenceRegistry: class AIObjectReferenceRegistry {},
}));
vi.mock("@toon-format/toon", () => ({ encode: (value: unknown) => JSON.stringify(value) }));
vi.mock("zod/v4", () => ({ default: { toJSONSchema: (schema: unknown) => ({ schema }) } }));
vi.mock("./built-in-tool-registry", () => ({
  builtInToolCatalog: [fixture.definition],
  createLiveProjectBuiltInToolRuntimeHost: vi.fn(() => ({})),
  invokeBuiltInTool: vi.fn(),
}));

import { getBuiltInToolCliEntries } from "./built-in-tool-cli-adapter";
import { getBuiltInToolWindowEntries } from "./built-in-tool-window-adapter";

it("makes a Registry-only fixture tool visible to the CLI and tool-window adapters", () => {
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
