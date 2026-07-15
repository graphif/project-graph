# MCP JSON Configuration and stdio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MCP name-and-URL form with an ecosystem-compatible JSON configuration editor and run trusted local stdio MCP servers through the official Rust `rmcp` SDK.

**Architecture:** Parse `mcpServers` and VS Code `servers` documents into one normalized TypeScript model, persist definitions separately from runtime state in the existing Tauri Store, and keep remote HTTP servers on `@ai-sdk/mcp`. Add a Tauri-managed `rmcp` process manager for stdio servers, expose focused list/call/stop commands, and adapt returned schemas into approval-required AI SDK dynamic tools.

**Tech Stack:** TypeScript, React, Zod 4, AI SDK 6, `@ai-sdk/mcp`, Vitest, Tauri 2, Rust, `rmcp` 2.2, Tokio, LazyStore.

---

## File map

- Create `app/src/core/service/dataManageService/aiEngine/AIMCPConfig.ts`: JSON parsing, canonical serialization, normalized definitions, version 2 Store validation, state reconciliation, and trust fingerprints.
- Create `app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts`: parser, serializer, reconciliation, and validation tests.
- Modify `app/src/core/service/dataManageService/aiEngine/AIMCP.ts`: remote client mapping plus unified HTTP/stdio tool preparation.
- Modify `app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`: HTTP header mapping, stdio tool adaptation, and lifecycle tests.
- Create `app/src/core/service/dataManageService/aiEngine/AIMCPStdio.ts`: typed Tauri command bridge and stdio AI SDK tool construction.
- Create `app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts`: command payload and approval decoration tests.
- Create `app/src-tauri/src/cmd/mcp.rs`: official Rust SDK process manager and Tauri commands.
- Modify `app/src-tauri/src/cmd/mod.rs`: export the MCP command module.
- Modify `app/src-tauri/src/lib.rs`: manage the process state and register commands.
- Modify `app/src-tauri/Cargo.toml` and `app/src-tauri/Cargo.lock`: add `rmcp` and required Tokio features.
- Modify `app/src/sub/AIToolsWindow.tsx`: JSON editor, trust confirmation, transport-specific server cards, and runtime updates.
- Modify `app/src/core/service/dataManageService/aiEngine/AIEngine.tsx`: load the version 2 snapshot and prepare both HTTP and stdio tools.

### Task 1: Parse and normalize ecosystem MCP JSON

**Files:**

- Create: `app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts`
- Create: `app/src/core/service/dataManageService/aiEngine/AIMCPConfig.ts`

- [ ] **Step 1: Write failing parser and serializer tests**

```ts
import { describe, expect, it } from "vitest";
import { parseMCPConfigDocument, serializeMCPConfigDocument, type AIMCPServerDefinition } from "./AIMCPConfig";

describe("MCP configuration documents", () => {
  it("normalizes Inspector and VS Code wrappers", () => {
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
      parseMCPConfigDocument(JSON.stringify({ servers: { docs: { type: "http", url: "https://example.com/mcp" } } }))[0]
        ?.transport.type,
    ).toBe("streamable-http");
  });

  it("requires one supported wrapper and rejects ambiguous definitions", () => {
    expect(() => parseMCPConfigDocument('{"command":"npx"}')).toThrow(/mcpServers|servers/);
    expect(() => parseMCPConfigDocument('{"mcpServers":{},"servers":{}}')).toThrow(/exactly one/i);
    expect(() =>
      parseMCPConfigDocument(
        JSON.stringify({ mcpServers: { bad: { command: "node", url: "https://example.com/mcp" } } }),
      ),
    ).toThrow(/command.*url/i);
  });

  it("emits the canonical Inspector wrapper", () => {
    const definitions: AIMCPServerDefinition[] = [
      { name: "local", transport: { type: "stdio", command: "node", args: ["server.js"] } },
    ];
    expect(JSON.parse(serializeMCPConfigDocument(definitions))).toEqual({
      mcpServers: { local: { type: "stdio", command: "node", args: ["server.js"] } },
    });
  });
});
```

- [ ] **Step 2: Run the parser test and verify it fails because the module does not exist**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts`

Expected: FAIL with an import-resolution error for `./AIMCPConfig`.

- [ ] **Step 3: Implement normalized types and strict parsing with the existing Zod dependency**

```ts
import md5 from "md5";
import { z } from "zod/v4";

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

