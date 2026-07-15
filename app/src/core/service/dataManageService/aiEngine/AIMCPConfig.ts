import { LazyStore } from "@tauri-apps/plugin-store";
import md5 from "md5";
import { z } from "zod/v4";

export type AIMCPToolDescriptor = {
  serverName: string;
  name: string;
  modelName: string;
  title?: string;
  description?: string;
  inputSchema: unknown;
};

export type AIMCPStdioTransport = {
  type: "stdio";
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
};

export type AIMCPHttpTransport = {
  type: "streamable-http";
  url: string;
  headers?: Record<string, string>;
};

export type AIMCPServerDefinition = {
  name: string;
  transport: AIMCPStdioTransport | AIMCPHttpTransport;
};

export type AIMCPServerRuntimeState = {
  enabled: boolean;
  enabledTools: string[];
  cachedTools: AIMCPToolDescriptor[];
  trustedDefinitionHash?: string;
};

export type AIMCPSnapshot = {
  version: 2;
  definitions: AIMCPServerDefinition[];
  runtime: Record<string, AIMCPServerRuntimeState>;
};

export type AIMCPServerConfig = AIMCPServerDefinition & AIMCPServerRuntimeState;

const stringRecordSchema = z.record(z.string(), z.string());
const sourceServerSchema = z
  .object({
    type: z.enum(["stdio", "http", "streamable-http", "sse"]).optional(),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional(),
    env: stringRecordSchema.optional(),
    url: z.string().optional(),
    headers: stringRecordSchema.optional(),
    note: z.string().optional(),
  })
  .strict();

