import { spawnSync } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { createServer, type Plugin } from "vite";
import type { ClosedProjectInvocationResult, ProjectGraphCliOperationalError } from "./ClosedProjectInvocation";

type RuntimeResult =
  | ClosedProjectInvocationResult
  | {
      ok: false;
      error:
        | ProjectGraphCliOperationalError
        | { code: "PROJECT_NOT_FOUND" | "PROJECT_BUSY" | "RUNTIME_CLEANUP_FAILED"; message: string };
    }
  | { forwarded: true; exitCode: number };

function canonicalizeProjectPath(
  projectPath: string,
):
  | { ok: true; canonicalPath: string }
  | { ok: false; error: { code: "PROJECT_NOT_FOUND" | "PROJECT_LOAD_FAILED"; message: string } } {
  try {
    const canonicalPath = realpathSync.native(projectPath);
    if (!statSync(canonicalPath).isFile() || !canonicalPath.toLowerCase().endsWith(".prg")) {
      return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
    }
    return { ok: true, canonicalPath };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return { ok: false, error: { code: "PROJECT_NOT_FOUND", message: "Project file was not found." } };
    }
    return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
  }
}

function isStructuredCliError(output: string): boolean {
  try {
    const error: unknown = JSON.parse(output);
    return (
      !!error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      "message" in error &&
      typeof error.message === "string"
    );
  } catch {
    return false;
  }
}

function runtimeCompatibilityPlugin(stubs: { settings: string; renderer: string; detailsManager: string }): Plugin {
  return {
    name: "project-graph-cli-runtime-compatibility",
    enforce: "pre",
    resolveId(id) {
      if (
        id === "@/core/service/Settings" ||
        id === "./Settings" ||
        id === "./service/Settings" ||
        /\/core\/service\/Settings(?:\.tsx)?$/.test(id)
      ) {
        return stubs.settings;
      }
      if (id === "@/core/render/canvas2d/renderer" || /\/core\/render\/canvas2d\/renderer(?:\.tsx)?$/.test(id)) {
        return stubs.renderer;
      }
      if (
        id.endsWith("/stageObject/tools/entityDetailsManager") ||
        id === "../tools/entityDetailsManager" ||
        id === "./stageObject/tools/entityDetailsManager"
      ) {
        return stubs.detailsManager;
      }
      return id === "virtual:original-class-name" ? `\0${id}` : undefined;
    },
    load(id) {
      return id === "\0virtual:original-class-name"
        ? "export const getOriginalNameOf = value => value.name"
        : undefined;
    },
  };
}

async function invokeInRenderer(options: {
  toolName: string;
  input: unknown;
  canonicalPath: string;
  allowUpgrade: boolean;
}): Promise<RuntimeResult> {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({ measureText: (text: string) => ({ width: text.length * 50 }) }),
  });

  const appRoot = fileURLToPath(new URL("../..", import.meta.url));
  const stubs = {
    settings: fileURLToPath(new URL("./ClosedProjectSettings.ts", import.meta.url)),
    renderer: fileURLToPath(new URL("./ClosedProjectRenderer.ts", import.meta.url)),
    detailsManager: fileURLToPath(new URL("./ClosedProjectDetailsManager.ts", import.meta.url)),
  };
  let server: Awaited<ReturnType<typeof createServer>> | undefined;
  let result: RuntimeResult;
  try {
    server = await createServer({
      configFile: false,
      root: appRoot,
      logLevel: "silent",
      optimizeDeps: { noDiscovery: true },
      resolve: {
        alias: [{ find: "@", replacement: `${appRoot}/src` }],
      },
      server: { middlewareMode: true },
      plugins: [runtimeCompatibilityPlugin(stubs)],
    });
    const runtime = (await server.ssrLoadModule("/src/cli/ClosedProjectInvocation.ts")) as {
      invokeClosedProjectTool: (value: typeof options) => Promise<ClosedProjectInvocationResult>;
    };
    result = await runtime.invokeClosedProjectTool(options);
  } catch {
    result = {
      ok: false,
      error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
    };
  } finally {
    let cleanupFailed = false;
    try {
      await server?.close();
    } catch {
      cleanupFailed = true;
    }
    dom.window.close();
    Object.assign(globalThis, { window: previousWindow, document: previousDocument });
    if (cleanupFailed) {
      result = {
        ok: false,
        error: { code: "RUNTIME_CLEANUP_FAILED", message: "Project Runtime Host cleanup failed." },
      };
    }
  }
  return result;
}

function runOwnedWorker(args: readonly string[], canonicalPath: string) {
  return spawnSync(
    "/usr/bin/lockf",
    ["-k", "-s", "-t", "0", `${canonicalPath}.project-graph.lock`, process.execPath, process.argv[1], "--", ...args],
    {
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      env: { ...process.env, PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED: "1" },
    },
  );
}

export async function runPathRoutedInvocation(options: {
  toolName: string;
  input: unknown;
  projectPath: string;
  allowUpgrade: boolean;
}): Promise<RuntimeResult> {
  if (options.toolName !== "get_all_nodes") {
    return {
      ok: false,
      error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
    };
  }

  const projectPathResult = canonicalizeProjectPath(options.projectPath);
  if (!projectPathResult.ok) return projectPathResult;

  if (process.env.PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED === "1") {
    return invokeInRenderer({ ...options, canonicalPath: projectPathResult.canonicalPath });
  }

  const args = [
    "tool",
    "invoke",
    options.toolName,
    "--project",
    projectPathResult.canonicalPath,
    "--input",
    JSON.stringify(options.input),
    ...(options.allowUpgrade ? ["--allow-upgrade"] : []),
  ];
  let worker = runOwnedWorker(args, projectPathResult.canonicalPath);
  if (worker.status === 75) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    worker = runOwnedWorker(args, projectPathResult.canonicalPath);
  }
  if (worker.status === 75) {
    return { ok: false, error: { code: "PROJECT_BUSY", message: "Project is already owned by another runtime." } };
  }
  if (worker.error || worker.status === null) {
    return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
  }
  if (worker.status !== 0 && !isStructuredCliError(worker.stderr)) {
    return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
  }
  if (worker.stdout) process.stdout.write(worker.stdout);
  if (worker.stderr) process.stderr.write(worker.stderr);
  return { forwarded: true, exitCode: worker.status };
}