const stringRecord = z.record(z.string(), z.string());
const sourceServerSchema = z
  .object({
    type: z.enum(["stdio", "http", "streamable-http", "sse"]).optional(),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    cwd: z.string().min(1).optional(),
    env: stringRecord.optional(),
    url: z.string().min(1).optional(),
    headers: stringRecord.optional(),
  })
  .strict();

export function createMCPDefinitionFingerprint(definition: AIMCPServerDefinition): string {
  return md5(JSON.stringify(definition));
}
```

Implement `parseMCPConfigDocument` so it validates exactly one wrapper, sorts entries by their document order, infers omitted transport types, rejects SSE with a precise error, validates HTTP(S) URLs without credentials, rejects stdio-only fields on HTTP entries and HTTP-only fields on stdio entries, and rejects collisions after `normalizeMCPServerName`.

Implement `serializeMCPConfigDocument` with `mcpServers`, explicit `type`, and two-space indentation.

- [ ] **Step 4: Run the parser test and verify it passes**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the parser**

```bash
git add app/src/core/service/dataManageService/aiEngine/AIMCPConfig.ts app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts
git commit -m "feat: parse ecosystem MCP configurations"
```

### Task 2: Separate persisted definitions from runtime state

**Files:**

- Modify: `app/src/core/service/dataManageService/aiEngine/AIMCPConfig.ts`
- Modify: `app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts`
- Modify: `app/src/core/service/dataManageService/aiEngine/AIMCP.ts`

- [ ] **Step 1: Add failing reconciliation tests**

```ts
it("preserves runtime state only while the definition is unchanged", () => {
  const definition = {
    name: "local",
    transport: { type: "stdio" as const, command: "node", args: ["old.js"] },
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

  expect(reconcileMCPDefinitions(current, [definition]).runtime.local.enabled).toBe(true);
  expect(
    reconcileMCPDefinitions(current, [
      { name: "local", transport: { type: "stdio", command: "node", args: ["new.js"] } },
    ]).runtime.local,
  ).toEqual({ enabled: false, enabledTools: [], cachedTools: [] });
});
```

- [ ] **Step 2: Run the test and verify the missing Store model fails**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts`

Expected: FAIL because snapshot and reconciliation functions are not exported.

- [ ] **Step 3: Implement the version 2 snapshot and Store API**

```ts
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

export namespace AIMCPStore {
  export async function load(): Promise<AIMCPSnapshot>;
  export async function saveDefinitions(definitions: AIMCPServerDefinition[]): Promise<AIMCPSnapshot>;
  export async function updateRuntime(
    serverName: string,
    update: (state: AIMCPServerRuntimeState) => AIMCPServerRuntimeState,
  ): Promise<AIMCPSnapshot>;
}
```

Keep `LazyStore("ai-mcp-servers.json")`, the existing initialization guard, and serialized write queue. Store one `{ version: 2, definitions, runtime }` value under the existing `servers` key. Treat missing data as an empty version 2 snapshot and reject version 1 without migration.

Move `AIMCPToolDescriptor` into `AIMCPConfig.ts` so Store validation does not depend on runtime client creation. Export `materializeMCPServers(snapshot)` for runtime and UI consumers.

- [ ] **Step 4: Run configuration and existing MCP tests**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`

Expected: new configuration tests PASS; existing MCP tests may still fail at old type call sites, which Task 5 updates.

- [ ] **Step 5: Commit persisted-state separation**

```bash
git add app/src/core/service/dataManageService/aiEngine/AIMCPConfig.ts app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts app/src/core/service/dataManageService/aiEngine/AIMCP.ts
git commit -m "refactor: separate MCP definitions and runtime state"
```

### Task 3: Add the Rust stdio MCP process manager

**Files:**

- Modify: `app/src-tauri/Cargo.toml`
- Modify: `app/src-tauri/Cargo.lock`
- Create: `app/src-tauri/src/cmd/mcp.rs`
- Modify: `app/src-tauri/src/cmd/mod.rs`
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Add `rmcp` and Tokio process support**

Run from `app/src-tauri`:

```bash
cargo add rmcp@2.2.0 --no-default-features --features client,transport-child-process
```

Change the direct Tokio dependency to:

```toml
tokio = { version = "1", features = ["rt", "rt-multi-thread", "macros", "process", "sync"] }
```

- [ ] **Step 2: Write failing Rust tests for validation and missing clients**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_stdio_definitions_without_a_shell() {
        let config = McpStdioConfig {
            server_name: "filesystem".into(),
            command: "npx".into(),
            args: vec!["-y".into(), "server".into()],
            cwd: None,
            env: HashMap::new(),
        };
        assert_eq!(validate_config(&config).unwrap().command, "npx");
        assert!(validate_config(&McpStdioConfig { command: " ".into(), ..config }).is_err());
    }

    #[tokio::test]
    async fn missing_clients_return_a_visible_error() {
        let manager = McpStdioManager::default();
        let error = manager.list_tools("missing").await.unwrap_err();
        assert!(error.contains("not running"));
    }
}
```

- [ ] **Step 3: Run the Rust test and verify it fails because the module is absent**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml cmd::mcp::tests`

Expected: FAIL because `cmd::mcp` and its types do not exist.

- [ ] **Step 4: Implement the focused `rmcp` manager**

```rust
use rmcp::{
    model::CallToolRequestParams,
    service::{RoleClient, RunningService},
    transport::{ConfigureCommandExt, TokioChildProcess},
    ServiceExt,
};
use serde::Deserialize;
use serde_json::Value;
use std::{collections::HashMap, sync::Arc};
use tokio::{process::Command, sync::Mutex};

type RunningClient = RunningService<RoleClient, ()>;
type SharedClient = Arc<Mutex<RunningClient>>;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStdioConfig {
    pub server_name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Default)]
