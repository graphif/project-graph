import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer, type Socket } from "node:net";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Encoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { afterEach, describe, expect, it } from "vitest";
import { URI } from "vscode-uri";
import sharp from "sharp";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const ownershipHelperPath = fileURLToPath(
  new URL(
    `../../src-tauri/target/debug/project-graph-ownership-helper${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url,
  ),
);
const cliEntryPath =
  process.env.PROJECT_GRAPH_CLI_TEST_ENTRY ??
  fileURLToPath(new URL("../../../packages/project-graph-cli/src/cli.mjs", import.meta.url));
const expectedCliVersion = process.env.PROJECT_GRAPH_CLI_TEST_VERSION ?? "1.0.0";
const temporaryDirectories: string[] = [];
let referenceStorePath: string | undefined;
const productionEntry = process.env.PROJECT_GRAPH_CLI_TEST_PRODUCTION === "1";

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
  referenceStorePath = undefined;
});

function getReferenceStorePath(): string {
  if (referenceStorePath) return referenceStorePath;
  const directory = mkdtempSync(join(tmpdir(), "project-graph-cli-references-"));
  temporaryDirectories.push(directory);
  referenceStorePath = join(directory, "ai-project-references.json");
  return referenceStorePath;
}

async function createProjectFixture(
  version = "2.7.0",
  stage: unknown[] = [],
  attachment?: { id: string; extension: string; data: Uint8Array },
): Promise<string> {
  const directory = mkdtempSync(join(tmpdir(), "project-graph-cli-"));
  temporaryDirectories.push(directory);
  const projectPath = join(directory, "fixture.prg");
  const encoder = new Encoder();
  const archive = new Uint8ArrayWriter();
  const writer = new ZipWriter(archive, { level: 0 });
  await writer.add("stage.msgpack", new Uint8ArrayReader(encoder.encode(stage)), { level: 0 });
  await writer.add("tags.msgpack", new Uint8ArrayReader(encoder.encode([])), { level: 0 });
  await writer.add("reference.msgpack", new Uint8ArrayReader(encoder.encode({ sections: {}, files: [] })), {
    level: 0,
  });
  await writer.add("metadata.msgpack", new Uint8ArrayReader(encoder.encode({ version })), { level: 0 });
  if (attachment) {
    await writer.add(`attachments/${attachment.id}.${attachment.extension}`, new Uint8ArrayReader(attachment.data), {
      level: 0,
    });
  }
  await writer.close();
  writeFileSync(projectPath, await archive.getData());
  return projectPath;
}

function createFakeOwnershipHelper(source: string): string {
  const directory = mkdtempSync(join(tmpdir(), "project-graph-ownership-helper-fixture-"));
  temporaryDirectories.push(directory);
  const helperPath = join(directory, "project-graph-ownership-helper");
  writeFileSync(helperPath, `#!${process.execPath}\n${source}\n`);
  chmodSync(helperPath, 0o755);
  return helperPath;
}

function createMutationStage(): unknown[] {
  const textNode = (uuid: string, text: string, x: number) => ({
    _: "TextNode",
    uuid,
    text,
    collisionBox: {
      _: "CollisionBox",
      shapes: [
        {
          _: "Rectangle",
          location: { _: "Vector", x, y: 20 },
          size: { _: "Vector", x: 100, y: 50 },
        },
      ],
    },
  });
  return [
    textNode("11111111-1111-4111-8111-111111111111", "Source", 10),
    textNode("22222222-2222-4222-8222-222222222222", "Target", 210),
    {
      _: "ConnectPoint",
      uuid: "33333333-3333-4333-8333-333333333333",
      collisionBox: {
        _: "CollisionBox",
        shapes: [
          {
            _: "Rectangle",
            location: { _: "Vector", x: 410, y: 20 },
            size: { _: "Vector", x: 20, y: 20 },
          },
        ],
      },
    },
  ];
}

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cliEntryPath, "--", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
      PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
      PROJECT_GRAPH_REFERENCE_STORE_PATH: getReferenceStorePath(),
    },
  });
}

function runCliAsyncWithEnvironment(
  environment: Record<string, string>,
  ...args: string[]
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return spawnCliProcess(environment, ...args).result;
}

function spawnCliProcess(environment: Record<string, string>, ...args: string[]) {
  return spawnCapturedProcess(process.execPath, [cliEntryPath, "--", ...args], environment);
}

function spawnCliEntryProcess(environment: Record<string, string>, ...args: string[]) {
  return spawnCapturedProcess(process.execPath, [cliEntryPath, "--", ...args], environment);
}

