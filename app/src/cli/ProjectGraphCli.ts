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
  tool invoke <tool> --project <path> --input <JSON>

Options:
  --help     Show help
  --version  Show version
`;

type ProjectGraphCliErrorCode =
  | "INVALID_COMMAND"
  | "UNKNOWN_TOOL"
  | "INVALID_JSON"
  | "TOOL_INPUT_INVALID"
  | "TOOL_EXECUTION_FAILED";

function writeError(code: ProjectGraphCliErrorCode, message: string): void {
  process.stderr.write(`${JSON.stringify({ code, message })}\n`);
}

export function runProjectGraphCli(args: readonly string[]): number {
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
    if (args.length !== 7 || args[3] !== "--project" || args[5] !== "--input") {
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

    writeError("TOOL_EXECUTION_FAILED", "The Project Runtime Host is not available yet.");
    return 1;
  }
  writeError("INVALID_COMMAND", "Invalid Project Graph CLI command.");
  return 2;
}
