import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

function runCli(...args: string[]) {
  return spawnSync("pnpm", ["cli", "--", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
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

  it("keeps a validated invocation machine-framed before a Runtime Host is connected", () => {
    expectCliError(
      ["tool", "invoke", "get_all_nodes", "--project", "/does/not/exist.prg", "--input", "{}"],
      {
        code: "TOOL_EXECUTION_FAILED",
        message: "The Project Runtime Host is not available yet.",
      },
      1,
    );
  });
});