const jsonSchemaSchema = z.union([z.boolean(), z.record(z.string(), z.unknown())]);
const toolDescriptorSchema = z.object({
  serverName: z.string(),
  name: z.string().min(1),
  modelName: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  inputSchema: jsonSchemaSchema,
});
const runtimeStateSchema = z.object({
  enabled: z.boolean(),
  enabledTools: z.array(z.string()),
  cachedTools: z.array(toolDescriptorSchema),
  trustedDefinitionHash: z.string().optional(),
});
const normalizedDefinitionSchema = z.object({
  name: z.string().min(1),
  transport: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("stdio"),
      command: z.string().min(1),
      args: z.array(z.string()),
      cwd: z.string().min(1).optional(),
      env: stringRecordSchema.optional(),
    }),
    z.object({
      type: z.literal("streamable-http"),
      url: z.string().min(1),
      headers: stringRecordSchema.optional(),
    }),
  ]),
});
const storedSnapshotSchema = z.object({
  version: z.literal(2),
  definitions: z.array(normalizedDefinitionSchema),
  runtime: z.record(z.string(), runtimeStateSchema),
});

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

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "configuration"}: ${issue.message}`)
    .join("; ");
}

function parseJsonObject(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error("MCP configuration is not valid JSON", { cause: error });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("MCP configuration root must be an object containing mcpServers or servers");
  }
  return value as Record<string, unknown>;
}

function normalizeHttpUrl(serverName: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`MCP server ${serverName} URL is invalid`, { cause: error });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`MCP server ${serverName} URL must use HTTP or HTTPS`);
  }
  if (url.username || url.password) {
    throw new Error(`MCP server ${serverName} URL must not contain credentials`);
  }
  return url.toString();
}

function normalizeSourceServer(serverName: string, value: unknown): AIMCPServerDefinition {
  const parsed = sourceServerSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`MCP server ${serverName} is invalid: ${formatZodIssues(parsed.error)}`);
  }
  const source = parsed.data;
  if (source.command !== undefined && source.url !== undefined) {
    throw new Error(`MCP server ${serverName} must not define both command and url`);
  }

  const inferredType =
    source.type ?? (source.command !== undefined ? "stdio" : source.url !== undefined ? "http" : undefined);
  if (!inferredType) throw new Error(`MCP server ${serverName} must define command or url`);
  if (inferredType === "sse") throw new Error(`MCP server ${serverName} uses SSE, which is not supported yet`);

  if (inferredType === "stdio") {
    if (source.url !== undefined || source.headers !== undefined) {
      throw new Error(`MCP stdio server ${serverName} must not define url or headers`);
    }
    const command = source.command?.trim();
    if (!command) throw new Error(`MCP stdio server ${serverName} command is required`);
    const cwd = source.cwd?.trim();
    return {
      name: serverName,
      transport: {
        type: "stdio",
        command,
        args: source.args ?? [],
        ...(cwd ? { cwd } : {}),
        ...(source.env ? { env: source.env } : {}),
      },
    };
  }

  if (
    source.command !== undefined ||
    source.args !== undefined ||
    source.cwd !== undefined ||
    source.env !== undefined
  ) {
    throw new Error(`MCP HTTP server ${serverName} must not define command, args, cwd, or env`);
  }
  if (!source.url?.trim()) throw new Error(`MCP HTTP server ${serverName} URL is required`);
  return {
    name: serverName,
    transport: {
      type: "streamable-http",
      url: normalizeHttpUrl(serverName, source.url.trim()),
      ...(source.headers ? { headers: source.headers } : {}),
    },
  };
}

function assertNoNormalizedNameCollisions(definitions: AIMCPServerDefinition[]): void {
  const names = new Map<string, string>();
  for (const definition of definitions) {
    const normalized = normalizeMCPServerName(definition.name);
    const previous = names.get(normalized);
    if (previous !== undefined) {
      throw new Error(
        `MCP server name collision: ${JSON.stringify(previous)} and ${JSON.stringify(definition.name)} both map to ${normalized}`,
      );
    }
    names.set(normalized, definition.name);
  }
}

export function parseMCPConfigDocument(text: string): AIMCPServerDefinition[] {
  const root = parseJsonObject(text);
  const hasMCPServers = Object.prototype.hasOwnProperty.call(root, "mcpServers");
  const hasServers = Object.prototype.hasOwnProperty.call(root, "servers");
  if (hasMCPServers === hasServers) {
    throw new Error("MCP configuration must contain exactly one of mcpServers or servers");
  }
  const unsupportedTopLevel = Object.keys(root).filter(
    (key) => key !== "mcpServers" && key !== "servers" && key !== "$schema",
  );
  if (unsupportedTopLevel.length > 0) {
    throw new Error(`Unsupported top-level MCP configuration fields: ${unsupportedTopLevel.join(", ")}`);
  }

  const container = root[hasMCPServers ? "mcpServers" : "servers"];
  if (!container || typeof container !== "object" || Array.isArray(container)) {
    throw new Error("MCP server collection must be an object");
  }
  const definitions = Object.entries(container as Record<string, unknown>).map(([name, value]) => {
    if (!name.trim()) throw new Error("MCP server name must not be empty");
    return normalizeSourceServer(name, value);
  });
  assertNoNormalizedNameCollisions(definitions);
  return definitions;
}

function sortedRecord(value: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!value) return undefined;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function definitionToSource(definition: AIMCPServerDefinition): Record<string, unknown> {
  if (definition.transport.type === "stdio") {
    return {
      type: "stdio",
      command: definition.transport.command,
      args: definition.transport.args,
      ...(definition.transport.cwd ? { cwd: definition.transport.cwd } : {}),
      ...(definition.transport.env ? { env: sortedRecord(definition.transport.env) } : {}),
    };
  }
  return {
    type: "streamable-http",
    url: definition.transport.url,
    ...(definition.transport.headers ? { headers: sortedRecord(definition.transport.headers) } : {}),
  };
}

export function serializeMCPConfigDocument(definitions: AIMCPServerDefinition[]): string {
  assertNoNormalizedNameCollisions(definitions);
  return JSON.stringify(
    {
      mcpServers: Object.fromEntries(
        definitions.map((definition) => [definition.name, definitionToSource(definition)]),
      ),
    },
    null,
    2,
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

export function createMCPDefinitionFingerprint(definition: AIMCPServerDefinition): string {
  return md5(JSON.stringify(canonicalize(definition)));
}

function createDefaultRuntimeState(): AIMCPServerRuntimeState {
  return { enabled: false, enabledTools: [], cachedTools: [] };
}

export function createEmptyMCPSnapshot(): AIMCPSnapshot {
  return { version: 2, definitions: [], runtime: {} };
}

function validateNormalizedDefinitions(value: unknown): AIMCPServerDefinition[] {
  const parsed = z.array(normalizedDefinitionSchema).safeParse(value);
  if (!parsed.success) throw new Error(`Saved MCP definitions are invalid: ${formatZodIssues(parsed.error)}`);
  const definitions = parsed.data as AIMCPServerDefinition[];
  for (const definition of definitions) {
    if (definition.transport.type === "streamable-http") {
      definition.transport.url = normalizeHttpUrl(definition.name, definition.transport.url);
    }
  }
  assertNoNormalizedNameCollisions(definitions);
  return definitions;
}

function validateStoredSnapshot(value: unknown): AIMCPSnapshot {
  if (value === undefined || value === null) return createEmptyMCPSnapshot();
  const parsed = storedSnapshotSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Saved MCP configuration is invalid: ${formatZodIssues(parsed.error)}`);
  const definitions = validateNormalizedDefinitions(parsed.data.definitions);
  const runtime = parsed.data.runtime as Record<string, AIMCPServerRuntimeState>;
  return reconcileMCPDefinitions({ version: 2, definitions, runtime }, definitions);
}