pub struct McpStdioManager {
    clients: Mutex<HashMap<String, SharedClient>>,
}
```

Implement manager methods that validate non-empty names and commands, build `tokio::process::Command` directly without invoking `cmd /c`, PowerShell, or `/bin/sh`, spawn with `TokioChildProcess`, perform the SDK handshake with `().serve(...)`, replace and gracefully close any previous client with the same name, serialize `list_all_tools()` to JSON, call tools with `CallToolRequestParams::new(tool_name).with_arguments(arguments)`, and close removed clients outside the global map lock.

Expose Tauri commands returning `Result<Value, String>` or `Result<(), String>`:

```rust
#[tauri::command]
pub async fn mcp_stdio_start(
    state: tauri::State<'_, McpStdioManager>,
    config: McpStdioConfig,
) -> Result<Value, String>;

#[tauri::command]
pub async fn mcp_stdio_list_tools(
    state: tauri::State<'_, McpStdioManager>,
    server_name: String,
) -> Result<Value, String>;

#[tauri::command]
pub async fn mcp_stdio_call_tool(
    state: tauri::State<'_, McpStdioManager>,
    server_name: String,
    tool_name: String,
    arguments: Option<serde_json::Map<String, Value>>,
) -> Result<Value, String>;

#[tauri::command]
pub async fn mcp_stdio_stop(
    state: tauri::State<'_, McpStdioManager>,
    server_name: String,
) -> Result<(), String>;
```

Register `McpStdioManager::default()` with `.manage(...)`, export `pub mod mcp`, and add all four commands to `generate_handler!`.

- [ ] **Step 5: Run Rust tests and check the Tauri crate**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml cmd::mcp::tests`

Expected: PASS.

Run: `cargo check --manifest-path app/src-tauri/Cargo.toml`

Expected: PASS.

- [ ] **Step 6: Commit the Rust client**

```bash
git add app/src-tauri/Cargo.toml app/src-tauri/Cargo.lock app/src-tauri/src/cmd/mcp.rs app/src-tauri/src/cmd/mod.rs app/src-tauri/src/lib.rs
git commit -m "feat: run stdio MCP servers with Rust SDK"
```

### Task 4: Adapt Rust stdio tools into AI SDK tools

**Files:**

- Create: `app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts`
- Create: `app/src/core/service/dataManageService/aiEngine/AIMCPStdio.ts`

- [ ] **Step 1: Write a failing stdio bridge test with a fake invoke function**

