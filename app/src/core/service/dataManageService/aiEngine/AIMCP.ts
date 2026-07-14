import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { LazyStore } from "@tauri-apps/plugin-store";
import type { ToolSet } from "ai";
import md5 from "md5";

export type AIMCPToolDescriptor = {
  serverName: string;
  name: string;
  modelName: string;
  title?: string;
  description?: string;
  inputSchema: unknown;
};

export type AIMCPServerConfig = {
  name: string;
  url: string;
  enabled: boolean;
  enabledTools: string[];
  cachedTools: AIMCPToolDescriptor[];
};

type StoredAIMCPServers = {
  version: 1;
  servers: AIMCPServerConfig[];
};

export type AIMCPClientLike = {
  tools(): Promise<Record<string, any>>;
  listTools?: MCPClient["listTools"];
  close(): Promise<void>;
};

export type AIMCPClientFactory = (config: AIMCPServerConfig) => Promise<AIMCPClientLike>;

export type PreparedMCPTools = {
  tools: ToolSet;
  descriptors: AIMCPToolDescriptor[];
  close(): Promise<void>;
};

const store = new LazyStore("ai-mcp-servers.json");
let initPromise: Promise<void> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

async function getStore(): Promise<LazyStore> {
  initPromise ??= store.init();
  await initPromise;
  return store;
}

function enqueueWrite<T>(operation: (initializedStore: LazyStore) => Promise<T>): Promise<T> {
  const result = writeQueue.then(
    async () => operation(await getStore()),
    async () => operation(await getStore()),
  );
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function normalizeMCPServerName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 24);
  return normalized || "server";
}

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

export function decorateMCPTools(serverName: string, tools: Record<string, any>, enabledTools: string[]): ToolSet {
  const selected = new Set(enabledTools);
  const result: Record<string, any> = {};
  for (const [sourceName, mcpTool] of Object.entries(tools)) {
    if (!selected.has(sourceName)) continue;
    const modelName = createMCPToolName(serverName, sourceName);
    if (result[modelName]) {
      throw new Error(`MCP tool name collision: ${serverName}/${sourceName} maps to ${modelName}`);
    }
    result[modelName] = { ...mcpTool, needsApproval: true };
  }
  return result as ToolSet;
}

function isToolDescriptor(value: unknown): value is AIMCPToolDescriptor {
  if (!value || typeof value !== "object") return false;
  const descriptor = value as Partial<AIMCPToolDescriptor>;
  return (
    typeof descriptor.serverName === "string" &&
    typeof descriptor.name === "string" &&
    descriptor.name.length > 0 &&
    typeof descriptor.modelName === "string" &&
    (descriptor.title === undefined || typeof descriptor.title === "string") &&
    (descriptor.description === undefined || typeof descriptor.description === "string") &&
    (typeof descriptor.inputSchema === "boolean" ||
      (typeof descriptor.inputSchema === "object" &&
        descriptor.inputSchema !== null &&
        !Array.isArray(descriptor.inputSchema)))
  );
}

function validateServerConfig(value: unknown): AIMCPServerConfig {
  if (!value || typeof value !== "object") throw new Error("MCP server configuration must be an object");
  const config = value as Partial<AIMCPServerConfig>;
  if (typeof config.name !== "string" || !config.name.trim()) throw new Error("MCP server name is required");
  const name = normalizeMCPServerName(config.name);
  if (typeof config.url !== "string") throw new Error(`MCP server ${name} URL is required`);
  let url: URL;
  try {
    url = new URL(config.url);
  } catch (error) {
    throw new Error(`MCP server ${name} URL is invalid`, { cause: error });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`MCP server ${name} URL must use HTTP or HTTPS`);
  }
  if (url.username || url.password) throw new Error(`MCP server ${name} URL must not contain credentials`);
  if (typeof config.enabled !== "boolean") throw new Error(`MCP server ${name} enabled state is invalid`);
  if (!Array.isArray(config.enabledTools) || !config.enabledTools.every((tool) => typeof tool === "string")) {
    throw new Error(`MCP server ${name} enabled tool list is invalid`);
  }
  if (!Array.isArray(config.cachedTools) || !config.cachedTools.every(isToolDescriptor)) {
    throw new Error(`MCP server ${name} cached tool list or JSON Schema is invalid`);
  }
  return {
    name,
    url: url.toString(),
    enabled: config.enabled,
    enabledTools: [...new Set(config.enabledTools)],
    cachedTools: config.cachedTools.map((descriptor) => ({
      ...descriptor,
      serverName: name,
      modelName: createMCPToolName(name, descriptor.name),
    })),
  };
}

export function validateMCPServerConfigs(value: unknown): AIMCPServerConfig[] {
  if (!Array.isArray(value)) throw new Error("MCP server configuration must be an array");
  return validateServers({ version: 1, servers: value });
}

function validateServers(value: unknown): AIMCPServerConfig[] {
  if (value === undefined || value === null) return [];
  if (!value || typeof value !== "object") throw new Error("Saved MCP server configuration is invalid");
  const stored = value as Partial<StoredAIMCPServers>;
  if (stored.version !== 1 || !Array.isArray(stored.servers)) {
    throw new Error("Saved MCP server configuration is invalid");
  }
  const servers = stored.servers.map(validateServerConfig);
  const names = new Set<string>();
  for (const server of servers) {
    if (names.has(server.name)) throw new Error(`Duplicate MCP server name: ${server.name}`);
    names.add(server.name);
  }
  return servers;
}

export namespace AIMCPStore {
  export async function load(): Promise<AIMCPServerConfig[]> {
    const initializedStore = await getStore();
    return validateServers(await initializedStore.get<unknown>("servers"));
  }

  export async function save(servers: AIMCPServerConfig[]): Promise<AIMCPServerConfig[]> {
    const validated = validateMCPServerConfigs(servers);
    return enqueueWrite(async (initializedStore) => {
      await initializedStore.set("servers", { version: 1, servers: validated } satisfies StoredAIMCPServers);
      await initializedStore.save();
      return validated;
    });
  }
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

async function createClient(config: AIMCPServerConfig): Promise<AIMCPClientLike> {
  return createMCPClient({
    clientName: "project-graph",
    transport: {
      type: "http",
      url: config.url,
      redirect: "error",
      fetch: tauriFetch as typeof globalThis.fetch,
    },
  });
}

export async function prepareMCPTools(
  configs: AIMCPServerConfig[],
  clientFactory: AIMCPClientFactory = createClient,
): Promise<PreparedMCPTools> {
  const clients: AIMCPClientLike[] = [];
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
      Object.assign(tools, decorateMCPTools(config.name, serverTools, config.enabledTools));
      descriptors.push(...descriptorsFromTools(config.name, serverTools));
    }
    return { tools, descriptors, close };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function discoverMCPTools(
  config: AIMCPServerConfig,
  clientFactory: AIMCPClientFactory = createClient,
): Promise<AIMCPToolDescriptor[]> {
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
