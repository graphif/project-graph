import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { ToolSet } from "ai";
import md5 from "md5";
import {
  normalizeMCPServerName,
  type AIMCPHttpTransport,
  type AIMCPServerConfig,
  type AIMCPToolDescriptor,
} from "./AIMCPConfig";
import { createStdioMCPTools, ensureStdioMCPServer, startStdioMCPServer, stopStdioMCPServer } from "./AIMCPStdio";

export {
  AIMCPStore,
  materializeMCPServers,
  normalizeMCPServerName,
  parseMCPConfigDocument,
  serializeMCPConfigDocument,
} from "./AIMCPConfig";
export type {
  AIMCPHttpTransport,
  AIMCPServerConfig,
  AIMCPServerDefinition,
  AIMCPServerRuntimeState,
  AIMCPSnapshot,
  AIMCPStdioTransport,
  AIMCPToolDescriptor,
} from "./AIMCPConfig";
export { stopStdioMCPServer } from "./AIMCPStdio";

export type AIMCPClientLike = {
  tools(): Promise<Record<string, any>>;
  listTools?: MCPClient["listTools"];
  close(): Promise<void>;
};

export type AIMCPClientFactory = (config: AIMCPServerConfig) => Promise<AIMCPClientLike>;

export type PrepareMCPToolsOptions = {
  clientFactory?: AIMCPClientFactory;
  requireApproval?: boolean;
};

export type PreparedMCPTools = {
  tools: ToolSet;
  descriptors: AIMCPToolDescriptor[];
  close(): Promise<void>;
};

function normalizeMCPToolName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
  if (!normalized) return "tool";
  if (normalized.length <= 32) return normalized;
  return `${normalized.slice(0, 25)}_${md5(normalized).slice(0, 6)}`;
}

export function createMCPToolName(serverName: string, toolName: string): string {
  return `mcp__${normalizeMCPServerName(serverName)}__${normalizeMCPToolName(toolName)}`;
}

export function decorateMCPTools(
  serverName: string,
  tools: Record<string, any>,
  enabledTools: string[],
  requireApproval = true,
): ToolSet {
  const selected = new Set(enabledTools);
  const result: Record<string, any> = {};
  for (const [sourceName, mcpTool] of Object.entries(tools)) {
    if (!selected.has(sourceName)) continue;
    const modelName = createMCPToolName(serverName, sourceName);
    if (result[modelName]) {
      throw new Error(`MCP tool name collision: ${serverName}/${sourceName} maps to ${modelName}`);
    }
    result[modelName] = { ...mcpTool, needsApproval: requireApproval };
  }
  return result as ToolSet;
}

function descriptorsFromTools(serverName: string, tools: Record<string, any>): AIMCPToolDescriptor[] {
  return Object.entries(tools).map(([name, mcpTool]) => ({
    serverName,
    name,
    modelName: createMCPToolName(serverName, name),
    title: typeof mcpTool.title === "string" ? mcpTool.title : undefined,
    description: typeof mcpTool.description === "string" ? mcpTool.description : undefined,
    inputSchema: mcpTool.inputSchema ?? { type: "object", properties: {} },
  }));
}

function descriptorsFromToolDefinitions(
  serverName: string,
  definitions: Array<{
    name: string;
    title?: string;
    description?: string;
    inputSchema?: unknown;
  }>,
): AIMCPToolDescriptor[] {
  return definitions.map((definition) => ({
    serverName,
    name: definition.name,
    modelName: createMCPToolName(serverName, definition.name),
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema ?? { type: "object", properties: {} },
  }));
}

function asStdioConfig(config: AIMCPServerConfig) {
  if (config.transport.type !== "stdio") throw new Error(`MCP server ${config.name} is not a stdio server`);
  return { ...config, transport: config.transport };
}

function asHttpConfig(config: AIMCPServerConfig): AIMCPServerConfig & { transport: AIMCPHttpTransport } {
  if (config.transport.type !== "streamable-http") throw new Error(`MCP server ${config.name} is not an HTTP server`);
  return { ...config, transport: config.transport };
}

async function createClient(config: AIMCPServerConfig): Promise<AIMCPClientLike> {
  const httpConfig = asHttpConfig(config);
  return createMCPClient({
    clientName: "project-graph",
    transport: {
      type: "http",
      url: httpConfig.transport.url,
      headers: httpConfig.transport.headers,
      redirect: "error",
      fetch: tauriFetch as typeof globalThis.fetch,
    },
  });
}

export async function prepareMCPTools(
  configs: AIMCPServerConfig[],
  options: PrepareMCPToolsOptions = {},
): Promise<PreparedMCPTools> {
  const { clientFactory = createClient, requireApproval = true } = options;
  const clients: AIMCPClientLike[] = [];
  const startedStdioServers: string[] = [];
  const tools: ToolSet = {};
  const descriptors: AIMCPToolDescriptor[] = [];
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await Promise.all(clients.map((client) => client.close()));
  };

  try {
    for (const config of configs.filter((server) => server.enabled)) {
      if (config.transport.type === "stdio") {
        const stdioConfig = asStdioConfig(config);
        const serverDescriptors = (await ensureStdioMCPServer(stdioConfig)).map((descriptor) => ({
          ...descriptor,
          modelName: createMCPToolName(config.name, descriptor.name),
        }));
        startedStdioServers.push(config.name);
        Object.assign(tools, createStdioMCPTools(stdioConfig, serverDescriptors, createMCPToolName, requireApproval));
        descriptors.push(...serverDescriptors);
        continue;
      }

      let client: AIMCPClientLike;
      try {
        client = await clientFactory(config);
      } catch (error) {
        throw new Error(`${config.name}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
      clients.push(client);
      let serverTools: Record<string, any>;
      try {
        serverTools = await client.tools();
      } catch (error) {
        throw new Error(`${config.name}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
      Object.assign(tools, decorateMCPTools(config.name, serverTools, config.enabledTools, requireApproval));
      descriptors.push(...descriptorsFromTools(config.name, serverTools));
    }
    return { tools, descriptors, close };
  } catch (error) {
    const cleanupResults = await Promise.allSettled([
      close(),
      ...startedStdioServers.map((serverName) => stopStdioMCPServer(serverName)),
    ]);
    const cleanupError = cleanupResults.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (cleanupError) {
      throw new AggregateError([error, cleanupError.reason], "MCP startup and cleanup both failed", { cause: error });
    }
    throw error;
  }
}

export async function discoverMCPTools(
  config: AIMCPServerConfig,
  clientFactory: AIMCPClientFactory = createClient,
): Promise<AIMCPToolDescriptor[]> {
  if (config.transport.type === "stdio") {
    const descriptors = (await startStdioMCPServer(asStdioConfig(config))).map((descriptor) => ({
      ...descriptor,
      modelName: createMCPToolName(config.name, descriptor.name),
    }));
    if (!config.enabled) await stopStdioMCPServer(config.name);
    return descriptors;
  }

  const client = await clientFactory(config);
  try {
    if (client.listTools) {
      const result = await client.listTools();
      return descriptorsFromToolDefinitions(config.name, result.tools);
    }
    return descriptorsFromTools(config.name, await client.tools());
  } finally {
    await client.close();
  }
}
