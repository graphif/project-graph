import packageJson from "../../../package.json" with { type: "json" };
import {
  getBuiltInToolCliEntries,
  getBuiltInToolCliEntry,
} from "../core/service/dataManageService/aiEngine/BuiltInToolCliAdapter";
import { getBuiltInToolDefinition } from "../core/service/dataManageService/aiEngine/BuiltInToolRegistry";

const help = `Usage: project-graph <command>

Commands:
  tool list
  tool describe <tool>
  tool invoke <tool> --project <path> --input <JSON> [--allow-upgrade]

Options:
  --help     Show help
  --version  Show version
`;

type ProjectGraphCliErrorCode =
  | "INVALID_COMMAND"
  | "UNKNOWN_TOOL"
  | "INVALID_JSON"
  | "TOOL_INPUT_INVALID"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_BUSY"
  | "PROJECT_UPGRADE_REQUIRED"
  | "PROJECT_VERSION_UNSUPPORTED"
  | "PROJECT_LOAD_FAILED"
  | "TOOL_EXECUTION_FAILED"
  | "PROJECT_REFERENCE_SAVE_FAILED"
  | "RUNTIME_CLEANUP_FAILED"
  | "RUNTIME_HOST_UNAVAILABLE";

function writeError(code: ProjectGraphCliErrorCode, message: string): void {
  process.stderr.write(`${JSON.stringify({ code, message })}\n`);
}

export async function runProjectGraphCli(args: readonly string[]): Promise<number> {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(help);
    return 0;
  }
  if (args.length === 1 && args[0] === "--version") {
    process.stdout.write(`${packageJson.version}\n`);
    return 0;
  }
  if (args.length === 2 && args[0] === "tool" && args[1] === "list") {
    process.stdout.write(`${JSON.stringify(getBuiltInToolCliEntries())}\n`);
    return 0;
  }
  if (args.length === 3 && args[0] === "tool" && args[1] === "describe") {
    const definition = getBuiltInToolCliEntry(args[2]);
    if (!definition) {
      writeError("UNKNOWN_TOOL", `Unknown built-in tool: ${args[2]}`);
      return 2;
    }
    process.stdout.write(`${JSON.stringify(definition)}\n`);
    return 0;
  }
  if (args[0] === "tool" && args[1] === "invoke") {
    const allowUpgrade = args.length === 8 && args[7] === "--allow-upgrade";
    if ((args.length !== 7 && !allowUpgrade) || args[3] !== "--project" || args[5] !== "--input") {
      writeError("INVALID_COMMAND", "Invalid Project Graph CLI command.");
      return 2;
    }

    const toolName = args[2];
    const definition = getBuiltInToolDefinition(toolName);
    if (!definition) {
      writeError("UNKNOWN_TOOL", `Unknown built-in tool: ${toolName}`);
      return 2;
    }

    let input: unknown;
    try {
      input = JSON.parse(args[6]);
    } catch {
      writeError("INVALID_JSON", "The --input value must be valid JSON.");
      return 2;
    }

    if (!definition.inputSchema.safeParse(input).success) {
      writeError("TOOL_INPUT_INVALID", `Tool input does not match the built-in tool schema: ${toolName}`);
      return 2;
    }

    const { runPathRoutedInvocation } = await import("./ProjectGraphCliRuntime");
    const result = await runPathRoutedInvocation({
      toolName,
      input,
      projectPath: args[4],
      allowUpgrade,
    });
    if ("forwarded" in result) return result.exitCode;
    if (!result.ok) {
      writeError(result.error.code, result.error.message);
      return 1;
    }
    process.stdout.write(`${JSON.stringify(result.value)}\n`);
    return 0;
  }
  writeError("INVALID_COMMAND", "Invalid Project Graph CLI command.");
  return 2;
}
