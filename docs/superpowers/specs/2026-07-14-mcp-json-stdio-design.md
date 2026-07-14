# MCP JSON Configuration and stdio Design

## Goal

Replace the bespoke MCP name-and-URL form with a JSON-first configuration editor and add local stdio MCP support through the official Rust MCP SDK. Preserve the existing AI SDK tool approval flow, raw tool schema display, and `LazyStore` persistence outside project `.prg` files.

## Supported configuration formats

Project Graph uses the MCP Inspector-style `mcpServers` document as its display and export format:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:/Projects"]
    },
    "context7": {
      "type": "streamable-http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

The importer also accepts the VS Code `servers` wrapper. A document must contain exactly one of `mcpServers` or `servers`; unwrapped single-server snippets are rejected. For compatibility, a server with `command` and no `type` is inferred as `stdio`, while a server with `url` and no `type` is inferred as `streamable-http`. In VS Code documents, `type: "http"` maps to the internal `streamable-http` transport.

The first implementation supports:

- `stdio`: `command`, optional `args`, `cwd`, and `env`.
- `streamable-http`: `url` and optional string `headers`.

It recognizes `sse` so it can return a precise unsupported-transport error, but it does not save or run SSE definitions until a dedicated runtime is added.

Configurations with both `command` and `url`, unsupported fields that affect execution, invalid URLs, embedded URL credentials, or normalized server-name collisions are rejected atomically. The editor never partially saves a document.

## Normalized frontend model

Imported documents are converted into a host-independent model:

```ts
type AIMCPTransport =
  | {
      type: "stdio";
      command: string;
      args: string[];
      cwd?: string;
      env?: Record<string, string>;
    }
  | {
      type: "streamable-http";
      url: string;
      headers?: Record<string, string>;
    };

type AIMCPServerDefinition = {
  name: string;
  transport: AIMCPTransport;
};

type AIMCPServerRuntimeState = {
  enabled: boolean;
  enabledTools: string[];
  cachedTools: AIMCPToolDescriptor[];
  trustedDefinitionHash?: string;
};
```

The JSON object key is the server identity; no UUID is introduced. The original name is retained for display. The existing readable normalized name is used only for model-facing tool names, and collisions after normalization are rejected.

## Persistence and reconciliation

`LazyStore("ai-mcp-servers.json")` remains the only persistent location. The version 2 payload contains normalized definitions and runtime state separately. MCP configuration is global to the application and is never written into `.prg` files.

Saving JSON replaces the complete definition document. Runtime state is reconciled by server name:

- An unchanged definition retains its enabled state, selected tools, cached schemas, and process trust.
- A new or changed definition is disabled and loses cached tools, selected tools, and process trust.
- A removed definition loses its runtime state and any running stdio process is stopped.

The application is unreleased, so version 1 store data is not migrated.

## Remote HTTP runtime

Remote servers continue to use `@ai-sdk/mcp`. The internal `streamable-http` transport maps to AI SDK `type: "http"`, using the existing Tauri HTTP fetch implementation. Literal headers are passed only to the transport and never included in model prompts, tool descriptions, or error messages.

HTTP clients retain the existing request-scoped lifecycle and are closed on completion, abort, setup failure, or streaming error.

## Local stdio runtime

The Tauri backend uses the official `rmcp` Rust SDK with its child-process transport. It owns an application-level map of running stdio clients keyed by server name and exposes focused commands to the frontend:

- start or replace a trusted stdio server and return its tool descriptors;
- list tools for a running server;
- invoke a named tool with JSON arguments;
- stop one server;
- stop servers that no longer exist in the saved configuration.

The frontend does not receive raw stdin/stdout handles and does not implement MCP JSON-RPC framing. It creates AI SDK dynamic tools from the Rust-returned descriptors. Each dynamic tool has `needsApproval: true`, and its `execute` function invokes the Rust `call_tool` command.

stdio processes are application-scoped so they can be reused across chat sessions. They stop when disabled, deleted, replaced, or when the application exits. An unexpected child exit is surfaced as an offline error; the first version does not automatically restart in a loop.

## Trust and approval

Local process trust and model tool approval are independent:

1. Before starting an untrusted or changed stdio definition, Project Graph shows the exact executable, arguments, working directory, and environment variable names. Environment values are not repeated in the dialog. The server starts only after explicit confirmation.
2. Every model-initiated MCP tool invocation continues to require the existing AI SDK approval response.

The trusted value is a deterministic fingerprint of the normalized stdio definition. Changing any execution-affecting field invalidates trust. Saving configuration never starts a process or performs a network request.

Literal `env` and `headers` values are stored locally in the Tauri Store. The UI warns that these values are stored in the local configuration file. `${input:...}` and OAuth are outside this implementation because they require a separate secure credential-provider design.

## Management UI

The MCP section replaces the name-and-URL form with a monospaced JSON textarea initialized from the canonical `mcpServers` document. “Validate and save” parses and validates the full document without connecting.

Below the editor, the existing server cards remain responsible for connection status, process trust, enabling the server, refreshing tools, selecting individual tools, deleting definitions, and displaying raw JSON Schema. stdio cards show the executable and arguments; HTTP cards show the URL. Newly imported or changed servers are disabled until tools are successfully discovered.

All parse, validation, persistence, spawn, handshake, discovery, tool-call, and shutdown failures are visible through the existing dialog or toast UI. Failures are not silently logged and do not partially update persisted state.

## Testing

TypeScript unit tests cover both wrappers, inference, VS Code transport aliases, invalid and conflicting definitions, normalized-name collisions, deterministic serialization, state reconciliation, dynamic stdio tool construction, approval decoration, and runtime cleanup.

Rust unit tests cover definition validation and command construction without spawning arbitrary real programs. Rust integration behavior is exercised through a test MCP child fixture or the SDK's testable client boundary, including tool discovery, calls, duplicate start replacement, stop, and missing-client errors.

Verification includes focused Vitest tests, Rust tests, TypeScript type checking, the existing test suite, Rust `cargo check`, and `git diff --check`.