```ts
import { describe, expect, it, vi } from "vitest";
import { createStdioMCPTools, startStdioMCPServer } from "./AIMCPStdio";

it("starts a normalized command and exposes approval-required tools", async () => {
  const invoke = vi.fn(async (command: string) =>
    command === "mcp_stdio_start"
      ? [{ name: "read", description: "Read", inputSchema: { type: "object", properties: {} } }]
      : { content: [{ type: "text", text: "ok" }] },
  );
  const server: AIMCPServerConfig = {
    name: "local",
    transport: { type: "stdio", command: "node", args: ["server.js"] },
    enabled: true,
    enabledTools: ["read"],
    cachedTools: [],
  };
  const descriptors = await startStdioMCPServer(server, invoke);
  const tools = createStdioMCPTools(server, descriptors, invoke);

  expect(invoke).toHaveBeenCalledWith("mcp_stdio_start", {
    config: { serverName: "local", command: "node", args: ["server.js"], env: {} },
  });
  expect(tools.mcp__local__read.needsApproval).toBe(true);
  await tools.mcp__local__read.execute({}, { toolCallId: "call-1", messages: [] });
  expect(invoke).toHaveBeenLastCalledWith("mcp_stdio_call_tool", {
    serverName: "local",
    toolName: "read",
    arguments: {},
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because the bridge does not exist**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts`

Expected: FAIL with an import-resolution error.

- [ ] **Step 3: Implement the typed Tauri bridge and dynamic tool adapter**

```ts
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { dynamicTool, jsonSchema, type ToolSet } from "ai";

export type AIMCPInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

export async function startStdioMCPServer(
  server: AIMCPServerConfig,
  invoke: AIMCPInvoke = tauriInvoke,
): Promise<AIMCPToolDescriptor[]>;

export function createStdioMCPTools(
  server: AIMCPServerConfig,
  descriptors: AIMCPToolDescriptor[],
  invoke: AIMCPInvoke = tauriInvoke,
): ToolSet;
```

Validate every Rust-returned descriptor before using it. Construct tools only for `enabledTools`, use `jsonSchema(descriptor.inputSchema)`, namespace with `createMCPToolName`, set `needsApproval: true`, and call the focused Rust command in `execute`. Export `stopStdioMCPServer` for disable, delete, and changed-definition cleanup.

- [ ] **Step 4: Run the stdio bridge test and verify it passes**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the stdio adapter**

```bash
git add app/src/core/service/dataManageService/aiEngine/AIMCPStdio.ts app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts
git commit -m "feat: adapt stdio MCP tools for AI SDK"
```

### Task 5: Unify remote and local MCP preparation

**Files:**

- Modify: `app/src/core/service/dataManageService/aiEngine/AIMCP.ts`
- Modify: `app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`
- Modify: `app/src/core/service/dataManageService/aiEngine/AIEngine.tsx`

- [ ] **Step 1: Replace old URL-only fixtures with transport-aware failing tests**

```ts
const remote: AIMCPServerConfig = {
  name: "docs",
  transport: {
    type: "streamable-http",
    url: "https://example.com/mcp",
    headers: { "X-Client": "project-graph" },
  },
  enabled: true,
  enabledTools: ["search"],
  cachedTools: [],
};

const local: AIMCPServerConfig = {
  name: "local",
  transport: { type: "stdio", command: "node", args: ["server.js"] },
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
};
```

Assert that remote factories receive headers, stdio preparation does not create an HTTP client, stdio tools remain approval-required, and HTTP clients still close when later setup fails.

