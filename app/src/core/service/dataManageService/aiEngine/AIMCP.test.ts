import { describe, expect, it, vi } from "vitest";
import {
  createMCPToolName,
  decorateMCPTools,
  discoverMCPTools,
  normalizeMCPServerName,
  validateMCPServerConfigs,
  type AIMCPClientLike,
  type AIMCPServerConfig,
} from "./AIMCP";

describe("AIMCP tool adaptation", () => {
  it("normalizes server names into stable readable slugs", () => {
    expect(normalizeMCPServerName(" Context 7 ")).toBe("context-7");
    expect(normalizeMCPServerName("中文 服务")).toBe("server");
  });

  it("namespaces selected tools and requires approval", () => {
    const resolveLibrary = { description: "Resolve a library", execute: vi.fn() };
    const readDocs = { description: "Read docs", execute: vi.fn() };

    expect(createMCPToolName("context-7", "resolve_library")).toBe("mcp__context-7__resolve_library");
    expect(
      decorateMCPTools("context-7", { resolve_library: resolveLibrary, read_docs: readDocs }, ["resolve_library"]),
    ).toEqual({
      "mcp__context-7__resolve_library": {
        ...resolveLibrary,
        needsApproval: true,
      },
    });
  });

  it("keeps model-facing tool names within provider limits", () => {
    const name = createMCPToolName("server-".repeat(10), "very_long_tool_name_".repeat(10));
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("rejects two source tool names that normalize to the same model tool name", () => {
    expect(() => decorateMCPTools("demo", { "read file": {}, read_file: {} }, ["read file", "read_file"])).toThrow(
      /collision/i,
    );
  });

  it("rejects empty server names and cached tools without JSON Schema", () => {
    expect(() =>
      validateMCPServerConfigs([
        { name: "", url: "https://example.com/mcp", enabled: false, enabledTools: [], cachedTools: [] },
      ]),
    ).toThrow(/name/i);
    expect(() =>
      validateMCPServerConfigs([
        {
          name: "demo",
          url: "https://example.com/mcp",
          enabled: false,
          enabledTools: [],
          cachedTools: [{ serverName: "demo", name: "search", modelName: "mcp__demo__search" }],
        },
      ]),
    ).toThrow(/schema/i);
  });
});

describe("AIMCP lifecycle", () => {
  it("keeps the server's raw JSON Schema when discovering tools", async () => {
    const inputSchema = {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    };
    const client: AIMCPClientLike = {
      tools: vi.fn(async () => ({})),
      listTools: vi.fn(async () => ({
        tools: [{ name: "search", title: "Search", description: "Search images", inputSchema }],
      })) as any,
      close: vi.fn(async () => undefined),
    };
    const config: AIMCPServerConfig = {
      name: "images",
      url: "https://images.example/mcp",
      enabled: false,
      enabledTools: [],
      cachedTools: [],
    };

    await expect(discoverMCPTools(config, async () => client)).resolves.toEqual([
      {
        serverName: "images",
        name: "search",
        modelName: "mcp__images__search",
        title: "Search",
        description: "Search images",
        inputSchema,
      },
    ]);
  });

  it("closes earlier clients when a later server connection fails", async () => {
    const close = vi.fn(async () => undefined);
    const firstClient: AIMCPClientLike = {
      tools: vi.fn(async () => ({ ping: {} })),
      close,
    };
    const configs: AIMCPServerConfig[] = [
      { name: "first", url: "https://first.example/mcp", enabled: true, enabledTools: ["ping"], cachedTools: [] },
      { name: "second", url: "https://second.example/mcp", enabled: true, enabledTools: ["ping"], cachedTools: [] },
    ];
    const factory = vi
      .fn<() => Promise<AIMCPClientLike>>()
      .mockResolvedValueOnce(firstClient)
      .mockRejectedValueOnce(new Error("offline"));

    const { prepareMCPTools } = await import("./AIMCP");
    await expect(prepareMCPTools(configs, factory)).rejects.toThrow("second: offline");
    expect(close).toHaveBeenCalledOnce();
  });
});
