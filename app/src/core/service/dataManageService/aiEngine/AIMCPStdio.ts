import { invoke } from "@tauri-apps/api/core";
import { jsonSchema, type ToolSet } from "ai";
import { z } from "zod/v4";
import type { AIMCPServerConfig, AIMCPToolDescriptor } from "./AIMCPConfig";

export type AIMCPStdioConfig = AIMCPServerConfig & {
  transport: Extract<AIMCPServerConfig["transport"], { type: "stdio" }>;
};

const mcpToolSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  inputSchema: z.union([z.boolean(), z.record(z.string(), z.unknown())]).optional(),
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toStdioCommandConfig(config: AIMCPStdioConfig) {
  return {
    serverName: config.name,
    command: config.transport.command,
    args: config.transport.args,
    cwd: config.transport.cwd,
    env: config.transport.env ?? {},
  };
}

function parseStdioTools(serverName: string, value: unknown): AIMCPToolDescriptor[] {
  const parsed = z.array(mcpToolSchema).safeParse(value);
  if (!parsed.success) {
    throw new Error(`MCP stdio server ${serverName} returned an invalid tool list: ${parsed.error.message}`);
  }
  return parsed.data.map((tool) => ({
    serverName,
    name: tool.name,
    modelName: "",
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema ?? { type: "object", properties: {} },
  }));
}

export async function startStdioMCPServer(config: AIMCPStdioConfig): Promise<AIMCPToolDescriptor[]> {
  try {
    return parseStdioTools(
      config.name,
      await invoke<unknown>("mcp_stdio_start", { config: toStdioCommandConfig(config) }),
    );
  } catch (error) {
    throw new Error(`${config.name}: ${getErrorMessage(error)}`, { cause: error });
  }
}

async function listStdioMCPTools(serverName: string): Promise<AIMCPToolDescriptor[]> {
  return parseStdioTools(serverName, await invoke<unknown>("mcp_stdio_list_tools", { serverName }));
}

export async function ensureStdioMCPServer(config: AIMCPStdioConfig): Promise<AIMCPToolDescriptor[]> {
  try {
    return await listStdioMCPTools(config.name);
  } catch (listError) {
    try {
      return await startStdioMCPServer(config);
    } catch (startError) {
      throw new AggregateError(
        [listError, startError],
        `Unable to connect to MCP stdio server ${config.name}: ${getErrorMessage(startError)}`,
        { cause: startError },
      );
    }
  }
}

export async function stopStdioMCPServer(serverName: string): Promise<void> {
  try {
    await invoke("mcp_stdio_stop", { serverName });
  } catch (error) {
    throw new Error(`${serverName}: ${getErrorMessage(error)}`, { cause: error });
  }
}

export function createStdioMCPTools(
  config: AIMCPStdioConfig,
  descriptors: AIMCPToolDescriptor[],
  createModelToolName: (serverName: string, toolName: string) => string,
  requireApproval = true,
): ToolSet {
  const selected = new Set(config.enabledTools);
  const result: Record<string, any> = {};
  for (const descriptor of descriptors.filter((entry) => selected.has(entry.name))) {
    const modelName = createModelToolName(config.name, descriptor.name);
    if (result[modelName]) {
      throw new Error(`MCP tool name collision: ${config.name}/${descriptor.name} maps to ${modelName}`);
    }
    result[modelName] = {
      description: descriptor.description ?? descriptor.title,
      inputSchema: jsonSchema(descriptor.inputSchema as any),
      needsApproval: requireApproval,
      execute: async (input: unknown) => {
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          throw new Error(`MCP stdio tool ${config.name}/${descriptor.name} arguments must be an object`);
        }
        try {
          return await invoke<unknown>("mcp_stdio_call_tool", {
            serverName: config.name,
            toolName: descriptor.name,
            arguments: input,
          });
        } catch (error) {
          throw new Error(`${config.name}/${descriptor.name}: ${getErrorMessage(error)}`, { cause: error });
        }
      },
    };
  }
  return result as ToolSet;
}
