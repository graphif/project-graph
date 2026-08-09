import { describe, expect, it, vi } from "vitest";
import z from "zod/v4";

const mocks = vi.hoisted(() => {
  class ReferenceError extends Error {
    constructor(
      readonly code: string,
      readonly ref: string,
      message: string,
    ) {
      super(message);
    }
  }

  return {
    ReferenceError,
    executorModuleLoaded: false,
    executorCalls: [] as Array<{ index: number; input: unknown; context: unknown }>,
    executors: {} as Record<string, (...args: any[]) => Promise<unknown>>,
  };
});

vi.mock("@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry", () => ({
  AIObjectReferenceError: mocks.ReferenceError,
  AIObjectReferenceRegistry: class AIObjectReferenceRegistry {},
}));
vi.mock("@toon-format/toon", () => ({ encode: (value: unknown) => JSON.stringify(value) }));
vi.mock("ai", () => ({ tool: (definition: unknown) => definition }));
vi.mock("./BuiltInToolExecutors", () => {
  mocks.executorModuleLoaded = true;
  return { builtInToolExecutors: mocks.executors };
});

import { AITools } from "./AITools";
import { builtInToolCatalog, invokeBuiltInTool } from "./BuiltInToolRegistry";

mocks.executors = Object.fromEntries(
  builtInToolCatalog.map(({ name }, index) => [
    name,
    vi.fn(async (_project, input, _references, context) => {
      mocks.executorCalls.push({ index, input, context });
      if (index === 1) throw new mocks.ReferenceError("stale_ref", input.ref, "引用已失效");
      return { index, input };
    }),
  ]),
);

describe("AITools compatibility adapters", () => {
  it("projects the canonical catalog into the unchanged tool-window shape without loading executors", () => {
    expect(AITools.tools).toHaveLength(29);
    expect(AITools.tools.map(({ name, description, parameters }) => ({ name, description, parameters }))).toEqual(
      builtInToolCatalog.map(({ name, description, inputSchema }) => ({
        name,
        description,
        parameters: inputSchema,
      })),
    );

    const toolSet = AITools.createTools({} as never, {} as never) as Record<string, Record<string, unknown>>;
    expect(Object.keys(toolSet)).toEqual(builtInToolCatalog.map(({ name }) => name));
    expect(toolSet.get_all_nodes).not.toHaveProperty("toModelOutput");
    expect(() => AITools.tools.map(({ parameters }) => z.toJSONSchema(parameters))).not.toThrow();
    expect(mocks.executorModuleLoaded).toBe(false);
  });

  it("validates input before loading an executor", async () => {
    await expect(invokeBuiltInTool("delete_node", { ref: "e1" }, {} as never, {} as never)).rejects.toThrow();
    expect(mocks.executorModuleLoaded).toBe(false);
  });

  it("loads and invokes only the selected executor when an AI SDK tool executes", async () => {
    const tools = AITools.createTools({} as never, {} as never) as unknown as Record<
      string,
      { execute(input: unknown, context?: unknown): Promise<string> }
    >;

    const result = await tools.get_all_nodes.execute({}, { abortSignal: "signal" });

    expect(JSON.parse(result)).toEqual({ index: 0, input: {} });
    expect(mocks.executorCalls).toEqual([{ index: 0, input: {}, context: { abortSignal: "signal" } }]);
  });

  it("preserves Project Object Reference errors as normal encoded tool output", async () => {
    const tools = AITools.createTools({} as never, {} as never) as unknown as Record<
      string,
      { execute(input: unknown): Promise<string> }
    >;

    const result = await tools.delete_node.execute({ ref: "n1" });

    expect(JSON.parse(result)).toEqual({
      success: false,
      error: { code: "stale_ref", ref: "n1", message: "引用已失效" },
    });
  });
});
