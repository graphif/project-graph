import { describe, expect, it } from "vitest";
import {
  createEmptyMCPSnapshot,
  createMCPDefinitionFingerprint,
  materializeMCPServers,
  parseMCPConfigDocument,
  reconcileMCPDefinitions,
  serializeMCPConfigDocument,
  type AIMCPSnapshot,
  type AIMCPServerDefinition,
} from "./AIMCPConfig";

describe("MCP configuration documents", () => {
  it("normalizes MCP Inspector and VS Code wrappers", () => {
    expect(
      parseMCPConfigDocument(
        JSON.stringify({
          mcpServers: {
            local: { command: "npx", args: ["-y", "server"] },
            docs: { type: "streamable-http", url: "https://example.com/mcp" },
          },
        }),
      ),
    ).toEqual([
      { name: "local", transport: { type: "stdio", command: "npx", args: ["-y", "server"] } },
      { name: "docs", transport: { type: "streamable-http", url: "https://example.com/mcp" } },
    ]);

    expect(
      parseMCPConfigDocument(JSON.stringify({ servers: { docs: { type: "http", url: "https://example.com/mcp" } } })),
    ).toEqual([{ name: "docs", transport: { type: "streamable-http", url: "https://example.com/mcp" } }]);
  });

  it("requires exactly one supported outer wrapper", () => {
    expect(() => parseMCPConfigDocument('{"command":"npx"}')).toThrow(/mcpServers|servers/);
    expect(() => parseMCPConfigDocument('{"mcpServers":{},"servers":{}}')).toThrow(/exactly one/i);
    expect(() => parseMCPConfigDocument('{"mcpServers":{},"inputs":[]}')).toThrow(/inputs/);
  });

  it("rejects conflicting, unsupported, and unsafe transports", () => {
    expect(() =>
      parseMCPConfigDocument(
        JSON.stringify({ mcpServers: { bad: { command: "node", url: "https://example.com/mcp" } } }),
      ),
    ).toThrow(/command.*url/i);
    expect(() =>
      parseMCPConfigDocument(JSON.stringify({ mcpServers: { old: { type: "sse", url: "https://example.com" } } })),
    ).toThrow(/sse.*not supported/i);
    expect(() =>
      parseMCPConfigDocument(
        JSON.stringify({ mcpServers: { secret: { type: "streamable-http", url: "https://user:pass@example.com" } } }),
      ),
    ).toThrow(/credentials/i);
  });

  it("rejects server names that collide after model-facing normalization", () => {
    expect(() =>
      parseMCPConfigDocument(
        JSON.stringify({
          mcpServers: {
            "Read Server": { command: "node", args: ["one.js"] },
            "read-server": { command: "node", args: ["two.js"] },
          },
        }),
      ),
    ).toThrow(/collision/i);
  });

  it("serializes the canonical MCP Inspector wrapper", () => {
    const definitions: AIMCPServerDefinition[] = [
      {
        name: "local",
        transport: { type: "stdio", command: "node", args: ["server.js"], env: { TOKEN: "test" } },
      },
    ];

    expect(JSON.parse(serializeMCPConfigDocument(definitions))).toEqual({
      mcpServers: {
        local: { type: "stdio", command: "node", args: ["server.js"], env: { TOKEN: "test" } },
      },
    });
  });

  it("creates stable fingerprints regardless of environment key order", () => {
    const left: AIMCPServerDefinition = {
      name: "local",
      transport: { type: "stdio", command: "node", args: [], env: { B: "2", A: "1" } },
    };
    const right: AIMCPServerDefinition = {
      name: "local",
      transport: { type: "stdio", command: "node", args: [], env: { A: "1", B: "2" } },
    };
    expect(createMCPDefinitionFingerprint(left)).toBe(createMCPDefinitionFingerprint(right));
  });
});

describe("MCP persisted runtime reconciliation", () => {
  const definition: AIMCPServerDefinition = {
    name: "local",
    transport: { type: "stdio", command: "node", args: ["old.js"] },
  };
  const current: AIMCPSnapshot = {
    version: 2,
    definitions: [definition],
    runtime: {
      local: {
        enabled: true,
        enabledTools: ["read"],
        cachedTools: [
          {
            serverName: "local",
            name: "read",
            modelName: "mcp__local__read",
            inputSchema: { type: "object", properties: {} },
          },
        ],
        trustedDefinitionHash: "trusted",
      },
    },
  };

  it("preserves runtime state for unchanged definitions", () => {
    expect(reconcileMCPDefinitions(current, [definition])).toEqual(current);
  });

  it("resets runtime state after an execution-affecting change", () => {
    const changed = reconcileMCPDefinitions(current, [
      { name: "local", transport: { type: "stdio", command: "node", args: ["new.js"] } },
    ]);
    expect(changed.runtime.local).toEqual({ enabled: false, enabledTools: [], cachedTools: [] });
  });

  it("materializes definitions with runtime defaults", () => {
    const empty = createEmptyMCPSnapshot();
    const next = reconcileMCPDefinitions(empty, [definition]);
    expect(materializeMCPServers(next)).toEqual([{ ...definition, enabled: false, enabledTools: [], cachedTools: [] }]);
  });
});
