import { beforeEach, describe, expect, it, vi } from "vitest";
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
    executorCalls: [] as Array<{ index: number; input: unknown; references: unknown; context: unknown }>,
    loaderCalls: [] as string[],
    rawResult: { kind: "raw-result" },
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
  return {
    loadBuiltInToolExecutor: vi.fn((name: string) => {
      mocks.loaderCalls.push(name);
      const executor = mocks.executors[name];
      if (!executor) throw new Error(`Missing built-in tool executor: ${name}`);
      return executor;
    }),
  };
});

import { createBuiltInToolAgentTools } from "./BuiltInToolAgentAdapter";
import { builtInToolCatalog, invokeBuiltInTool } from "./BuiltInToolRegistry";
import { getBuiltInToolWindowEntries } from "./BuiltInToolWindowAdapter";

mocks.executors = Object.fromEntries(
  builtInToolCatalog.map(({ name }, index) => [
    name,
    vi.fn(async (_project, input, references, context) => {
      mocks.executorCalls.push({ index, input, references, context });
      if (index === 1) throw new mocks.ReferenceError("stale_ref", input.ref, "引用已失效");
      if (index === 0) return mocks.rawResult;
      return { index, input };
    }),
  ]),
);

function createRuntimeHost() {
  const project = {};
  const references = {};
  return {
    project,
    references,
    host: {
      acquireCapabilities: vi.fn(async (capabilities: string[], context: { abortSignal?: AbortSignal }) =>
        Object.fromEntries(
          capabilities.map((capability) => [
            capability,
            capability === "project"
              ? project
              : capability === "references"
                ? references
                : capability === "abort-signal"
                  ? context.abortSignal
                  : true,
          ]),
        ),
      ),
    },
  };
}

describe("Built-in Tool consumer adapters", () => {
  beforeEach(() => {
    mocks.executorCalls.length = 0;
    mocks.loaderCalls.length = 0;
  });

  it("projects the canonical catalog into the unchanged tool-window shape without loading executors", () => {
    const windowEntries = getBuiltInToolWindowEntries();
    expect(windowEntries).toHaveLength(29);
    expect(windowEntries.map(({ name, description, parameters }) => ({ name, description, parameters }))).toEqual(
      builtInToolCatalog.map(({ name, description, inputSchema }) => ({
        name,
        description,
        parameters: inputSchema,
      })),
    );

    const toolSet = createBuiltInToolAgentTools({} as never, {} as never) as Record<string, Record<string, unknown>>;
    expect(Object.keys(toolSet)).toEqual(builtInToolCatalog.map(({ name }) => name));
    expect(toolSet.get_all_nodes).not.toHaveProperty("toModelOutput");
    expect(() => windowEntries.map(({ parameters }) => z.toJSONSchema(parameters))).not.toThrow();
    expect(mocks.executorModuleLoaded).toBe(false);
  });

  it("validates input before loading an executor", async () => {
    const { host } = createRuntimeHost();

    await expect(invokeBuiltInTool("delete_node", { ref: "e1" }, host as never)).rejects.toThrow();

    expect(host.acquireCapabilities).not.toHaveBeenCalled();
    expect(mocks.executorModuleLoaded).toBe(false);
  });

  it("rejects an unknown stable tool name before acquiring host capabilities", async () => {
    const { host } = createRuntimeHost();

    await expect(invokeBuiltInTool("missing_tool", {}, host as never)).rejects.toThrow(
      "Unknown built-in tool: missing_tool",
    );

    expect(host.acquireCapabilities).not.toHaveBeenCalled();
    expect(mocks.executorModuleLoaded).toBe(false);
  });

  it("acquires only the selected tool capabilities and preserves its raw result", async () => {
    const { host } = createRuntimeHost();

    const result = await invokeBuiltInTool("get_all_nodes", {}, host as never);

    expect(host.acquireCapabilities).toHaveBeenCalledOnce();
    expect(host.acquireCapabilities).toHaveBeenCalledWith(builtInToolCatalog[0].capabilities, {});
    expect(result).toBe(mocks.rawResult);
    expect(mocks.loaderCalls).toEqual(["get_all_nodes"]);
    expect(mocks.executorCalls).toEqual([{ index: 0, input: {}, references: expect.any(Object), context: {} }]);
  });

  it("does not provide undeclared Project Object Reference capability to an Agent executor", async () => {
    const references = {};
    const tools = createBuiltInToolAgentTools({} as never, references as never) as unknown as Record<
      string,
      { execute(input: unknown, context?: unknown): Promise<string> }
    >;

    await tools.delete_all_nodes.execute({}, { abortSignal: "undeclared-signal" });

    expect(mocks.executorCalls).toEqual([{ index: 4, input: {}, references: undefined, context: {} }]);
    expect(mocks.loaderCalls).toEqual(["delete_all_nodes"]);
  });

  it("loads and invokes only the selected executor when an AI SDK tool executes", async () => {
    const tools = createBuiltInToolAgentTools({} as never, {} as never) as unknown as Record<
      string,
      { execute(input: unknown, context?: unknown): Promise<string> }
    >;

    const result = await tools.get_all_nodes.execute({}, { abortSignal: "signal" });

    expect(JSON.parse(result)).toEqual(mocks.rawResult);
    expect(mocks.loaderCalls).toEqual(["get_all_nodes"]);
    expect(mocks.executorCalls).toEqual([{ index: 0, input: {}, references: expect.any(Object), context: {} }]);
  });

  it("passes an abort signal only to the executor that declares it", async () => {
    const tools = createBuiltInToolAgentTools({} as never, {} as never) as unknown as Record<
      string,
      { execute(input: unknown, context?: unknown): Promise<string> }
    >;

    await tools.search_and_add_image_node.execute({ query: "diagram" }, { abortSignal: "signal" });

    expect(mocks.loaderCalls).toEqual(["search_and_add_image_node"]);
    expect(mocks.executorCalls).toEqual([
      {
        index: 27,
        input: { query: "diagram" },
        references: expect.any(Object),
        context: { abortSignal: "signal" },
      },
    ]);
  });

  it("preserves Project Object Reference errors as normal encoded tool output", async () => {
    const tools = createBuiltInToolAgentTools({} as never, {} as never) as unknown as Record<
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