function spawnCapturedProcess(command: string, args: string[], environment: Record<string, string>) {
  let child: ReturnType<typeof spawn>;
  const result = new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    child = spawn(command, args, {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
        ...environment,
        NO_COLOR: "1",
        PROJECT_GRAPH_REFERENCE_STORE_PATH: getReferenceStorePath(),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout!.setEncoding("utf8");
    child.stderr!.setEncoding("utf8");
    child.stdout!.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr!.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
  return { child: child!, result };
}

function runCliAsync(...args: string[]): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return runCliAsyncWithEnvironment({}, ...args);
}

const openProjectToolMatrix: ReadonlyArray<{
  category: "project" | "selection" | "viewport";
  name: string;
  input: unknown;
}> = [
  { category: "project", name: "get_all_nodes", input: {} },
  { category: "project", name: "delete_node", input: { ref: "n1" } },
  { category: "project", name: "delete_nodes", input: { refs: [] } },
  { category: "selection", name: "delete_selected_nodes", input: {} },
  { category: "project", name: "delete_all_nodes", input: {} },
  { category: "project", name: "edit_text_node", input: { ref: "n1", data: {} } },
  { category: "project", name: "edit_image_node", input: { ref: "n1", data: {} } },
  { category: "project", name: "auto_layout_dag", input: { refs: ["n1", "n2"] } },
  { category: "viewport", name: "create_text_node", input: { text: "Text" } },
  { category: "viewport", name: "generate_node_tree_by_text", input: { text: "Root" } },
  { category: "project", name: "expand_node_tree_from_node", input: { ref: "n1", text: "Child" } },
  { category: "project", name: "search_text_nodes_by_regex", input: { regex: "Text" } },
  { category: "project", name: "get_children", input: { ref: "n1" } },
  { category: "project", name: "get_parents", input: { ref: "n1" } },
  { category: "project", name: "batch_change_color", input: { refs: [], color: [0, 0, 0, 0] } },
  { category: "project", name: "get_object_details", input: { refs: [] } },
  { category: "project", name: "check_connections", input: { pairs: [] } },
  { category: "project", name: "create_edges", input: { edges: [] } },
  { category: "project", name: "change_edge_text", input: { edgeRef: "e1", text: "" } },
  { category: "selection", name: "select_objects", input: { refs: [] } },
  { category: "selection", name: "get_selected_nodes", input: {} },
  { category: "viewport", name: "get_nodes_in_viewport", input: {} },
  { category: "selection", name: "get_selected_refs", input: {} },
  { category: "project", name: "breadth_expand_node", input: { ref: "n1", texts: [] } },
  { category: "project", name: "depth_expand_node", input: { ref: "n1", texts: [] } },
  { category: "selection", name: "sort_selected_nodes_by_y", input: { current_order: [], desired_order: [] } },
  { category: "selection", name: "sort_selected_nodes_by_x", input: { current_order: [], desired_order: [] } },
  { category: "viewport", name: "search_and_add_image_node", input: { query: "Image" } },
  { category: "project", name: "recognize_image", input: { ref: "n1", prompt: "Describe" } },
];

function expectCliError(args: string[], expected: Record<string, unknown>, exitCode = 2): void {
  const result = runCli(...args);
  expect(result).toMatchObject({ status: exitCode, stdout: "" });
  const error = JSON.parse(result.stderr) as Record<string, unknown>;
  expect(error).toEqual(expected);
  expect(result.stderr).toBe(`${JSON.stringify(error)}\n`);
}

async function waitForProjectLock(lockPath: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const probe = spawnSync("/usr/bin/lockf", ["-k", "-s", "-t", "0", lockPath, "/usr/bin/true"]);
    if (probe.status === 75) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for Project lock: ${lockPath}`);
}

async function createOpenProjectHost(projectPath: string, value: unknown, responseDelayMs = 0) {
  const requests: unknown[] = [];
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    socket.setEncoding("utf8");
    let request = "";
    socket.on("data", (chunk) => {
      request += chunk;
      const newline = request.indexOf("\n");
      if (newline === -1) return;
      const { projectPath, toolName, input } = JSON.parse(request.slice(0, newline)) as {
        projectPath: string;
        toolName: string;
        input: unknown;
      };
      requests.push({ projectPath, toolName, input });
      const respond = () => socket.end(`${JSON.stringify({ ok: true, value })}\n`);
      if (responseDelayMs > 0) setTimeout(respond, responseDelayMs);
      else respond();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP Runtime Host address");

  const canonicalPath = realpathSync(projectPath);
  const ownershipLockPath = `${canonicalPath}.project-graph.lock`;
  const connectableRecordPath = `${canonicalPath}.project-graph.connectable`;
  const connectableLockPath = `${connectableRecordPath}.lock`;
  writeFileSync(
    connectableRecordPath,
    JSON.stringify({ kind: "connectable", endpoint: `tcp://127.0.0.1:${address.port}` }),
  );
  const holder = spawn("/usr/bin/lockf", [
    "-k",
    "-s",
    ownershipLockPath,
    "/usr/bin/lockf",
    "-k",
    "-s",
    connectableLockPath,
    "/bin/sleep",
    "90",
  ]);
  await Promise.all([waitForProjectLock(ownershipLockPath), waitForProjectLock(connectableLockPath)]);

  return {
    requests,
    disconnect() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
    close() {
      holder.kill("SIGTERM");
      if (server.listening) server.close();
    },
  };
}

