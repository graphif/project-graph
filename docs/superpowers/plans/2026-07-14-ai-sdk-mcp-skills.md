# AI SDK MCP, Tool Approval, and Agent Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add remote Streamable HTTP MCP tools with AI SDK approval and session-persistent Agent Skills to Project Graph's existing AI chat.

**Architecture:** Keep `AITools` as the built-in tool source. Add focused MCP and Skills modules, then compose their tools and system context inside `AIEngine` for each chat request. Persist MCP configuration and project-skill trust with `LazyStore`, while activated skill snapshots remain part of the existing chat-session record.

**Tech Stack:** TypeScript, React, AI SDK 6, `@ai-sdk/mcp`, Tauri HTTP/FS/Store plugins, Zod 4, YAML, Vitest.

---

### Task 1: Install MCP dependencies and define MCP configuration behavior

**Files:**

- Modify: `app/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`
- Create: `app/src/core/service/dataManageService/aiEngine/AIMCP.ts`

- [x] **Step 1: Add failing tests for server-name normalization, tool namespacing, filtering, and approval decoration**

```ts
expect(normalizeMCPServerName(" Context 7 ")).toBe("context-7");
expect(createMCPToolName("context-7", "resolve_library")).toBe("mcp__context-7__resolve_library");
expect(decorateMCPTools("context-7", tools, ["resolve_library"])).toMatchObject({
  "mcp__context-7__resolve_library": { needsApproval: true },
});
```

- [x] **Step 2: Run the MCP test and verify it fails because `AIMCP` does not exist**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`

- [x] **Step 3: Install the AI SDK 6-compatible `@ai-sdk/mcp` 1.x line**

Run: `pnpm --filter @graphif/project-graph add @ai-sdk/mcp@^1.0.61`

- [x] **Step 4: Implement configuration validation, `LazyStore("ai-mcp-servers.json")`, tool filtering, stable namespacing, and `needsApproval: true` decoration**

```ts
export type AIMCPServerConfig = {
  name: string;
  url: string;
  enabled: boolean;
  enabledTools: string[];
  cachedTools: AIMCPToolDescriptor[];
};
```

- [x] **Step 5: Run the MCP test and verify it passes**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`

### Task 2: Connect MCP tools to each AI chat request

**Files:**

- Modify: `app/src/core/service/dataManageService/aiEngine/AIMCP.ts`
- Modify: `app/src/core/service/dataManageService/aiEngine/AIEngine.tsx`
- Test: `app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`

- [x] **Step 1: Add a failing lifecycle test that closes every successfully created client when a later connection fails**

```ts
await expect(prepareMCPTools(configs, fakeFactory)).rejects.toThrow("offline");
expect(firstClient.close).toHaveBeenCalledOnce();
```

- [x] **Step 2: Run the test and verify the missing lifecycle behavior fails**

- [x] **Step 3: Implement Streamable HTTP client creation through `createMCPClient`, discover tools with `client.tools()`, and return an idempotent `close()` callback**

```ts
export type PreparedMCPTools = {
  tools: ToolSet;
  descriptors: AIMCPToolDescriptor[];
  close(): Promise<void>;
};
```

- [x] **Step 4: Merge MCP tools into `AIEngine` and close clients on setup failure, stream completion, and abort**

- [x] **Step 5: Run the MCP tests and verify they pass**

### Task 3: Render and submit native AI SDK approval requests

**Files:**

- Create: `app/src/core/service/dataManageService/aiEngine/AIToolUIPart.test.ts`
- Create: `app/src/core/service/dataManageService/aiEngine/AIToolUIPart.ts`
- Modify: `app/src/sub/AIWindow.tsx`

- [x] **Step 1: Add failing tests for static and dynamic tool-part detection and display names**

```ts
expect(isAIToolPart({ type: "tool-delete_node" })).toBe(true);
expect(isAIToolPart({ type: "dynamic-tool", toolName: "mcp__demo__remove" })).toBe(true);
expect(getAIToolPartName({ type: "dynamic-tool", toolName: "mcp__demo__remove" })).toBe("mcp__demo__remove");
```

- [x] **Step 2: Run the test and verify it fails because the helper does not exist**

- [x] **Step 3: Implement the pure tool-part helpers**

- [x] **Step 4: Update `useChat` to expose `addToolApprovalResponse`, configure `lastAssistantMessageIsCompleteWithApprovalResponses`, and pass the approval callback into message rendering**

- [x] **Step 5: Render `approval-requested` with existing shadcn `Button` components and call `addToolApprovalResponse({ id, approved })`**

