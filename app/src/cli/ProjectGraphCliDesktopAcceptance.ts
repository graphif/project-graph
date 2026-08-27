import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { Encoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { URI } from "vscode-uri";
import type {
  CliDesktopAcceptanceInvocation,
  CliDesktopAcceptanceManifest,
  CliDesktopAcceptanceState,
} from "./ProjectGraphCliDesktopAcceptanceProtocol";
import { resolveProjectOwnershipArtifactPaths } from "./ProjectGraphAppDataPath";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const ownershipHelperPath = fileURLToPath(
  new URL(
    `../../src-tauri/target/debug/project-graph-ownership-helper${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url,
  ),
);

type InvocationDefinition = Omit<CliDesktopAcceptanceInvocation, "projectPath" | "invocationPath"> & {
  fixture?: "image" | "graph";
};

const invocationDefinitions: readonly InvocationDefinition[] = [
  { category: "project", name: "get_all_nodes", input: {} },
  { category: "project", name: "delete_node", input: { ref: "n1" } },
  { category: "project", name: "delete_nodes", input: { refs: ["n1"] } },
  { category: "selection", name: "delete_selected_nodes", input: {} },
  { category: "project", name: "delete_all_nodes", input: {} },
  { category: "project", name: "edit_text_node", input: { ref: "n1", data: { text: "updated" } } },
  {
    category: "project",
    name: "edit_image_node",
    input: { ref: "n1", data: { isBackground: true } },
    fixture: "image",
  },
  { category: "project", name: "auto_layout_dag", input: { refs: ["n1", "n2"] }, fixture: "graph" },
  { category: "viewport", name: "create_text_node", input: { text: "Created from CLI" } },
  { category: "viewport", name: "generate_node_tree_by_text", input: { text: "Root\n\tChild" } },
  { category: "project", name: "expand_node_tree_from_node", input: { ref: "n1", text: "Child" } },
  { category: "project", name: "search_text_nodes_by_regex", input: { regex: "Source|Target" } },
  { category: "project", name: "get_children", input: { ref: "n1" } },
  { category: "project", name: "get_parents", input: { ref: "n2" } },
  { category: "project", name: "batch_change_color", input: { refs: ["n1"], color: [20, 40, 60, 1] } },
  { category: "project", name: "get_object_details", input: { refs: ["n1"] } },
  { category: "project", name: "check_connections", input: { pairs: [["n1", "n2"]] }, fixture: "graph" },
  { category: "project", name: "create_edges", input: { edges: [{ sourceRef: "n1", targetRef: "n2" }] } },
  { category: "project", name: "change_edge_text", input: { edgeRef: "e1", text: "updated" }, fixture: "graph" },
  { category: "selection", name: "select_objects", input: { refs: ["n1"], clearOthers: true } },
  { category: "selection", name: "get_selected_nodes", input: {} },
  { category: "viewport", name: "get_nodes_in_viewport", input: {} },
  { category: "selection", name: "get_selected_refs", input: {} },
  { category: "project", name: "breadth_expand_node", input: { ref: "n1", texts: ["Breadth child"] } },
  { category: "project", name: "depth_expand_node", input: { ref: "n1", texts: ["Depth child"] } },
  {
    category: "selection",
    name: "sort_selected_nodes_by_y",
    input: { current_order: ["Source", "Target"], desired_order: ["Target", "Source"] },
  },
  {
    category: "selection",
    name: "sort_selected_nodes_by_x",
    input: { current_order: ["Source", "Target"], desired_order: ["Target", "Source"] },
  },
  { category: "viewport", name: "search_and_add_image_node", input: { query: "acceptance image" } },
  {
    category: "project",
    name: "recognize_image",
    input: { ref: "n1", prompt: "Describe this image" },
    fixture: "image",
  },
];

function textNode(uuid: string, text: string, x: number) {
  return {
    _: "TextNode",
    uuid,
    text,
    collisionBox: {
      _: "CollisionBox",
      shapes: [{ _: "Rectangle", location: { _: "Vector", x, y: 20 }, size: { _: "Vector", x: 120, y: 60 } }],
    },
  };
}

async function createProjectFixture(
  directory: string,
  index: number,
  name: string,
  fixture: InvocationDefinition["fixture"],
): Promise<string> {
  const projectPath = join(directory, `${String(index).padStart(2, "0")}-${name}.prg`);
  const attachmentId = `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000001`;
  const imageStage = [
    {
      _: "ImageNode",
      uuid: `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000002`,
      attachmentId,
      scale: 1,
      isBackground: false,
      collisionBox: {
        _: "CollisionBox",
        shapes: [{ _: "Rectangle", location: { _: "Vector", x: 10, y: 20 }, size: { _: "Vector", x: 160, y: 80 } }],
      },
    },
  ];
  const nodes = [
    textNode(`${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000010`, "Source", 10),
    textNode(`${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000011`, "Target", 260),
  ];
  const graphStage = [
    ...nodes,
    {
      _: "LineEdge",
      uuid: `${String(index + 1).padStart(8, "0")}-0000-4000-8000-000000000012`,
      text: "edge",
      associationList: [{ $: "/0" }, { $: "/1" }],
    },
  ];
  const stage = fixture === "image" ? imageStage : fixture === "graph" ? graphStage : nodes;
  const encoder = new Encoder();
  const archive = new Uint8ArrayWriter();
  const writer = new ZipWriter(archive, { level: 0 });
  await writer.add("stage.msgpack", new Uint8ArrayReader(encoder.encode(stage)), { level: 0 });
  await writer.add("tags.msgpack", new Uint8ArrayReader(encoder.encode([])), { level: 0 });
  await writer.add("reference.msgpack", new Uint8ArrayReader(encoder.encode({ sections: {}, files: [] })), {
    level: 0,
  });
  await writer.add("metadata.msgpack", new Uint8ArrayReader(encoder.encode({ version: "2.7.0" })), { level: 0 });
  if (fixture === "image") {
    await writer.add(
      `attachments/${attachmentId}.svg`,
      new Uint8ArrayReader(
        new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16"/></svg>',
        ),
      ),
      { level: 0 },
    );
  }
  await writer.close();
  writeFileSync(projectPath, await archive.getData());
  return projectPath;
}

type ManagedProcess = {
  child: ChildProcess;
  exited: Promise<{ status: number | null; output: string }>;
  output(): string;
};

function startManagedProcess(command: string, args: string[], environment: NodeJS.ProcessEnv): ManagedProcess {
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    detached: true,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: process.platform === "win32",
  });
  let output = "";
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => (output += chunk));
  child.stderr?.on("data", (chunk) => (output += chunk));
  const exited = new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, output }));
  });
  return { child, exited, output: () => output };
}

async function stopManagedProcess(process: ManagedProcess | undefined): Promise<void> {
  if (!process?.child.pid || process.child.exitCode !== null || process.child.signalCode !== null) return;
  if (globalThis.process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(process.child.pid), "/T", "/F"], { stdio: "ignore" });
    await Promise.race([process.exited, delay(3000)]);
    return;
  }
  try {
    globalThis.process.kill(-process.child.pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
  const stopped = await Promise.race([process.exited.then(() => true), delay(3000).then(() => false)]);
  if (stopped) return;
  try {
    globalThis.process.kill(-process.child.pid, "SIGKILL");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
  await process.exited;
}

async function getAvailablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a Vite port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

async function waitForVite(port: number, process: ManagedProcess): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (process.child.exitCode !== null) throw new Error(`Vite exited early:\n${process.output()}`);
    const ready = await fetch(`http://127.0.0.1:${port}/index.html`).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for Vite:\n${process.output()}`);
}

async function waitForState(
  path: string,
  phase: CliDesktopAcceptanceState["phase"],
  tauri: ManagedProcess,
): Promise<CliDesktopAcceptanceState> {
  const deadline = Date.now() + 600_000;
  let lastState: CliDesktopAcceptanceState | undefined;
  while (Date.now() < deadline) {
    if (tauri.child.exitCode !== null || tauri.child.signalCode !== null) {
      throw new Error(`Tauri exited early:\n${tauri.output()}`);
    }
    if (existsSync(path)) {
      try {
        const state = JSON.parse(readFileSync(path, "utf8")) as CliDesktopAcceptanceState;
        lastState = state;
        if (state.phase === "error") throw new Error(state.message);
        if (state.phase === phase) return state;
      } catch (error) {
        if (error instanceof SyntaxError) {
          await delay(25);
          continue;
        }
        throw error;
      }
    }
    await delay(50);
  }
  throw new Error(
    `Timed out waiting for desktop acceptance phase ${phase}; last state: ${JSON.stringify(lastState)}:\n${tauri.output()}`,
  );
}

function runCli(
  referenceStorePath: string,
  ownershipDirectory: string,
  ...args: string[]
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const adapter = process.env.PROJECT_GRAPH_CLI_ACCEPTANCE_ADAPTER;
    const usesWindowsAdapter = adapter !== undefined && process.platform === "win32";
    const command = usesWindowsAdapter ? (process.env.ComSpec ?? "cmd.exe") : (adapter ?? "pnpm");
    const commandArguments = adapter
      ? usesWindowsAdapter
        ? [
            "/d",
            "/s",
            "/c",
            `"${[adapter, ...args].map((argument) => `"${argument.replaceAll('"', '""')}"`).join(" ")}"`,
          ]
        : args
      : ["cli", "--", ...args];
    const child = spawn(command, commandArguments, {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        NO_COLOR: "1",
        PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
        PROJECT_GRAPH_OWNERSHIP_DIRECTORY: ownershipDirectory,
        PROJECT_GRAPH_REFERENCE_STORE_PATH: referenceStorePath,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: usesWindowsAdapter,
      windowsVerbatimArguments: usesWindowsAdapter,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function assertSuccessfulInvocation(
  name: string,
  result: { status: number | null; stdout: string; stderr: string },
): void {
  if (result.status !== 0 || result.stderr !== "") {
    throw new Error(`${name} failed with status ${String(result.status)}:\n${result.stderr}${result.stdout}`);
  }
}

function assertProjectOwned(projectPath: string, ownershipDirectory: string): void {
  if (process.platform === "win32") return;
  const { ownershipLock } = resolveProjectOwnershipArtifactPaths(realpathSync(projectPath), ownershipDirectory);
  const lock = spawnSync("/usr/bin/lockf", ["-k", "-s", "-t", "0", ownershipLock, "/usr/bin/true"]);
  if (lock.status !== 75) throw new Error(`Desktop does not own Project: ${projectPath}`);
}

async function runAcceptance(): Promise<void> {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "project-graph-cli-desktop-acceptance-"));
  const manifestPath = join(temporaryDirectory, "manifest.json");
  const statePath = join(temporaryDirectory, "state.json");
  const completionPath = join(temporaryDirectory, "complete");
  const referenceStorePath = join(temporaryDirectory, "ai-project-references.json");
  const ownershipDirectory = join(temporaryDirectory, "project-ownership");
  const configPath = join(temporaryDirectory, "tauri-acceptance.json");
  let vite: ManagedProcess | undefined;
  let tauri: ManagedProcess | undefined;
  try {
    const invocations: CliDesktopAcceptanceInvocation[] = [];
    for (const [index, definition] of invocationDefinitions.entries()) {
      const projectPath = await createProjectFixture(temporaryDirectory, index, definition.name, definition.fixture);
      let invocationPath = projectPath;
      if (definition.name === "get_all_nodes" && process.platform !== "win32") {
        invocationPath = join(temporaryDirectory, "get-all-nodes-link.prg");
        symlinkSync(projectPath, invocationPath);
      }
      invocations.push({
        name: definition.name,
        category: definition.category,
        input: definition.input,
        projectPath,
        invocationPath,
      });
    }
    const closedReferenceProjectPath = await createProjectFixture(
      temporaryDirectory,
      invocationDefinitions.length,
      "reference-store-concurrency",
      undefined,
    );
    const savedDraftProjectPath = join(temporaryDirectory, "saved-draft.prg");
    const manifest: CliDesktopAcceptanceManifest = {
      invocations,
      unsavedProjectPath: invocations[0].projectPath,
      savedDraftProjectPath,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const port = await getAvailablePort();
    writeFileSync(
      configPath,
      JSON.stringify({
        identifier: "liren.project-graph.cli-desktop-acceptance",
        build: { devUrl: `http://127.0.0.1:${port}` },
        app: {
          windows: [
            {
              label: "main",
              title: "Project Graph CLI Desktop Acceptance",
              url: "/index.html?cli-desktop-acceptance=1",
              width: 1200,
              height: 800,
              x: -10_000,
              y: -10_000,
              decorations: false,
              transparent: true,
              visible: true,
              focus: false,
              skipTaskbar: true,
            },
          ],
        },
      }),
    );
    const environment = {
      ...process.env,
      NO_COLOR: "1",
      PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_MANIFEST_PATH: manifestPath,
      PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_STATE_PATH: statePath,
      PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_COMPLETION_PATH: completionPath,
      PROJECT_GRAPH_REFERENCE_STORE_PATH: referenceStorePath,
      PROJECT_GRAPH_OWNERSHIP_DIRECTORY: ownershipDirectory,
    };
    vite = startManagedProcess(
      process.platform === "win32" ? "pnpm.exe" : "pnpm",
      [
        "--filter",
        "@graphif/project-graph",
        "exec",
        "vite",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      environment,
    );
    await waitForVite(port, vite);
    tauri = startManagedProcess(
      process.platform === "win32" ? "pnpm.exe" : "pnpm",
      ["--filter", "@graphif/project-graph", "exec", "tauri", "dev", "--no-watch", "--config", configPath],
      environment,
    );
    const ready = (await waitForState(statePath, "ready", tauri)) as Extract<
      CliDesktopAcceptanceState,
      { phase: "ready" }
    >;
    if (
      ready.projectCount !== 29 ||
      ready.categories.project !== 19 ||
      ready.categories.selection !== 6 ||
      ready.categories.viewport !== 4
    ) {
      throw new Error(`Unexpected desktop matrix: ${JSON.stringify(ready)}`);
    }
    const [desktopReferenceUpdate, closedReferenceUpdate] = await Promise.all([
      runCli(
        referenceStorePath,
        ownershipDirectory,
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        invocations[0].invocationPath,
        "--input",
        "{}",
      ),
      runCli(
        referenceStorePath,
        ownershipDirectory,
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        closedReferenceProjectPath,
        "--input",
        "{}",
      ),
    ]);
    assertSuccessfulInvocation("desktop reference-store concurrency", desktopReferenceUpdate);
    assertSuccessfulInvocation("closed reference-store concurrency", closedReferenceUpdate);
    const referenceStore = JSON.parse(readFileSync(referenceStorePath, "utf8")) as Record<string, unknown>;
    for (const projectPath of [invocations[0].projectPath, closedReferenceProjectPath]) {
      const key = `project:${URI.file(realpathSync(projectPath)).toString()}:references`;
      if (!(key in referenceStore)) throw new Error(`Concurrent reference-store update was lost: ${key}`);
    }
    const before = new Map(invocations.map(({ projectPath }) => [projectPath, readFileSync(projectPath)]));
    for (const invocation of invocations) assertProjectOwned(invocation.projectPath, ownershipDirectory);
    assertProjectOwned(savedDraftProjectPath, ownershipDirectory);

    const savedDraftResult = await runCli(
      referenceStorePath,
      ownershipDirectory,
      "tool",
      "invoke",
      "get_all_nodes",
      "--project",
      savedDraftProjectPath,
      "--input",
      "{}",
    );
    assertSuccessfulInvocation("saved draft Project", savedDraftResult);
    if (!savedDraftResult.stdout.includes("desktop-saved-draft-sentinel")) {
      throw new Error("CLI did not route the saved draft through its live desktop runtime host");
    }

    for (const invocation of invocations) {
      const discovery = await runCli(
        referenceStorePath,
        ownershipDirectory,
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        invocation.invocationPath,
        "--input",
        "{}",
      );
      assertSuccessfulInvocation(`${invocation.name} discovery`, discovery);
      const result =
        invocation.name === "get_all_nodes"
          ? discovery
          : await runCli(
              referenceStorePath,
              ownershipDirectory,
              "tool",
              "invoke",
              invocation.name,
              "--project",
              invocation.invocationPath,
              "--input",
              JSON.stringify(invocation.input),
            );
      assertSuccessfulInvocation(invocation.name, result);
      if (invocation.name === "get_all_nodes" && !result.stdout.includes("desktop-unsaved-sentinel")) {
        throw new Error("Open Project invocation did not observe the live unsaved node");
      }
      if (invocation.name === "get_selected_refs") {
        const value = JSON.parse(result.stdout) as { refs?: unknown[] };
        if (!value.refs?.length) throw new Error("Selection state was not served by the Open Project");
      }
      if (invocation.name === "get_nodes_in_viewport" && !("nodes" in (JSON.parse(result.stdout) as object))) {
        throw new Error("Viewport state was not served by the Open Project");
      }
      if (invocation.name === "search_and_add_image_node") {
        const value = JSON.parse(result.stdout) as { source?: string };
        if (value.source !== "openverse") throw new Error("Acceptance image adapter was not used");
      }
      if (invocation.name === "recognize_image") {
        const value = JSON.parse(result.stdout) as { success?: boolean; description?: string };
        if (!value.success || value.description !== "desktop acceptance image") {
          throw new Error("Acceptance model adapter was not used");
        }
      }
    }

    for (const invocation of invocations) {
      if (!readFileSync(invocation.projectPath).equals(before.get(invocation.projectPath)!)) {
        throw new Error(`Open invocation saved Project unexpectedly: ${invocation.name}`);
      }
      assertProjectOwned(invocation.projectPath, ownershipDirectory);
    }
    assertProjectOwned(savedDraftProjectPath, ownershipDirectory);
    writeFileSync(completionPath, "complete");
    const verified = (await waitForState(statePath, "verified", tauri)) as Extract<
      CliDesktopAcceptanceState,
      { phase: "verified" }
    >;
    if (
      !verified.activeTabUnchanged ||
      !verified.tabListUnchanged ||
      !verified.domFocusUnchanged ||
      !verified.windowFocusUnchanged
    ) {
      throw new Error(`Desktop context changed: ${JSON.stringify(verified)}`);
    }
    process.stdout.write(
      `${JSON.stringify({ tools: invocations.length, categories: ready.categories, desktopContext: "unchanged" })}\n`,
    );
  } finally {
    await stopManagedProcess(tauri);
    await stopManagedProcess(vite);
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

try {
  await runAcceptance();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
}
