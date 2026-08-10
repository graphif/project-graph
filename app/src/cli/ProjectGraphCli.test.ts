import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Encoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { afterEach, describe, expect, it } from "vitest";
import { URI } from "vscode-uri";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const temporaryDirectories: string[] = [];
let referenceStorePath: string | undefined;

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

async function createProjectFixture(version = "2.7.0", stage: unknown[] = []): Promise<string> {
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
  await writer.close();
  writeFileSync(projectPath, await archive.getData());
  return projectPath;
}

function runCli(...args: string[]) {
  return spawnSync("pnpm", ["cli", "--", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", PROJECT_GRAPH_REFERENCE_STORE_PATH: getReferenceStorePath() },
  });
}

function expectCliError(args: string[], expected: { code: string; message: string }, exitCode = 2): void {
  const result = runCli(...args);
  const error = JSON.parse(result.stderr) as Record<string, unknown>;

  expect(result).toMatchObject({ status: exitCode, stdout: "" });
  expect(error).toEqual(expected);
  expect(result.stderr).toBe(`${JSON.stringify(error)}\n`);
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

    expect(result).toMatchObject({ status: 0, stdout: "1.0.0\n", stderr: "" });
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

  it("reports a missing explicit Project Path without opening a Project", () => {
    expectCliError(
      ["tool", "invoke", "get_all_nodes", "--project", "/does/not/exist.prg", "--input", "{}"],
      { code: "PROJECT_NOT_FOUND", message: "Project file was not found." },
      1,
    );
  });

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
      "pnpm",
      ["cli", "--", "tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          NO_COLOR: "1",
          PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH: executorReadyPath,
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

  it("keeps the Closed Project Runtime Host limited to get_all_nodes", async () => {
    const projectPath = await createProjectFixture();
    const before = readFileSync(projectPath);

    expectCliError(
      ["tool", "invoke", "get_object_details", "--project", projectPath, "--input", '{"refs":[]}'],
      { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
      1,
    );
    expect(readFileSync(projectPath)).toEqual(before);
  });

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
  });

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
  });

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
});