export function reconcileMCPDefinitions(
  current: AIMCPSnapshot,
  nextDefinitionsValue: AIMCPServerDefinition[],
): AIMCPSnapshot {
  const nextDefinitions = validateNormalizedDefinitions(nextDefinitionsValue);
  const currentDefinitions = new Map(current.definitions.map((definition) => [definition.name, definition]));
  const runtime = Object.fromEntries(
    nextDefinitions.map((definition) => {
      const previousDefinition = currentDefinitions.get(definition.name);
      const unchanged =
        previousDefinition !== undefined &&
        createMCPDefinitionFingerprint(previousDefinition) === createMCPDefinitionFingerprint(definition);
      return [
        definition.name,
        unchanged ? (current.runtime[definition.name] ?? createDefaultRuntimeState()) : createDefaultRuntimeState(),
      ];
    }),
  );
  return { version: 2, definitions: nextDefinitions, runtime };
}

export function materializeMCPServers(snapshot: AIMCPSnapshot): AIMCPServerConfig[] {
  return snapshot.definitions.map((definition) => ({
    ...definition,
    ...(snapshot.runtime[definition.name] ?? createDefaultRuntimeState()),
  }));
}

async function persistSnapshot(initializedStore: LazyStore, snapshot: AIMCPSnapshot): Promise<AIMCPSnapshot> {
  await initializedStore.set("servers", snapshot);
  await initializedStore.save();
  return snapshot;
}

export namespace AIMCPStore {
  export async function load(): Promise<AIMCPSnapshot> {
    const initializedStore = await getStore();
    return validateStoredSnapshot(await initializedStore.get<unknown>("servers"));
  }

  export async function saveDefinitions(definitions: AIMCPServerDefinition[]): Promise<AIMCPSnapshot> {
    return enqueueWrite(async (initializedStore) => {
      const current = validateStoredSnapshot(await initializedStore.get<unknown>("servers"));
      return persistSnapshot(initializedStore, reconcileMCPDefinitions(current, definitions));
    });
  }

  export async function updateRuntime(
    serverName: string,
    update: (state: AIMCPServerRuntimeState) => AIMCPServerRuntimeState,
  ): Promise<AIMCPSnapshot> {
    return enqueueWrite(async (initializedStore) => {
      const current = validateStoredSnapshot(await initializedStore.get<unknown>("servers"));
      if (!current.definitions.some((definition) => definition.name === serverName)) {
        throw new Error(`MCP server ${serverName} does not exist`);
      }
      const nextRuntime = runtimeStateSchema.safeParse(
        update(current.runtime[serverName] ?? createDefaultRuntimeState()),
      );
      if (!nextRuntime.success) {
        throw new Error(`MCP server ${serverName} runtime state is invalid: ${formatZodIssues(nextRuntime.error)}`);
      }
      return persistSnapshot(initializedStore, {
        ...current,
        runtime: { ...current.runtime, [serverName]: nextRuntime.data as AIMCPServerRuntimeState },
      });
    });
  }
}
