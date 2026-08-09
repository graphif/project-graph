import { describe, expect, it, vi } from "vitest";

const executorModule = vi.hoisted(() => ({ loaded: false }));

vi.mock("./BuiltInToolExecutors", () => {
  executorModule.loaded = true;
  return { loadBuiltInToolExecutor: () => undefined };
});

import { builtInToolCatalog } from "./BuiltInToolRegistry";

const expectedToolNames = [
  "get_all_nodes",
  "delete_node",
  "delete_nodes",
  "delete_selected_nodes",
  "delete_all_nodes",
  "edit_text_node",
  "edit_image_node",
  "auto_layout_dag",
  "create_text_node",
  "generate_node_tree_by_text",
  "expand_node_tree_from_node",
  "search_text_nodes_by_regex",
  "get_children",
  "get_parents",
  "batch_change_color",
  "get_object_details",
  "check_connections",
  "create_edges",
  "change_edge_text",
  "select_objects",
  "get_selected_nodes",
  "get_nodes_in_viewport",
  "get_selected_refs",
  "breadth_expand_node",
  "depth_expand_node",
  "sort_selected_nodes_by_y",
  "sort_selected_nodes_by_x",
  "search_and_add_image_node",
  "recognize_image",
] as const;

function expectDeepFrozen(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || value instanceof RegExp || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    expectDeepFrozen((value as Record<PropertyKey, unknown>)[key], seen);
  }
}

describe("Built-in Tool Registry catalog", () => {
  it("exposes the closed, ordered set of 29 built-in tools without loading executors", () => {
    expect(builtInToolCatalog.map(({ name }) => name)).toEqual(expectedToolNames);
    expect(new Set(expectedToolNames).size).toBe(expectedToolNames.length);
    expect(executorModule.loaded).toBe(false);
  });

  it("keeps every definition and its metadata immutable and complete", () => {
    expect(Object.isFrozen(builtInToolCatalog)).toBe(true);

    for (const definition of builtInToolCatalog) {
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.effect)).toBe(true);
      expect(Object.isFrozen(definition.capabilities)).toBe(true);
      expect(Object.isFrozen(definition.projectReferences)).toBe(true);
      expectDeepFrozen(definition.inputSchema);
      expect(Object.isFrozen(definition.output)).toBe(true);
      expect(definition.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(definition.description.length).toBeGreaterThan(0);
      expect(definition.inputSchema).toBeDefined();
      expect(definition.output).toEqual({ contract: "existing-handler-result" });
      expect(definition.effect).toEqual({
        project: expect.stringMatching(/^(read|mutate)$/),
        selection: expect.stringMatching(/^(none|read|mutate)$/),
        external: expect.stringMatching(/^(none|network|model)$/),
      });
      expect(definition.risk).toMatch(/^(none|project-mutation|destructive|external-communication)$/);
      expect(definition.capabilities.length).toBeGreaterThan(0);
      expect(definition.projectReferences).toEqual({
        reads: expect.any(Boolean),
        allocates: expect.any(Boolean),
      });
      expect(definition.cancellation).toMatch(/^(none|cooperative)$/);
      expect(definition.transaction).toMatch(/^(none|atomic|rollback-on-error|partial-success|non-transactional)$/);
      expect(definition.persistence).toMatch(/^(none|project|project-references|project-and-references)$/);
      expect(definition.loadExecutor).toBeTypeOf("function");
    }
  });

  it("declares the established live-runtime, destructive, and cancellation boundaries", () => {
    expect(
      builtInToolCatalog
        .filter(({ capabilities }) => capabilities.includes("selection") || capabilities.includes("viewport"))
        .map(({ name }) => name),
    ).toEqual([
      "delete_selected_nodes",
      "create_text_node",
      "generate_node_tree_by_text",
      "select_objects",
      "get_selected_nodes",
      "get_nodes_in_viewport",
      "get_selected_refs",
      "sort_selected_nodes_by_y",
      "sort_selected_nodes_by_x",
      "search_and_add_image_node",
    ]);
    expect(builtInToolCatalog.filter(({ risk }) => risk === "destructive").map(({ name }) => name)).toEqual([
      "delete_node",
      "delete_nodes",
      "delete_selected_nodes",
      "delete_all_nodes",
    ]);
    expect(
      builtInToolCatalog.filter(({ cancellation }) => cancellation === "cooperative").map(({ name }) => name),
    ).toEqual(["search_and_add_image_node"]);
  });
});
