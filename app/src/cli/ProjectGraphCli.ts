import {
  getBuiltInToolCliEntries,
  getBuiltInToolCliEntry,
} from "../core/service/dataManageService/aiEngine/BuiltInToolCliAdapter";
import {
  getBuiltInToolDefinition,
  prepareBuiltInToolInvocation,
} from "../core/service/dataManageService/aiEngine/BuiltInToolRegistry";
import {
  canClosedProjectProvideCapabilities,
  canOpenProjectProvideCapabilities,
} from "../core/service/dataManageService/aiEngine/BuiltInToolRuntimeProfiles";
import type { ProjectGraphCliOperationalError } from "./ClosedProjectInvocation";
import type { ProjectGraphCliRuntime } from "./ProjectGraphCliRuntime";

const help = `Usage: project-graph <command>

Commands:
  tool list
  tool describe <tool>
  tool invoke <tool> --project <path> --input <JSON> [--allow-upgrade]

Options:
  --help     Show help
  --version  Show version
`;

type ProjectGraphCliLocalErrorCode =
  | "INVALID_COMMAND"
  | "UNKNOWN_TOOL"
  | "INVALID_JSON"
  | "TOOL_INPUT_INVALID"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_BUSY"
  | "PROJECT_MUST_BE_OPEN"
  | "RUNTIME_CLEANUP_FAILED"
  | "RUNTIME_HOST_UNAVAILABLE"
  | "CANCELLED";

type ProjectGraphCliError =
  | ProjectGraphCliOperationalError
  | {
      code: ProjectGraphCliLocalErrorCode;
      message: string;
    };

function writeError(error: ProjectGraphCliError): void {
  process.stderr.write(`${JSON.stringify(error)}\n`);
}

export async function runProjectGraphCli(
  args: readonly string[],
  options: {
    version: string;
    loadRuntime: () => Promise<ProjectGraphCliRuntime>;
    abortSignal?: AbortSignal;
  },
): Promise<number> {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(help);
    return 0;
  }
  if (args.length === 1 && args[0] === "--version") {
    process.stdout.write(`${options.version}\n`);
    return 0;
  }
  if (args.length === 2 && args[0] === "tool" && args[1] === "list") {
    process.stdout.write(`${JSON.stringify(getBuiltInToolCliEntries())}\n`);
    return 0;
  }
  if (args.length === 3 && args[0] === "tool" && args[1] === "describe") {
    const definition = getBuiltInToolCliEntry(args[2]);
    if (!definition) {
      writeError({ code: "UNKNOWN_TOOL", message: `Unknown built-in tool: ${args[2]}` });
      return 2;
    }
    process.stdout.write(`${JSON.stringify(definition)}\n`);
    return 0;
  }
  if (args[0] === "tool" && args[1] === "invoke") {
    const allowUpgrade = args.length === 8 && args[7] === "--allow-upgrade";
    if ((args.length !== 7 && !allowUpgrade) || args[3] !== "--project" || args[5] !== "--input") {
      writeError({ code: "INVALID_COMMAND", message: "Invalid Project Graph CLI command." });
      return 2;
    }

    const toolName = args[2];
    const definition = getBuiltInToolDefinition(toolName);
    if (!definition) {
      writeError({ code: "UNKNOWN_TOOL", message: `Unknown built-in tool: ${toolName}` });
      return 2;
    }

    let input: unknown;
    try {
      input = JSON.parse(args[6]);
    } catch {
      writeError({ code: "INVALID_JSON", message: "The --input value must be valid JSON." });
      return 2;
    }

    try {
      prepareBuiltInToolInvocation(
        toolName,
        input,
        (capabilities) =>
          canClosedProjectProvideCapabilities(capabilities) || canOpenProjectProvideCapabilities(capabilities),
      );
    } catch {
      writeError({
        code: "TOOL_INPUT_INVALID",
        message: `Tool input does not match the built-in tool schema: ${toolName}`,
      });
      return 2;
    }

    const { runPathRoutedInvocation } = await options.loadRuntime();
    const result = await runPathRoutedInvocation({
      toolName,
      input,
      projectPath: args[4],
      allowUpgrade,
      abortSignal: options.abortSignal,
    });
    if ("forwarded" in result) return result.exitCode;
    if (!result.ok) {
      writeError(result.error);
      return result.error.code === "CANCELLED" ? 130 : 1;
    }
    process.stdout.write(`${JSON.stringify(result.value === undefined ? null : result.value)}\n`);
    return 0;
  }
  writeError({ code: "INVALID_COMMAND", message: "Invalid Project Graph CLI command." });
  return 2;
}

export async function runProjectGraphCliProcess(options: {
  version: string;
  loadRuntime: () => Promise<ProjectGraphCliRuntime>;
}): Promise<void> {
  const args = process.argv.slice(2);
  const abortController = new AbortController();
  const handleSignal = (signal: NodeJS.Signals) => abortController.abort(signal);
  const handleSigint = () => handleSignal("SIGINT");
  const handleSigterm = () => handleSignal("SIGTERM");
  process.on("SIGINT", handleSigint);
  process.on("SIGTERM", handleSigterm);
  try {
    process.exitCode = await runProjectGraphCli(args[0] === "--" ? args.slice(1) : args, {
      ...options,
      abortSignal: abortController.signal,
    });
  } finally {
    process.off("SIGINT", handleSigint);
    process.off("SIGTERM", handleSigterm);
  }
}