async function createCancellableOpenProjectHost(projectPath: string) {
  let invocationSocket: Socket | undefined;
  let invocationRequestId: string | undefined;
  let usedSingleConnection = false;
  let resolveInvocationReceived: (() => void) | undefined;
  const invocationReceived = new Promise<void>((resolve) => {
    resolveInvocationReceived = resolve;
  });
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    socket.setEncoding("utf8");
    let request = "";
    socket.on("data", (chunk) => {
      request += chunk;
      let newline = request.indexOf("\n");
      while (newline !== -1) {
        const parsed = JSON.parse(request.slice(0, newline)) as {
          requestId?: string;
          cancelRequestId?: string;
        };
        request = request.slice(newline + 1);
        if (parsed.cancelRequestId) {
          usedSingleConnection = socket === invocationSocket;
          if (parsed.cancelRequestId === invocationRequestId) {
            invocationSocket?.end(
              '{"ok":false,"error":{"code":"CANCELLED","message":"Project Graph CLI invocation was cancelled."}}\n',
            );
          }
          if (!usedSingleConnection) socket.end();
        } else {
          invocationSocket = socket;
          invocationRequestId = parsed.requestId;
          resolveInvocationReceived?.();
        }
        newline = request.indexOf("\n");
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP Runtime Host address");

  const canonicalPath = realpathSync(projectPath);
  const ownershipLockPath = `${canonicalPath}.project-graph.lock`;
  const connectableRecordPath = `${canonicalPath}.project-graph.connectable`;
  const connectableLockPath = `${connectableRecordPath}.lock`;
  writeFileSync(
    connectableRecordPath,
    JSON.stringify({ kind: "connectable", endpoint: `tcp://127.0.0.1:${address.port}` }),
  );
  const holder = spawn("/usr/bin/lockf", [
    "-k",
    "-s",
    ownershipLockPath,
    "/usr/bin/lockf",
    "-k",
    "-s",
    connectableLockPath,
    "/bin/sleep",
    "20",
  ]);
  await Promise.all([waitForProjectLock(ownershipLockPath), waitForProjectLock(connectableLockPath)]);

  return {
    invocationReceived,
    get usedSingleConnection() {
      return usedSingleConnection;
    },
    close() {
      holder.kill("SIGTERM");
      invocationSocket?.destroy();
      if (server.listening) server.close();
    },
  };
}

describe("Project Graph CLI process contract", () => {
  it("prints standard help without protocol output noise", () => {
    const result = runCli("--help");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: project-graph <command>");
    expect(result.stdout).toContain("tool list");
    expect(result.stdout).toContain("tool describe <tool>");
    expect(result.stdout).toContain("tool invoke <tool> --project <path> --input <JSON>");
    expect(result.stderr).toBe("");
  });

  it("prints only one semantic-version line", () => {
    const result = runCli("--version");

    expect(result).toMatchObject({ status: 0, stdout: `${expectedCliVersion}\n`, stderr: "" });
  });

  it("lists every current Registry tool as one JSON value", () => {
    const result = runCli("tool", "list");
    const tools = JSON.parse(result.stdout) as Array<Record<string, unknown>>;

    expect(result).toMatchObject({ status: 0, stderr: "" });
    expect(tools).toHaveLength(29);
    expect(tools[0]).toMatchObject({
      name: "get_all_nodes",
      description: expect.any(String),
      inputSchema: expect.objectContaining({ type: "object" }),
    });
    expect(Object.keys(tools[0])).toEqual(["name", "description", "inputSchema"]);
    expect(new Set(tools.map(({ name }) => name)).size).toBe(tools.length);
    expect(result.stdout).toBe(`${JSON.stringify(tools)}\n`);
  });

  it("describes one Registry tool without exposing internal metadata", () => {
    const result = runCli("tool", "describe", "delete_node");
    const definition = JSON.parse(result.stdout) as Record<string, unknown>;

    expect(result).toMatchObject({ status: 0, stderr: "" });
    expect(definition).toMatchObject({
      name: "delete_node",
      description: expect.any(String),
      inputSchema: expect.objectContaining({
        type: "object",
        required: ["ref"],
      }),
    });
    expect(Object.keys(definition)).toEqual(["name", "description", "inputSchema"]);
    expect(result.stdout).toBe(`${JSON.stringify(definition)}\n`);
  });

  it("reports an unknown tool as one stable JSON error", () => {
    expectCliError(["tool", "describe", "missing_tool"], {
      code: "UNKNOWN_TOOL",
      message: "Unknown built-in tool: missing_tool",
    });
  });

  it("rejects invalid commands without incidental output", () => {
    expectCliError(["tool", "list", "--project", "/tmp/example.prg"], {
      code: "INVALID_COMMAND",
      message: "Invalid Project Graph CLI command.",
    });
    expectCliError(["tool", "invoke", "get_all_nodes", "--project", "/tmp/example.prg"], {
      code: "INVALID_COMMAND",
      message: "Invalid Project Graph CLI command.",
    });
  });

  it("resolves the tool before parsing input or touching the Project Path", () => {
    expectCliError(["tool", "invoke", "missing_tool", "--project", "/does/not/exist.prg", "--input", "{"], {
      code: "UNKNOWN_TOOL",
      message: "Unknown built-in tool: missing_tool",
    });
  });

  it("distinguishes invalid JSON from a built-in tool schema mismatch", () => {
    expectCliError(["tool", "invoke", "delete_node", "--project", "/does/not/exist.prg", "--input", "{"], {
      code: "INVALID_JSON",
      message: "The --input value must be valid JSON.",
    });
    expectCliError(["tool", "invoke", "delete_node", "--project", "/does/not/exist.prg", "--input", "{}"], {
      code: "TOOL_INPUT_INVALID",
      message: "Tool input does not match the built-in tool schema: delete_node",
    });
  });

  it("rejects a live-only tool in an acquired closed worker before resolving the Project Path", async () => {
    const result = await runCliAsyncWithEnvironment(
      { PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED: "1" },
      "tool",
      "invoke",
      "get_nodes_in_viewport",
      "--project",
      "/does/not/exist.prg",
      "--input",
      "{}",
    );

    expect(result).toEqual({
      status: 1,
      stdout: "",
      stderr: '{"code":"PROJECT_MUST_BE_OPEN","message":"This tool requires a matching Open Project."}\n',
    });
  });

  it("reports a missing explicit Project Path without opening a Project", () => {
    expectCliError(
      ["tool", "invoke", "get_all_nodes", "--project", "/does/not/exist.prg", "--input", "{}"],
      { code: "PROJECT_NOT_FOUND", message: "Project file was not found." },
      1,
    );
  });

  it.skipIf(productionEntry)("fails closed with a diagnostic error when the ownership helper is missing", async () => {
    const projectPath = await createProjectFixture();
    const missingHelperPath = join(dirname(projectPath), "missing-ownership-helper");

    const result = await spawnCliEntryProcess(
      { PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: missingHelperPath },
      "tool",
      "invoke",
      "get_all_nodes",
      "--project",
      projectPath,
      "--input",
      "{}",
    ).result;

    expect(result).toEqual({
      status: 1,
      stdout: "",
      stderr: '{"code":"OWNERSHIP_HELPER_UNAVAILABLE","message":"Project ownership helper is unavailable."}\n',
    });
  });

  it.skipIf(productionEntry)(
    "fails closed with the same diagnostic when the ownership helper is not executable",
    async () => {
      const projectPath = await createProjectFixture();
      const nonExecutableHelperPath = dirname(projectPath);

      const result = await spawnCliEntryProcess(
        { PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: nonExecutableHelperPath },
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        projectPath,
        "--input",
        "{}",
      ).result;

      expect(result).toEqual({
        status: 1,
        stdout: "",
        stderr: '{"code":"OWNERSHIP_HELPER_UNAVAILABLE","message":"Project ownership helper is unavailable."}\n',
      });
    },
  );

  it.skipIf(productionEntry)("fails closed when the ownership helper returns an invalid response", async () => {
    const projectPath = await createProjectFixture();

    const result = await spawnCliEntryProcess(
      { PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: process.execPath },
      "tool",
      "invoke",
      "get_all_nodes",
      "--project",
      projectPath,
      "--input",
      "{}",
    ).result;

    expect(result).toEqual({
      status: 1,
      stdout: "",
      stderr:
        '{"code":"OWNERSHIP_HELPER_INVALID_RESPONSE","message":"Project ownership helper returned an invalid response."}\n',
    });
  });

  it.skipIf(productionEntry || process.platform === "win32")(
    "accepts the Windows verbatim prefix on an acquired canonical path",
    async () => {
      const projectPath = await createProjectFixture();
      const ownershipHelperPath = createFakeOwnershipHelper(`
const command = process.argv[2];
const response = command === "try-hold-project"
  ? { status: "acquired", canonicalPath: "\\\\\\\\?\\\\" + process.argv[3] }
  : { status: "loaded", snapshot: null };
process.stdout.write(JSON.stringify(response) + "\\n");
if (command === "try-hold-project") {
  process.stdin.resume();
  process.stdin.on("end", () => process.exit(0));
}
`);

      const result = await spawnCliEntryProcess(
        { PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath },
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        projectPath,
        "--input",
        "{}",
      ).result;

      expect(result).toEqual({
        status: 0,
        stdout: '{"objects":[]}\n',
        stderr: "",
      });
    },
  );

  it.skipIf(productionEntry || process.platform === "win32")(
    "fails closed when the ownership helper emits output after its response",
    async () => {
      const projectPath = await createProjectFixture();
      const invalidHelperPath = createFakeOwnershipHelper(`
process.stdout.write(JSON.stringify({ status: "acquired", canonicalPath: process.argv[3] }) + "\\n");
setTimeout(() => process.stdout.write("unexpected\\n"), 10);
process.stdin.resume();
process.stdin.on("end", () => process.exit(0));
`);

      const result = await spawnCliEntryProcess(
        { PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: invalidHelperPath },
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        projectPath,
        "--input",
        "{}",
      ).result;

      expect(result).toEqual({
        status: 1,
        stdout: "",
        stderr:
          '{"code":"OWNERSHIP_HELPER_INVALID_RESPONSE","message":"Project ownership helper returned an invalid response."}\n',
      });
    },
  );

  it.skipIf(productionEntry || process.platform === "win32")(
    "rejects a helper Project error with the wrong exit code",
    async () => {
      const projectPath = await createProjectFixture();
      const invalidHelperPath = createFakeOwnershipHelper(`
process.stdout.write(JSON.stringify({ status: "error", code: "PROJECT_LOAD_FAILED" }) + "\\n");
`);

      const result = await spawnCliEntryProcess(
        { PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: invalidHelperPath },
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        projectPath,
        "--input",
        "{}",
      ).result;

      expect(result).toEqual({
        status: 1,
        stdout: "",
        stderr:
          '{"code":"OWNERSHIP_HELPER_INVALID_RESPONSE","message":"Project ownership helper returned an invalid response."}\n',
      });
    },
  );

  it.skipIf(productionEntry)(
    "uses the ownership helper for the reference store in an acquired closed worker",
    async () => {
      const projectPath = await createProjectFixture();
      const missingHelperPath = join(dirname(projectPath), "missing-reference-store-helper");

      const result = await spawnCliEntryProcess(
        {
          PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED: "1",
          PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: missingHelperPath,
        },
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        projectPath,
        "--input",
        "{}",
      ).result;

      expect(result).toEqual({
        status: 1,
        stdout: "",
        stderr: '{"code":"OWNERSHIP_HELPER_UNAVAILABLE","message":"Project ownership helper is unavailable."}\n',
      });
    },
  );

  it("reports a corrupt Project as a stable load failure", () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-cli-corrupt-"));
    temporaryDirectories.push(directory);
    const projectPath = join(directory, "corrupt.prg");
    writeFileSync(projectPath, "not a Project archive");

    expectCliError(
      ["tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
      { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." },
      1,
    );
  });

  it("frames ownership-sidecar failures as a stable load error", async () => {
    const projectPath = await createProjectFixture();
    const directory = dirname(projectPath);
    chmodSync(directory, 0o555);

    try {
      expectCliError(
        ["tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
        { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." },
        1,
      );
    } finally {
      chmodSync(directory, 0o755);
    }
  });

  it("invokes get_all_nodes against a closed current-schema Project without rewriting it", async () => {
    const projectPath = await createProjectFixture();
    const before = readFileSync(projectPath);

    const result = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");

    expect(result).toMatchObject({ status: 0, stdout: '{"objects":[]}\n', stderr: "" });
    expect(readFileSync(projectPath)).toEqual(before);
  });

  it("reports executor readiness on the benchmark timing channel", async () => {
    const projectPath = await createProjectFixture();
    const executorReadyPath = join(dirname(projectPath), "executor-ready.txt");
    const startedAt = process.hrtime.bigint();
    const result = spawnSync(
      process.execPath,
      [cliEntryPath, "--", "tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          NO_COLOR: "1",
          PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH: executorReadyPath,
          PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
          PROJECT_GRAPH_REFERENCE_STORE_PATH: getReferenceStorePath(),
        },
      },
    );
    const finishedAt = process.hrtime.bigint();
    const executorReadyAt = BigInt(readFileSync(executorReadyPath, "utf8"));

    expect(result).toMatchObject({ status: 0, stdout: '{"objects":[]}\n', stderr: "" });
    expect(executorReadyAt).toBeGreaterThanOrEqual(startedAt);
    expect(executorReadyAt).toBeLessThanOrEqual(finishedAt);
  });

  it("loads current-schema LineEdges in the closed Project Runtime Host", async () => {
    const nodes = [0, 1].map((index) => ({
      _: "TextNode",
      uuid: `33333333-3333-4333-8333-33333333333${index}`,
      text: `Node ${index}`,
      collisionBox: {
        _: "CollisionBox",
        shapes: [
          {
            _: "Rectangle",
            location: { _: "Vector", x: index * 100, y: 0 },
            size: { _: "Vector", x: 80, y: 40 },
          },
        ],
      },
    }));
    const projectPath = await createProjectFixture("2.7.0", [
      ...nodes,
      {
        _: "LineEdge",
        uuid: "44444444-4444-4444-8444-444444444444",
        associationList: [{ $: "/0" }, { $: "/1" }],
      },
    ]);

    const result = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
    const value = JSON.parse(result.stdout) as { objects: Array<Record<string, unknown>> };

    expect(result).toMatchObject({ status: 0, stderr: "" });
    expect(value.objects).toHaveLength(3);
    expect(value.objects[2]).toMatchObject({
      ref: "e1",
      type: "LineEdge",
      sourceRef: "n1",
      targetRef: "n2",
    });
  });

  it("routes another Registry-declared read tool through the Closed Project Runtime Host", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    const before = readFileSync(projectPath);

    const discovered = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
    expect(discovered).toMatchObject({ status: 0, stderr: "" });

    const result = runCli(
      "tool",
      "invoke",
      "get_object_details",
      "--project",
      projectPath,
      "--input",
      '{"refs":["n1"]}',
    );

    expect(result).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toEqual([
      expect.objectContaining({ ref: "n1", type: "TextNode", text: "Source" }),
    ]);
    expect(readFileSync(projectPath)).toEqual(before);
  }, 15_000);

  it.each([
    ["delete_selected_nodes", "{}"],
    ["create_text_node", '{"text":"fixture"}'],
  ])("requires an Open Project for the live-context tool %s", async (toolName, input) => {
    const projectPath = await createProjectFixture();
    const before = readFileSync(projectPath);

    expectCliError(
      ["tool", "invoke", toolName, "--project", projectPath, "--input", input],
      { code: "PROJECT_MUST_BE_OPEN", message: "This tool requires a matching Open Project." },
      1,
    );
    expect(readFileSync(projectPath)).toEqual(before);
  });

  it("composes graph, layout, import, text, connection, deletion, and history services from Registry capabilities", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());

    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });

    const disconnected = runCli(
      "tool",
      "invoke",
      "check_connections",
      "--project",
      projectPath,
      "--input",
      '{"pairs":[["n1","n2"]]}',
    );
    expect(disconnected).toMatchObject({
      status: 0,
      stdout: '[{"fromRef":"n1","toRef":"n2","connected":false}]\n',
      stderr: "",
    });

    const edited = runCli(
      "tool",
      "invoke",
      "edit_text_node",
      "--project",
      projectPath,
      "--input",
      '{"ref":"n1","data":{"text":"Updated source"}}',
    );
    expect(edited).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(edited.stdout)).toMatchObject({ success: true, ref: "n1", text: "Updated source" });

    const breadth = runCli(
      "tool",
      "invoke",
      "breadth_expand_node",
      "--project",
      projectPath,
      "--input",
      '{"ref":"n1","texts":["Breadth child"]}',
    );
    expect(breadth).toMatchObject({ status: 0, stderr: "" });
    const breadthValue = JSON.parse(breadth.stdout) as { results: Array<{ ref: string; success: boolean }> };
    expect(breadthValue.results).toEqual([
      expect.objectContaining({ ref: expect.stringMatching(/^n\d+$/), success: true }),
    ]);

    const childRef = breadthValue.results[0].ref;
    const children = runCli(
      "tool",
      "invoke",
      "get_children",
      "--project",
      projectPath,
      "--input",
      JSON.stringify({ ref: "n1" }),
    );
    expect(children).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(children.stdout)).toContainEqual({ text: "Breadth child", ref: childRef });

    const deleted = runCli(
      "tool",
      "invoke",
      "delete_node",
      "--project",
      projectPath,
      "--input",
      JSON.stringify({ ref: childRef }),
    );
    expect(deleted).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(deleted.stdout)).toMatchObject({ deletedNodeCount: 1, deletedAssociationCount: 1 });

    const edge = runCli(
      "tool",
      "invoke",
      "create_edges",
      "--project",
      projectPath,
      "--input",
      '{"edges":[{"sourceRef":"n1","targetRef":"n2"}]}',
    );
    expect(edge).toMatchObject({ status: 0, stderr: "" });

    const layout = runCli(
      "tool",
      "invoke",
      "auto_layout_dag",
      "--project",
      projectPath,
      "--input",
      '{"refs":["n1","n2"]}',
    );
    expect(layout).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(layout.stdout)).toMatchObject({ success: true, movedCount: 2, internalEdgeCount: 1 });

    const tree = runCli(
      "tool",
      "invoke",
      "expand_node_tree_from_node",
      "--project",
      projectPath,
      "--input",
      '{"ref":"n1","text":"Tree child"}',
    );
    expect(tree).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(tree.stdout)).toEqual({ success: true, nodeCount: 1 });
  }, 45_000);

  it("preserves recognize_image dependency failure as its normal result", async () => {
    const projectPath = await createProjectFixture("2.7.0", [
      {
        _: "ImageNode",
        uuid: "55555555-5555-4555-8555-555555555555",
        attachmentId: "missing-attachment",
        scale: 1,
        isBackground: false,
        collisionBox: {
          _: "CollisionBox",
          shapes: [
            {
              _: "Rectangle",
              location: { _: "Vector", x: 10, y: 20 },
              size: { _: "Vector", x: 100, y: 50 },
            },
          ],
        },
      },
    ]);
    const before = readFileSync(projectPath);
    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });

    const result = runCli(
      "tool",
      "invoke",
      "recognize_image",
      "--project",
      projectPath,
      "--input",
      '{"ref":"n1","prompt":"Describe this image"}',
    );

    expect(result).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toEqual({ success: false, error: "图片数据未找到（附件可能已丢失）" });
    expect(readFileSync(projectPath)).toEqual(before);
  }, 15_000);

  it("uses the saved model credentials and attachment for recognize_image", async () => {
    const attachmentId = "66666666-6666-4666-8666-666666666666";
    const projectPath = await createProjectFixture(
      "2.7.0",
      [
        {
          _: "ImageNode",
          uuid: "55555555-5555-4555-8555-555555555555",
          attachmentId,
          scale: 1,
          isBackground: false,
          collisionBox: {
            _: "CollisionBox",
            shapes: [
              {
                _: "Rectangle",
                location: { _: "Vector", x: 10, y: 20 },
                size: { _: "Vector", x: 100, y: 50 },
              },
            ],
          },
        },
      ],
      {
        id: attachmentId,
        extension: "svg",
        data: new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"><rect width="4000" height="2000"/></svg>',
        ),
      },
    );
    let requestBody = "";
    const modelServer = createHttpServer((request, response) => {
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        requestBody += chunk;
      });
      request.on("end", () => {
        response.writeHead(200, { "Content-Type": "application/json", Connection: "close" });
        response.end(
          JSON.stringify({
            id: "chatcmpl-fixture",
            object: "chat.completion",
            created: 0,
            model: "fixture-model",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "fixture image description" },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      });
    });
    await new Promise<void>((resolve, reject) => {
      modelServer.once("error", reject);
      modelServer.listen(0, "127.0.0.1", () => {
        modelServer.off("error", reject);
        resolve();
      });
    });
    const address = modelServer.address();
    if (!address || typeof address === "string") throw new Error("Expected a model fixture address");

    const settingsHome = mkdtempSync(join(tmpdir(), "project-graph-cli-settings-"));
    temporaryDirectories.push(settingsHome);
    const settingsDirectory = join(settingsHome, "Library", "Application Support", "liren.project-graph");
    mkdirSync(settingsDirectory, { recursive: true });
    writeFileSync(
      join(settingsDirectory, "settings.json"),
      JSON.stringify({
        aiApiBaseUrl: `http://127.0.0.1:${address.port}/v1`,
        aiApiKey: "fixture-api-key",
        aiModel: "fixture-model",
      }),
    );

    try {
      expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
        status: 0,
        stderr: "",
      });
      const result = await runCliAsyncWithEnvironment(
        { HOME: settingsHome, COREPACK_HOME: process.env.COREPACK_HOME ?? join(homedir(), ".cache/node/corepack") },
        "tool",
        "invoke",
        "recognize_image",
        "--project",
        projectPath,
        "--input",
        '{"ref":"n1","prompt":"Describe this image"}',
      );

      expect(result).toMatchObject({ status: 0, stderr: "" });
      expect(JSON.parse(result.stdout)).toEqual({ success: true, description: "fixture image description" });
      expect(requestBody).toContain("Describe this image");
      const encodedImage = requestBody.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1];
      expect(encodedImage).toBeDefined();
      const metadata = await sharp(Buffer.from(encodedImage!, "base64")).metadata();
      expect(metadata).toMatchObject({ format: "png", width: 1920, height: 960 });

      const mutation = runCli(
        "tool",
        "invoke",
        "batch_change_color",
        "--project",
        projectPath,
        "--input",
        '{"refs":["n1"],"color":[1,2,3,1]}',
      );
      expect(mutation).toMatchObject({ status: 0, stderr: "" });
      const reopened = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
      expect(reopened).toMatchObject({ status: 0, stderr: "" });
      expect(JSON.parse(reopened.stdout)).toMatchObject({
        objects: [{ ref: "n1", size: { width: 100, height: 50 } }],
      });
    } finally {
      await new Promise<void>((resolve, reject) => modelServer.close((error) => (error ? reject(error) : resolve())));
    }
  }, 45_000);

  it("rejects newer and implicit legacy formats without rewriting the Project", async () => {
    const newerProjectPath = await createProjectFixture("99.0.0");
    const legacyProjectPath = await createProjectFixture("2.6.0");
    const newerBefore = readFileSync(newerProjectPath);
    const legacyBefore = readFileSync(legacyProjectPath);

    expectCliError(
      ["tool", "invoke", "get_all_nodes", "--project", newerProjectPath, "--input", "{}"],
      {
        code: "PROJECT_VERSION_UNSUPPORTED",
        message: "Project version is newer than this Project Graph runtime.",
      },
      1,
    );
    expectCliError(
      ["tool", "invoke", "get_all_nodes", "--project", legacyProjectPath, "--input", "{}"],
      { code: "PROJECT_UPGRADE_REQUIRED", message: "Project must be upgraded before it can be invoked." },
      1,
    );
    expect(readFileSync(newerProjectPath)).toEqual(newerBefore);
    expect(readFileSync(legacyProjectPath)).toEqual(legacyBefore);
  }, 15_000);

  it("allows a legacy read-only invocation to upgrade only in memory", async () => {
    const projectPath = await createProjectFixture("2.6.0");
    const before = readFileSync(projectPath);

    const result = runCli(
      "tool",
      "invoke",
      "get_all_nodes",
      "--project",
      projectPath,
      "--input",
      "{}",
      "--allow-upgrade",
    );

    expect(result).toMatchObject({ status: 0, stdout: '{"objects":[]}\n', stderr: "" });
    expect(readFileSync(projectPath)).toEqual(before);
  });

  it("restores stable Project Object References across independent CLI processes", async () => {
    const projectPath = await createProjectFixture("2.7.0", [
      {
        _: "TextNode",
        uuid: "11111111-1111-4111-8111-111111111111",
        text: "Persisted node",
        collisionBox: {
          _: "CollisionBox",
          shapes: [
            {
              _: "Rectangle",
              location: { _: "Vector", x: 10, y: 20 },
              size: { _: "Vector", x: 100, y: 50 },
            },
          ],
        },
      },
    ]);

    const first = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
    const second = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");

    expect(first).toMatchObject({ status: 0, stderr: "" });
    expect(second).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(first.stdout)).toEqual(JSON.parse(second.stdout));
    expect(JSON.parse(first.stdout)).toMatchObject({
      objects: [
        {
          ref: "n1",
          type: "TextNode",
          position: { x: 10, y: 20 },
          size: { width: expect.any(Number), height: expect.any(Number) },
          text: "Persisted node",
          color: [0, 0, 0, 0],
        },
      ],
    });
  }, 300_000);

  it("keeps snapshots for two different Projects updated concurrently", async () => {
    const firstProjectPath = await createProjectFixture("2.7.0", createMutationStage().slice(0, 1));
    const secondProjectPath = await createProjectFixture("2.7.0", createMutationStage().slice(1, 2));

    const [first, second] = await Promise.all(
      [firstProjectPath, secondProjectPath].map((projectPath) =>
        runCliAsync("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"),
      ),
    );

    expect(first).toMatchObject({ status: 0, stderr: "" });
    expect(second).toMatchObject({ status: 0, stderr: "" });
    const store = JSON.parse(readFileSync(getReferenceStorePath(), "utf8")) as Record<string, unknown>;
    expect(Object.keys(store)).toEqual(
      expect.arrayContaining(
        [firstProjectPath, secondProjectPath].map(
          (projectPath) => `project:${URI.file(realpathSync(projectPath)).toString()}:references`,
        ),
      ),
    );
  }, 30_000);

  it("fails explicitly when a Project Object Reference snapshot is invalid", async () => {
    const projectPath = await createProjectFixture();
    const key = `project:${URI.file(realpathSync(projectPath)).toString()}:references`;
    writeFileSync(
      getReferenceStorePath(),
      JSON.stringify({
        [key]: {
          version: 1,
          updatedAt: Date.now(),
          references: { entries: [{ ref: "bad", uuid: "node-1" }], nextNodeRef: 1, nextEdgeRef: 1 },
        },
      }),
    );

    expectCliError(
      ["tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
      { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." },
      1,
    );
  });

  it("reports a read-only Project Object Reference save failure", async () => {
    const projectPath = await createProjectFixture("2.7.0", [
      {
        _: "TextNode",
        uuid: "22222222-2222-4222-8222-222222222222",
        text: "Unsaved reference",
        collisionBox: {
          _: "CollisionBox",
          shapes: [
            {
              _: "Rectangle",
              location: { _: "Vector", x: 0, y: 0 },
              size: { _: "Vector", x: 10, y: 10 },
            },
          ],
        },
      },
    ]);
    writeFileSync(getReferenceStorePath(), "{}");
    chmodSync(getReferenceStorePath(), 0o444);

    try {
      expectCliError(
        ["tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
        {
          code: "PROJECT_REFERENCE_SAVE_FAILED",
          message: "Project Object References could not be saved.",
        },
        1,
      );
    } finally {
      chmodSync(getReferenceStorePath(), 0o644);
    }
  }, 15_000);

  it("persists a representative closed Project mutation through the shared executor", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    const before = readFileSync(projectPath);
    const discovered = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");

    expect(discovered).toMatchObject({ status: 0, stderr: "" });

    const mutation = runCli(
      "tool",
      "invoke",
      "create_edges",
      "--project",
      projectPath,
      "--input",
      JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n2", text: "persisted" }] }),
    );

    expect(mutation).toMatchObject({
      status: 0,
      stdout: `${JSON.stringify([{ sourceRef: "n1", targetRef: "n2", success: true, edgeRef: "e1" }])}\n`,
      stderr: "",
    });
    expect(readFileSync(projectPath)).not.toEqual(before);

    const reloaded = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
    const value = JSON.parse(reloaded.stdout) as { objects: Array<Record<string, unknown>> };

    expect(reloaded).toMatchObject({ status: 0, stderr: "" });
    expect(value.objects).toContainEqual(
      expect.objectContaining({ ref: "e1", type: "LineEdge", sourceRef: "n1", targetRef: "n2", text: "persisted" }),
    );
  }, 20_000);

  it("preserves a stale Project Object Reference error after a deleted object is saved", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });
    expect(runCli("tool", "invoke", "delete_node", "--project", projectPath, "--input", '{"ref":"n1"}')).toMatchObject({
      status: 0,
      stderr: "",
    });

    expectCliError(
      [
        "tool",
        "invoke",
        "edit_text_node",
        "--project",
        projectPath,
        "--input",
        '{"ref":"n1","data":{"text":"updated"}}',
      ],
      {
        code: "stale_ref",
        message: "Project Object Reference points to a deleted object.",
        details: { ref: "n1" },
      },
      1,
    );
  }, 20_000);

  it("does not save a normal semantic failure when the Project remains unchanged", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });
    const beforeMutation = readFileSync(projectPath);

    const result = runCli(
      "tool",
      "invoke",
      "create_edges",
      "--project",
      projectPath,
      "--input",
      JSON.stringify({ edges: [{ sourceRef: "n3", targetRef: "n3" }] }),
    );
    const value = JSON.parse(result.stdout) as Array<Record<string, unknown>>;

    expect(result).toMatchObject({ status: 0, stderr: "" });
    expect(value).toEqual([
      {
        sourceRef: "n3",
        targetRef: "n3",
        success: false,
        error: "连线创建失败，未知原因",
      },
    ]);
    expect(readFileSync(projectPath)).toEqual(beforeMutation);
  }, 15_000);

  it("persists a mutating tool's partial result exactly as returned", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });

    const result = runCli(
      "tool",
      "invoke",
      "create_edges",
      "--project",
      projectPath,
      "--input",
      JSON.stringify({
        edges: [
          { sourceRef: "n1", targetRef: "n2", text: "created" },
          { sourceRef: "n3", targetRef: "n3" },
        ],
      }),
    );
    const value = JSON.parse(result.stdout) as Array<Record<string, unknown>>;

    expect(result).toMatchObject({ status: 0, stderr: "" });
    expect(value).toEqual([
      { sourceRef: "n1", targetRef: "n2", success: true, edgeRef: "e1" },
      { sourceRef: "n3", targetRef: "n3", success: false, error: "连线创建失败，未知原因" },
    ]);

    const reloaded = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
    expect(JSON.parse(reloaded.stdout)).toMatchObject({
      objects: expect.arrayContaining([
        expect.objectContaining({ ref: "e1", type: "LineEdge", sourceRef: "n1", targetRef: "n2" }),
      ]),
    });
  }, 20_000);

  it("does not save the Project or new references when the shared executor throws", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });
    const projectBefore = readFileSync(projectPath);
    const referencesBefore = readFileSync(getReferenceStorePath());

    expectCliError(
      [
        "tool",
        "invoke",
        "create_edges",
        "--project",
        projectPath,
        "--input",
        JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n99" }] }),
      ],
      {
        code: "unknown_ref",
        message: "Project Object Reference does not exist.",
        details: { ref: "n99" },
      },
      1,
    );
    expect(readFileSync(projectPath)).toEqual(projectBefore);
    expect(readFileSync(getReferenceStorePath())).toEqual(referencesBefore);
  }, 15_000);

  it("does not save new references when Project.save() fails", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });
    const referencesBefore = readFileSync(getReferenceStorePath());
    chmodSync(projectPath, 0o444);

    try {
      expectCliError(
        [
          "tool",
          "invoke",
          "create_edges",
          "--project",
          projectPath,
          "--input",
          JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n2" }] }),
        ],
        { code: "PROJECT_SAVE_FAILED", message: "Project could not be saved." },
        1,
      );
      expect(readFileSync(getReferenceStorePath())).toEqual(referencesBefore);
    } finally {
      chmodSync(projectPath, 0o644);
    }
  }, 15_000);

  it("reports a saved Project when the following reference snapshot save fails", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    expect(runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}")).toMatchObject({
      status: 0,
      stderr: "",
    });
    const projectBefore = readFileSync(projectPath);
    chmodSync(getReferenceStorePath(), 0o444);

    try {
      expectCliError(
        [
          "tool",
          "invoke",
          "create_edges",
          "--project",
          projectPath,
          "--input",
          JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n2" }] }),
        ],
        {
          code: "PROJECT_REFERENCE_SAVE_FAILED",
          message: "Project Object References could not be saved.",
          details: { projectSaved: true },
        },
        1,
      );
      expect(readFileSync(projectPath)).not.toEqual(projectBefore);
    } finally {
      chmodSync(getReferenceStorePath(), 0o644);
    }

    const reloaded = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
    expect(JSON.parse(reloaded.stdout)).toMatchObject({
      objects: expect.arrayContaining([
        expect.objectContaining({ type: "LineEdge", sourceRef: "n1", targetRef: "n2" }),
      ]),
    });
  }, 20_000);

  it("upgrades a legacy Project only when a closed mutation explicitly allows it", async () => {
    const projectPath = await createProjectFixture("2.6.0", createMutationStage());
    expect(
      runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}", "--allow-upgrade"),
    ).toMatchObject({ status: 0, stderr: "" });
    const before = readFileSync(projectPath);

    expectCliError(
      [
        "tool",
        "invoke",
        "create_edges",
        "--project",
        projectPath,
        "--input",
        JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n2" }] }),
      ],
      { code: "PROJECT_UPGRADE_REQUIRED", message: "Project must be upgraded before it can be invoked." },
      1,
    );
    expect(readFileSync(projectPath)).toEqual(before);

    const mutation = runCli(
      "tool",
      "invoke",
      "create_edges",
      "--project",
      projectPath,
      "--input",
      JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n2" }] }),
      "--allow-upgrade",
    );
    expect(mutation).toMatchObject({ status: 0, stderr: "" });

    const currentFormatReload = runCli("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}");
    expect(currentFormatReload).toMatchObject({ status: 0, stderr: "" });
    expect(JSON.parse(currentFormatReload.stdout)).toMatchObject({
      objects: expect.arrayContaining([expect.objectContaining({ type: "LineEdge" })]),
    });
  }, 25_000);

  it("rejects a closed mutation against a newer Project even when upgrade is allowed", async () => {
    const projectPath = await createProjectFixture("99.0.0", createMutationStage());
    const before = readFileSync(projectPath);

    expectCliError(
      [
        "tool",
        "invoke",
        "create_edges",
        "--project",
        projectPath,
        "--input",
        JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n2" }] }),
        "--allow-upgrade",
      ],
      { code: "PROJECT_VERSION_UNSUPPORTED", message: "Project version is newer than this Project Graph runtime." },
      1,
    );
    expect(readFileSync(projectPath)).toEqual(before);
  }, 15_000);

  it("returns PROJECT_BUSY instead of reading a Project held by an unconnectable owner", async () => {
    const projectPath = await createProjectFixture();
    const lockPath = `${realpathSync(projectPath)}.project-graph.lock`;
    const holder = spawn("/usr/bin/lockf", ["-k", lockPath, "/bin/sleep", "8"]);
    const deadline = Date.now() + 1000;
    while (!existsSync(lockPath) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      expectCliError(
        ["tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
        { code: "PROJECT_BUSY", message: "Project is already owned by another runtime." },
        1,
      );
    } finally {
      holder.kill("SIGTERM");
    }
  }, 15_000);

  it("attaches an equivalent Project Path to the live Open Project without reading the persisted fallback", async () => {
    const projectPath = await createProjectFixture();
    const symlinkPath = join(dirname(projectPath), "fixture-link.prg");
    symlinkSync(projectPath, symlinkPath);
    const before = readFileSync(projectPath);
    const liveResult = {
      objects: [
        {
          ref: "n1",
          type: "TextNode",
          position: { x: 10, y: 20 },
          size: { width: 100, height: 75 },
          text: "Unsaved live node",
          color: [0, 0, 0, 0],
        },
      ],
    };
    const host = await createOpenProjectHost(projectPath, liveResult);

    try {
      const result = await runCliAsync("tool", "invoke", "get_all_nodes", "--project", symlinkPath, "--input", "{}");

      expect(result).toMatchObject({ status: 0, stdout: `${JSON.stringify(liveResult)}\n`, stderr: "" });
      expect(host.requests).toEqual([
        {
          projectPath: realpathSync(projectPath),
          toolName: "get_all_nodes",
          input: {},
        },
      ]);
      expect(readFileSync(projectPath)).toEqual(before);
    } finally {
      host.close();
    }
  }, 15_000);

  it("routes the complete 19/6/4 built-in tool matrix to the matching Open Project", async () => {
    const projectPath = await createProjectFixture();
    const before = readFileSync(projectPath);
    const host = await createOpenProjectHost(projectPath, { routed: true });

    try {
      const results = await Promise.all(
        openProjectToolMatrix.map(({ name, input }) =>
          runCliAsync("tool", "invoke", name, "--project", projectPath, "--input", JSON.stringify(input)),
        ),
      );

      expect(openProjectToolMatrix.filter(({ category }) => category === "project")).toHaveLength(19);
      expect(openProjectToolMatrix.filter(({ category }) => category === "selection")).toHaveLength(6);
      expect(openProjectToolMatrix.filter(({ category }) => category === "viewport")).toHaveLength(4);
      expect(new Set(openProjectToolMatrix.map(({ name }) => name))).toHaveLength(29);
      expect(results).toEqual(
        openProjectToolMatrix.map(() => ({ status: 0, stdout: '{"routed":true}\n', stderr: "" })),
      );
      expect(host.requests).toEqual(
        expect.arrayContaining(
          openProjectToolMatrix.map(({ name, input }) => ({
            projectPath: realpathSync(projectPath),
            toolName: name,
            input,
          })),
        ),
      );
      expect(host.requests).toHaveLength(29);
      expect(readFileSync(projectPath)).toEqual(before);
    } finally {
      host.close();
    }
  }, 60_000);

  it("requires an Open Project before entering any selection or viewport handler", async () => {
    const projectPath = await createProjectFixture();
    const before = readFileSync(projectPath);
    const executorReadyPath = join(dirname(projectPath), "executor-ready.txt");
    const liveContextTools = openProjectToolMatrix.filter(({ category }) => category !== "project");
    const previousExecutorReadyPath = process.env.PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH;

    const results = [];
    process.env.PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH = executorReadyPath;
    try {
      for (const { name, input } of liveContextTools) {
        results.push(
          await runCliAsync("tool", "invoke", name, "--project", projectPath, "--input", JSON.stringify(input)),
        );
      }
    } finally {
      if (previousExecutorReadyPath === undefined) delete process.env.PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH;
      else process.env.PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH = previousExecutorReadyPath;
    }

    expect(liveContextTools).toHaveLength(10);
    expect(results).toEqual(
      liveContextTools.map(() => ({
        status: 1,
        stdout: "",
        stderr: '{"code":"PROJECT_MUST_BE_OPEN","message":"This tool requires a matching Open Project."}\n',
      })),
    );
    expect(existsSync(executorReadyPath)).toBe(false);
    expect(readFileSync(projectPath)).toEqual(before);
  }, 45_000);

  it("returns a structured error when a connectable Open Project host disconnects without using the closed route", async () => {
    const projectPath = await createProjectFixture();
    const before = readFileSync(projectPath);
    const host = await createOpenProjectHost(projectPath, { objects: [] });
    await host.disconnect();

    try {
      expectCliError(
        ["tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
        { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
        1,
      );
      expect(readFileSync(projectPath)).toEqual(before);
    } finally {
      host.close();
    }
  });

  it("waits for a long-running Open Project invocation without imposing a timeout", async () => {
    const projectPath = await createProjectFixture();
    const host = await createOpenProjectHost(projectPath, { completed: true }, 7200);

    try {
      await expect(
        runCliAsync("tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"),
      ).resolves.toEqual({ status: 0, stdout: '{"completed":true}\n', stderr: "" });
    } finally {
      host.close();
    }
  }, 15_000);

  it.each(["SIGINT", "SIGTERM"] as const)(
    "reports handled %s cancellation without stdout or protocol noise",
    async (signal) => {
      const projectPath = await createProjectFixture();
      const host = await createCancellableOpenProjectHost(projectPath);
      const invocation = spawnCliEntryProcess(
        {},
        "tool",
        "invoke",
        "get_all_nodes",
        "--project",
        projectPath,
        "--input",
        "{}",
      );

      try {
        await host.invocationReceived;
        invocation.child.kill(signal);
        await expect(invocation.result).resolves.toEqual({
          status: 130,
          stdout: "",
          stderr: '{"code":"CANCELLED","message":"Project Graph CLI invocation was cancelled."}\n',
        });
        expect(host.usedSingleConnection).toBe(true);
      } finally {
        host.close();
      }
    },
    15_000,
  );

  it("does not save a closed Project or print partial success after handled cancellation", async () => {
    const projectPath = await createProjectFixture("2.7.0", createMutationStage());
    const projectBefore = readFileSync(projectPath);
    const invocation = spawnCliEntryProcess(
      {},
      "tool",
      "invoke",
      "create_edges",
      "--project",
      projectPath,
      "--input",
      JSON.stringify({ edges: [{ sourceRef: "n1", targetRef: "n2" }] }),
    );

    await waitForProjectLock(`${realpathSync(projectPath)}.project-graph.lock`);
    invocation.child.kill("SIGTERM");

    await expect(invocation.result).resolves.toEqual({
      status: 130,
      stdout: "",
      stderr: '{"code":"CANCELLED","message":"Project Graph CLI invocation was cancelled."}\n',
    });
    expect(readFileSync(projectPath)).toEqual(projectBefore);
  }, 15_000);
});