- [x] **Step 6: Run the helper test and verify it passes**

### Task 4: Discover and activate Agent Skills safely

**Files:**

- Create: `app/src/core/service/dataManageService/aiEngine/AISkills.test.ts`
- Create: `app/src/core/service/dataManageService/aiEngine/AISkills.ts`

- [x] **Step 1: Add failing tests for SKILL.md parsing, project-over-user precedence, invalid frontmatter, resource traversal, and activation deduplication**

```ts
expect(parseSkillMarkdown(validSkill, location).name).toBe("create-setting-item");
expect(mergeSkillCatalogs(userSkills, projectSkills).get("shared")?.scope).toBe("project");
expect(resolveSkillResourcePath(baseDir, "../secret.txt")).toThrow();
```

- [x] **Step 2: Run the Skills test and verify it fails because `AISkills` does not exist**

- [x] **Step 3: Implement YAML frontmatter parsing with the existing `yaml` dependency and deterministic catalog merging**

- [x] **Step 4: Implement user/project `.agents/skills/*/SKILL.md` discovery through Tauri FS, with project skills disabled until trusted**

- [x] **Step 5: Implement `activate_skill` and `read_skill_resource` AI SDK tools with enum-constrained names, 256 KiB UTF-8 limits, and root containment checks**

- [x] **Step 6: Run the Skills test and verify it passes**

### Task 5: Persist activated skill snapshots in each chat session

**Files:**

- Modify: `app/src/core/service/dataManageService/aiEngine/AIChatSessionStore.ts`
- Modify: `app/src/core/service/dataManageService/aiEngine/AIEngine.tsx`
- Create: `app/src/core/service/dataManageService/aiEngine/AISkillSession.test.ts`
- Create: `app/src/core/service/dataManageService/aiEngine/AISkillSession.ts`

- [x] **Step 1: Add a failing test that builds system context from the current catalog and activated snapshots without duplicate bodies**

```ts
expect(buildSkillSystemContext(catalog, [snapshot, snapshot])).toContain("<skill_content");
expect(buildSkillSystemContext(catalog, [snapshot, snapshot]).match(/instructions/g)).toHaveLength(1);
```

- [x] **Step 2: Run the test and verify it fails because session skill context is not implemented**

- [x] **Step 3: Extend stored sessions with validated `activatedSkills` snapshots and add get/activate methods that preserve existing messages and memory**

- [x] **Step 4: Build the system prompt as base instructions, available-skills catalog, active skill snapshots, then compressed session memory**

- [x] **Step 5: Run session and Skills tests and verify they pass**

### Task 6: Add MCP management and dynamic schema display

**Files:**

- Modify: `app/src/sub/AIToolsWindow.tsx`

- [x] **Step 1: Use installed shadcn `Button`, `Input`, `Switch`, `Collapsible`, and `Badge` components to list, add, test, enable, and delete unauthenticated HTTP MCP servers**

- [x] **Step 2: On connection test, discover tools, persist cached descriptors, and let users enable individual tools**

- [x] **Step 3: Extend the AI tools window to group built-in tools, MCP tools, and Skills tools and render raw JSON Schema without assuming Zod**

- [x] **Step 4: Surface all configuration and discovery failures through visible dialogs/toasts rather than console-only handling**

### Task 7: Verify the integrated feature

**Files:**

- Test: `app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts`
- Test: `app/src/core/service/dataManageService/aiEngine/AIToolUIPart.test.ts`
- Test: `app/src/core/service/dataManageService/aiEngine/AISkills.test.ts`
- Test: `app/src/core/service/dataManageService/aiEngine/AISkillSession.test.ts`

- [x] **Step 1: Run all newly added tests**

Run: `pnpm exec vitest run app/src/core/service/dataManageService/aiEngine/AIMCP.test.ts app/src/core/service/dataManageService/aiEngine/AIToolUIPart.test.ts app/src/core/service/dataManageService/aiEngine/AISkills.test.ts app/src/core/service/dataManageService/aiEngine/AISkillSession.test.ts`

- [x] **Step 2: Run the Project Graph type check and distinguish new diagnostics from the recorded baseline diagnostics**

Run: `pnpm --filter @graphif/project-graph type-check`

- [x] **Step 3: Run the complete test suite and compare failures with the recorded three baseline import-resolution failures**

Run: `pnpm test --run`

- [x] **Step 4: Review `git diff --check` and the final diff for unrelated changes and secret leakage**
