import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { createServer, type Plugin } from "vite";
import {
  classifyBuiltInToolProjectContext,
  getBuiltInToolDefinition,
} from "../core/service/dataManageService/aiEngine/BuiltInToolRegistry";
import type { ClosedProjectInvocationResult, ProjectGraphCliOperationalError } from "./ClosedProjectInvocation";

type RuntimeResult =
  | ClosedProjectInvocationResult
  | {
      ok: false;
      error:
        | ProjectGraphCliOperationalError
        | {
            code:
              | "PROJECT_NOT_FOUND"
              | "PROJECT_BUSY"
              | "PROJECT_MUST_BE_OPEN"
              | "RUNTIME_CLEANUP_FAILED"
              | "RUNTIME_HOST_UNAVAILABLE";
            message: string;
          };
    }
  | { forwarded: true; exitCode: number };

const RUNTIME_HOST_RESPONSE_TIMEOUT_MS = 7000;

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

function runtimeCompatibilityPlugin(stubs: {
  settings: string;
  renderer: string;
  detailsManager: string;
  fileSystemProvider: string;
  soundService: string;
}): Plugin {
  return {
    name: "project-graph-cli-runtime-compatibility",
    enforce: "pre",
    resolveId(id) {
      if (
        id === "@/core/service/Settings" ||
        id.endsWith("/Settings") ||
        /\/core\/service\/Settings(?:\.tsx)?(?:\?.*)?$/.test(id)
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
      if (id.includes("/core/fileSystemProvider/FileSystemProviderFile")) return stubs.fileSystemProvider;
      if (id.includes("/core/service/feedbackService/SoundService") || id.endsWith("/feedbackService/SoundService")) {
        return stubs.soundService;
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
    fileSystemProvider: fileURLToPath(new URL("./ClosedProjectFileSystemProvider.ts", import.meta.url)),
    soundService: fileURLToPath(new URL("./ClosedProjectSoundService.ts", import.meta.url)),
  };
  let server: Awaited<ReturnType<typeof createServer>> | undefined;
  let result: RuntimeResult;
  try {
    server = await createServer({
      configFile: false,
      root: appRoot,
      logLevel: "silent",
      optimizeDeps: { noDiscovery: true },
      ssr: { noExternal: ["@platejs/math"] },
      resolve: {
        alias: [
          { find: "@/core/service/Settings", replacement: stubs.settings },
          { find: /\/core\/service\/Settings(?:\.tsx)?$/, replacement: stubs.settings },
          { find: "@/core/fileSystemProvider/FileSystemProviderFile", replacement: stubs.fileSystemProvider },
          {
            find: /\/core\/fileSystemProvider\/FileSystemProviderFile(?:\.tsx)?$/,
            replacement: stubs.fileSystemProvider,
          },
          { find: "@/core/service/feedbackService/SoundService", replacement: stubs.soundService },
          {
            find: /\/core\/service\/feedbackService\/SoundService(?:\.tsx)?$/,
            replacement: stubs.soundService,
          },
          { find: "@", replacement: `${appRoot}/src` },
        ],
      },
      server: { middlewareMode: true },
      plugins: [runtimeCompatibilityPlugin(stubs)],
    });
    const runtime = (await server.ssrLoadModule("/src/cli/ClosedProjectInvocation.ts")) as {
      invokeClosedProjectTool: (
        value: typeof options,
        loadModule: (id: string) => Promise<Record<string, unknown>>,
      ) => Promise<ClosedProjectInvocationResult>;
    };
    result = await runtime.invokeClosedProjectTool(options, (id) => server!.ssrLoadModule(id));
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

function readConnectableOwner(canonicalPath: string): { endpoint: string } | undefined {
  const ownerPath = `${canonicalPath}.project-graph.connectable`;
  const ownerLock = spawnSync("/usr/bin/lockf", ["-k", "-s", "-t", "0", ownerPath, "/usr/bin/true"]);
  if (ownerLock.status !== 75) return undefined;
  try {
    const owner: unknown = JSON.parse(readFileSync(ownerPath, "utf8"));
    if (
      owner &&
      typeof owner === "object" &&
      "kind" in owner &&
      owner.kind === "connectable" &&
      "endpoint" in owner &&
      typeof owner.endpoint === "string"
    ) {
      return { endpoint: owner.endpoint };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function invokeOpenProjectTool(
  endpoint: string,
  request: { projectPath: string; toolName: string; input: unknown },
): Promise<RuntimeResult> {
  return new Promise((resolve) => {
    let address: URL;
    try {
      address = new URL(endpoint);
      if (address.protocol !== "tcp:" || !address.hostname || !address.port) throw new Error("Invalid endpoint");
    } catch {
      resolve({
        ok: false,
        error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
      });
      return;
    }

    let output = "";
    let settled = false;
    const finish = (result: RuntimeResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const unavailable = () =>
      finish({
        ok: false,
        error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
      });
    const socket = createConnection({ host: address.hostname, port: Number(address.port) });
    socket.setEncoding("utf8");
    socket.setTimeout(RUNTIME_HOST_RESPONSE_TIMEOUT_MS, () => {
      socket.destroy();
      unavailable();
    });
    socket.once("connect", () => socket.end(`${JSON.stringify(request)}\n`));
    socket.on("data", (chunk) => {
      output += chunk;
    });
    socket.once("error", unavailable);
    socket.once("end", () => {
      try {
        const response: unknown = JSON.parse(output);
        if (!response || typeof response !== "object" || !("ok" in response)) return unavailable();
        if (response.ok === true && "value" in response) return finish({ ok: true, value: response.value });
        if (
          response.ok === false &&
          "error" in response &&
          response.error &&
          typeof response.error === "object" &&
          "code" in response.error &&
          typeof response.error.code === "string" &&
          "message" in response.error &&
          typeof response.error.message === "string"
        ) {
          return finish({ ok: false, error: response.error as ProjectGraphCliOperationalError });
        }
        unavailable();
      } catch {
        unavailable();
      }
    });
  });
}

function invokeConnectableOwnerIfPresent(
  canonicalPath: string,
  options: { toolName: string; input: unknown },
): Promise<RuntimeResult> | undefined {
  const owner = readConnectableOwner(canonicalPath);
  if (!owner) return undefined;
  return invokeOpenProjectTool(owner.endpoint, {
    projectPath: canonicalPath,
    toolName: options.toolName,
    input: options.input,
  });
}

export async function runPathRoutedInvocation(options: {
  toolName: string;
  input: unknown;
  projectPath: string;
  allowUpgrade: boolean;
}): Promise<RuntimeResult> {
  const definition = getBuiltInToolDefinition(options.toolName);
  if (!definition) {
    return {
      ok: false,
      error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
    };
  }
  const requiresOpenProject = classifyBuiltInToolProjectContext(definition) !== "closed-capable";

  const projectPathResult = canonicalizeProjectPath(options.projectPath);
  if (!projectPathResult.ok) return projectPathResult;

  if (process.env.PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED === "1") {
    if (requiresOpenProject) {
      return {
        ok: false,
        error: { code: "PROJECT_MUST_BE_OPEN", message: "This tool requires a matching Open Project." },
      };
    }
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
    const openResult = invokeConnectableOwnerIfPresent(projectPathResult.canonicalPath, options);
    if (openResult) return openResult;
    await new Promise((resolve) => setTimeout(resolve, 5000));
    worker = runOwnedWorker(args, projectPathResult.canonicalPath);
  }
  if (worker.status === 75) {
    const openResult = invokeConnectableOwnerIfPresent(projectPathResult.canonicalPath, options);
    if (openResult) return openResult;
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
