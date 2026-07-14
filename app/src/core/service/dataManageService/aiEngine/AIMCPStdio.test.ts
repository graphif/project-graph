import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIMCPServerConfig } from "./AIMCPConfig";
import { createStdioMCPTools, ensureStdioMCPServer, startStdioMCPServer, stopStdioMCPServer } from "./AIMCPStdio";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const invokeMock = vi.mocked(invoke);

function config(): AIMCPServerConfig & { transport: { type: "stdio"; command: string; args: string[] } } {
  return {
    name: "files",
    transport: { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem"] },
    enabled: true,
    enabledTools: ["read_file"],
    cachedTools: [],
  };
}

describe("AIMCP stdio bridge", () => {
  beforeEach(() => invokeMock.mockReset());

  it("starts a process through Tauri and keeps the raw tool schema", async () => {
    const inputSchema = { type: "object", properties: { path: { type: "string" } } };
    invokeMock.mockResolvedValueOnce([{ name: "read_file", description: "Read a file", inputSchema }]);

    await expect(startStdioMCPServer(config())).resolves.toEqual([
      {
        serverName: "files",
        name: "read_file",
        modelName: "",
        title: undefined,
        description: "Read a file",
        inputSchema,
      },
    ]);
    expect(invokeMock).toHaveBeenCalledWith("mcp_stdio_start", {
      config: {
        serverName: "files",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        cwd: undefined,
        env: {},
      },
    });
  });

  it("creates approval-gated AI SDK tools that invoke the Rust client", async () => {
    invokeMock.mockResolvedValueOnce({ content: [{ type: "text", text: "ok" }] });
    const tools = createStdioMCPTools(
      config(),
      [
        {
          serverName: "files",
          name: "read_file",
          modelName: "mcp__files__read_file",
          description: "Read a file",
          inputSchema: { type: "object", properties: { path: { type: "string" } } },
        },
      ],
      (server, tool) => `mcp__${server}__${tool}`,
    ) as Record<string, any>;

    expect(tools.mcp__files__read_file.needsApproval).toBe(true);
    await expect(tools.mcp__files__read_file.execute({ path: "README.md" })).resolves.toEqual({
      content: [{ type: "text", text: "ok" }],
    });
    expect(invokeMock).toHaveBeenCalledWith("mcp_stdio_call_tool", {
      serverName: "files",
      toolName: "read_file",
      arguments: { path: "README.md" },
    });
  });

  it("can create stdio tools without per-call approval", () => {
    const tools = createStdioMCPTools(
      config(),
      [
        {
          serverName: "files",
          name: "read_file",
          modelName: "mcp__files__read_file",
          inputSchema: { type: "object" },
        },
      ],
      (server, tool) => `mcp__${server}__${tool}`,
      false,
    ) as Record<string, any>;
    expect(tools.mcp__files__read_file.needsApproval).toBe(false);
  });

  it("rejects stdio tool names that collide in the model namespace", () => {
    const descriptors = ["read file", "read_file"].map((name) => ({
      serverName: "files",
      name,
      modelName: "",
      inputSchema: { type: "object" },
    }));
    expect(() =>
      createStdioMCPTools(
        { ...config(), enabledTools: descriptors.map((descriptor) => descriptor.name) },
        descriptors,
        (_server, tool) => `mcp__files__${tool.replace(" ", "_")}`,
      ),
    ).toThrow(/collision/i);
  });

  it("reuses an already running process and restarts a missing process", async () => {
    const tools = [{ name: "read_file", inputSchema: { type: "object" } }];
    invokeMock.mockResolvedValueOnce(tools);
    await ensureStdioMCPServer(config());
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("mcp_stdio_list_tools", { serverName: "files" });

    invokeMock.mockReset();
    invokeMock.mockRejectedValueOnce("MCP stdio server files is not running").mockResolvedValueOnce(tools);
    await ensureStdioMCPServer(config());
    expect(invokeMock).toHaveBeenNthCalledWith(1, "mcp_stdio_list_tools", { serverName: "files" });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "mcp_stdio_start", {
      config: {
        serverName: "files",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        cwd: undefined,
        env: {},
      },
    });
  });

  it("stops a server by its stable JSON key", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await stopStdioMCPServer("files");
    expect(invokeMock).toHaveBeenCalledWith("mcp_stdio_stop", { serverName: "files" });
  });
});