- [ ] **Step 2: Run MCP tests and confirm old URL-only assumptions fail**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`

Expected: FAIL at old `url` configuration fields and missing stdio routing.

- [ ] **Step 3: Route each transport to its official runtime**

Update the remote factory mapping:

```ts
transport: {
  type: "http",
  url: config.transport.url,
  headers: config.transport.headers,
  redirect: "error",
  fetch: tauriFetch as typeof globalThis.fetch,
}
```

Update `prepareMCPTools` so HTTP servers create request-scoped AI SDK clients while stdio servers build tools from cached descriptors and the persistent Rust bridge. Update `discoverMCPTools` so HTTP connects temporarily and stdio calls `startStdioMCPServer`.

In `AIEngine`, load `AIMCPStore.load()`, materialize server configs, and pass them to `prepareMCPTools`. Keep `mcpRuntime.close` responsible only for request-scoped HTTP clients.

- [ ] **Step 4: Run all MCP unit tests**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit unified runtime preparation**

```bash
git add app/src/core/service/dataManageService/aiEngine/AIMCP.ts app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts app/src/core/service/dataManageService/aiEngine/AIEngine.tsx
git commit -m "feat: prepare remote and local MCP tools"
```

### Task 6: Replace the MCP form with JSON-first management

**Files:**

- Modify: `app/src/sub/AIToolsWindow.tsx`

- [ ] **Step 1: Replace URL form state with snapshot and JSON editor state**

```ts
const [snapshot, setSnapshot] = useState<AIMCPSnapshot>(createEmptyMCPState());
const [documentText, setDocumentText] = useState('{\n  "mcpServers": {}\n}');

useEffect(() => {
  void AIMCPStore.load()
    .then((loaded) => {
      setSnapshot(loaded);
      setDocumentText(serializeMCPConfigDocument(loaded.definitions));
    })
    .catch((error) => toast.error(`读取 MCP 配置失败：${getErrorMessage(error)}`));
}, []);
```

Render the existing shadcn `Textarea` with `font-mono`, a visible local-secret warning, and a “校验并保存” button. On save, parse the complete document first, stop removed or changed stdio servers, then call `saveDefinitions`. A parse error leaves Store and cards unchanged.

- [ ] **Step 2: Add local-process trust before stdio discovery**

```ts
const fingerprint = createMCPDefinitionFingerprint(definition);
if (runtime.trustedDefinitionHash !== fingerprint) {
  const approved = await Dialog.confirm(
    "允许运行本地 MCP 服务器？",
    formatStdioTrustDescription(definition.transport),
    { destructive: true },
  );
  if (!approved) return;
}
```

The description includes the executable, quoted arguments, cwd, and environment variable names, but not environment values. After a successful handshake and discovery, persist the fingerprint and cached descriptors. A rejected or failed start does not enable the server.

- [ ] **Step 3: Update server cards and runtime actions**

Display URL for HTTP and command plus arguments for stdio. Keep tool schema folds and per-tool switches. Enabling requires cached tools; disabling or deleting stdio calls `stopStdioMCPServer`. Deleting also rewrites the canonical JSON editor text from the remaining definitions.

Every async action catches the error once at the UI boundary and displays it with toast or dialog; no `console.error` fallback is added.

- [ ] **Step 4: Run TypeScript type checking**

Run: `pnpm --filter @graphif/project-graph type-check`

Expected: PASS, or only pre-existing diagnostics recorded before this change.

- [ ] **Step 5: Commit the management UI**

```bash
git add app/src/sub/AIToolsWindow.tsx
git commit -m "feat: manage MCP servers with JSON configuration"
```

### Task 7: Verify the complete MCP feature

**Files:**

- Test: `app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts`
- Test: `app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts`
- Test: `app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`
- Test: `app/src-tauri/src/cmd/mcp.rs`

- [ ] **Step 1: Run focused frontend tests**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCPConfig.test.ts app/src/core/service/dataManageService/aiEngine/AIMCPStdio.test.ts app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`

Expected: PASS.

- [ ] **Step 2: Run Rust MCP tests and crate checking**

Run: `cargo test --manifest-path app/src-tauri/Cargo.toml cmd::mcp::tests`

Expected: PASS.

Run: `cargo check --manifest-path app/src-tauri/Cargo.toml`

Expected: PASS.

- [ ] **Step 3: Run project-wide checks**

Run: `pnpm --filter @graphif/project-graph type-check`

Expected: PASS or documented pre-existing diagnostics only.

Run: `pnpm test --run`

Expected: PASS or documented pre-existing failures only.

- [ ] **Step 4: Review formatting, secrets, and final diff**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: only intentional MCP implementation files are modified. Confirm tests contain placeholder credentials only and no local MCP environment values or headers were committed.

- [ ] **Step 5: Commit final corrections if verification changed files**

```bash
git add app/src app/src-tauri docs/superpowers/plans/2026-07-14-mcp-json-stdio.md
git commit -m "fix: complete MCP JSON and stdio integration"
```
