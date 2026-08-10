import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { createServer, type Plugin } from "vite";
import { prepareBuiltInToolInvocation } from "../core/service/dataManageService/aiEngine/BuiltInToolRegistry";
import {
  canClosedProjectProvideCapabilities,
  canOpenProjectProvideCapabilities,
} from "../core/service/dataManageService/aiEngine/BuiltInToolRuntimeProfiles";
import { finalizeRuntimeCleanup } from "../core/RuntimeCleanup";
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
              | "RUNTIME_HOST_UNAVAILABLE"
              | "CANCELLED";
            message: string;
          };
    }
  | { forwarded: true; exitCode: number };

const cancelledResult = (): RuntimeResult => ({
  ok: false,
  error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." },
});

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

type RuntimeStubs = {
  settings: string;
  renderer: string;
  detailsManager: string;
  fileSystemProvider: string;
  soundService: string;
  http: string;
  modelImageEncoder: string;
};

const runtimeStubDescriptors: readonly {
  matcher: string | RegExp;
  stubKey: keyof RuntimeStubs;
}[] = [
  { matcher: "@/core/service/Settings", stubKey: "settings" },
  { matcher: /^(?:.*\/)?core\/service\/Settings(?:\.tsx)?(?:\?.*)?$/, stubKey: "settings" },
  { matcher: /^(?:.*\/)?Settings$/, stubKey: "settings" },
  { matcher: "@/core/render/canvas2d/renderer", stubKey: "renderer" },
  { matcher: /^(?:.*\/)?core\/render\/canvas2d\/renderer(?:\.tsx)?$/, stubKey: "renderer" },
  { matcher: /^(?:.*\/)?stageObject\/tools\/entityDetailsManager$/, stubKey: "detailsManager" },
  { matcher: "../tools/entityDetailsManager", stubKey: "detailsManager" },
  {
    matcher: /^(?:.*\/)?core\/fileSystemProvider\/FileSystemProviderFile(?:\.tsx)?$/,
    stubKey: "fileSystemProvider",
  },
  { matcher: "@/core/fileSystemProvider/FileSystemProviderFile", stubKey: "fileSystemProvider" },
  {
    matcher: /^(?:.*\/)?core\/service\/feedbackService\/SoundService(?:\.tsx)?$/,
    stubKey: "soundService",
  },
  { matcher: /^(?:.*\/)?feedbackService\/SoundService$/, stubKey: "soundService" },
  { matcher: "@/core/service/feedbackService/SoundService", stubKey: "soundService" },
  { matcher: "@tauri-apps/plugin-http", stubKey: "http" },
  {
    matcher: /^(?:.*\/)?core\/service\/dataManageService\/aiEngine\/ModelImageEncoder(?:\.tsx)?$/,
    stubKey: "modelImageEncoder",
  },
  { matcher: "@/core/service/dataManageService/aiEngine/ModelImageEncoder", stubKey: "modelImageEncoder" },
];

function runtimeCompatibilityPlugin(stubs: RuntimeStubs): Plugin {
  return {
    name: "project-graph-cli-runtime-compatibility",
    enforce: "pre",
    resolveId(id) {
      const descriptor = runtimeStubDescriptors.find(({ matcher }) =>
        typeof matcher === "string" ? id === matcher : matcher.test(id),
      );
      if (descriptor) return stubs[descriptor.stubKey];
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
  abortSignal?: AbortSignal;
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
    http: fileURLToPath(new URL("./ClosedProjectHttp.ts", import.meta.url)),
    modelImageEncoder: fileURLToPath(new URL("./ClosedProjectModelImageEncoder.ts", import.meta.url)),
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
          ...runtimeStubDescriptors.map(({ matcher, stubKey }) => ({
            find: matcher,
            replacement: stubs[stubKey],
          })),
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
  }
  return finalizeRuntimeCleanup(result, [
    async () => server?.close(),
    () => dom.window.close(),
    () => Object.assign(globalThis, { window: previousWindow, document: previousDocument }),
  ]);
}

function runOwnedWorker(args: readonly string[], canonicalPath: string, abortSignal?: AbortSignal) {
  return new Promise<{ status: number | null; stdout: string; stderr: string; error?: Error }>((resolve) => {
    if (abortSignal?.aborted) {
      resolve({ status: null, stdout: "", stderr: "" });
      return;
    }
    let lockFd: number;
    try {
      lockFd = openSync(`${canonicalPath}.project-graph.lock`, "a+");
    } catch (error) {
      resolve({ status: null, stdout: "", stderr: "", error: error as Error });
      return;
    }
    const lock = spawnSync("/usr/bin/lockf", ["-s", "-t", "0", "3"], {
      stdio: ["ignore", "ignore", "ignore", lockFd],
    });
    if (lock.error || lock.status !== 0) {
      closeSync(lockFd);
      resolve({
        status: lock.status,
        stdout: "",
        stderr: "",
        ...(lock.error ? { error: lock.error } : {}),
      });
      return;
    }
    const worker = spawn(process.execPath, [process.argv[1], "--", ...args], {
      env: { ...process.env, PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED: "1" },
      stdio: ["ignore", "pipe", "pipe", lockFd],
    });
    closeSync(lockFd);
    const stdoutStream = worker.stdout;
    const stderrStream = worker.stderr;
    if (!stdoutStream || !stderrStream) {
      worker.kill();
      resolve({ status: null, stdout: "", stderr: "", error: new Error("CLI worker pipes are unavailable") });
      return;
    }
    let stdout = "";
    let stderr = "";
    let error: Error | undefined;
    stdoutStream.setEncoding("utf8");
    stderrStream.setEncoding("utf8");
    stdoutStream.on("data", (chunk) => {
      stdout += chunk;
    });
    stderrStream.on("data", (chunk) => {
      stderr += chunk;
    });
    worker.once("error", (workerError) => {
      error = workerError;
    });
    const cancelWorker = () => {
      const signal = abortSignal?.reason === "SIGINT" ? "SIGINT" : "SIGTERM";
      try {
        worker.kill(signal);
      } catch (workerError) {
        if ((workerError as NodeJS.ErrnoException).code !== "ESRCH") error = workerError as Error;
      }
    };
    abortSignal?.addEventListener("abort", cancelWorker, { once: true });
    worker.once("close", (status) => {
      abortSignal?.removeEventListener("abort", cancelWorker);
      resolve({ status, stdout, stderr, ...(error ? { error } : {}) });
    });
    if (abortSignal?.aborted) cancelWorker();
  });
}

function waitForOwnerRetry(abortSignal?: AbortSignal): Promise<void> {
  if (abortSignal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      abortSignal?.removeEventListener("abort", finish);
      resolve();
    };
    const timeout = setTimeout(finish, 5000);
    abortSignal?.addEventListener("abort", finish, { once: true });
  });
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
  abortSignal?: AbortSignal,
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
    const requestId = randomUUID();
    const cancellationRequest = `${JSON.stringify({ cancelRequestId: requestId })}\n`;
    let connected = false;
    const sendCancellation = () => {
      if (connected) socket.write(cancellationRequest);
    };
    const finish = (result: RuntimeResult) => {
      if (settled) return;
      settled = true;
      abortSignal?.removeEventListener("abort", sendCancellation);
      resolve(abortSignal?.aborted ? cancelledResult() : result);
    };
    const unavailable = () =>
      finish({
        ok: false,
        error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
      });
    const socket = createConnection({ host: address.hostname, port: Number(address.port) });
    socket.setEncoding("utf8");
    socket.once("connect", () => {
      connected = true;
      socket.write(`${JSON.stringify({ requestId, ...request })}\n`);
      if (abortSignal?.aborted) sendCancellation();
    });
    abortSignal?.addEventListener("abort", sendCancellation, { once: true });
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
  options: { toolName: string; input: unknown; abortSignal?: AbortSignal },
): Promise<RuntimeResult> | undefined {
  const owner = readConnectableOwner(canonicalPath);
  if (!owner) return undefined;
  return invokeOpenProjectTool(
    owner.endpoint,
    {
      projectPath: canonicalPath,
      toolName: options.toolName,
      input: options.input,
    },
    options.abortSignal,
  );
}

export async function runPathRoutedInvocation(options: {
  toolName: string;
  input: unknown;
  projectPath: string;
  allowUpgrade: boolean;
  abortSignal?: AbortSignal;
}): Promise<RuntimeResult> {
  if (options.abortSignal?.aborted) return cancelledResult();
  let prepared;
  try {
    prepared = prepareBuiltInToolInvocation(
      options.toolName,
      options.input,
      (capabilities) =>
        canClosedProjectProvideCapabilities(capabilities) || canOpenProjectProvideCapabilities(capabilities),
    );
  } catch {
    return {
      ok: false,
      error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
    };
  }
  const requiresOpenProject = !canClosedProjectProvideCapabilities(prepared.definition.capabilities);

  if (process.env.PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED === "1" && requiresOpenProject) {
    return {
      ok: false,
      error: { code: "PROJECT_MUST_BE_OPEN", message: "This tool requires a matching Open Project." },
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
  let worker = await runOwnedWorker(args, projectPathResult.canonicalPath, options.abortSignal);
  if (worker.status === 75) {
    const openResult = invokeConnectableOwnerIfPresent(projectPathResult.canonicalPath, options);
    if (openResult) return openResult;
    await waitForOwnerRetry(options.abortSignal);
    if (options.abortSignal?.aborted) return cancelledResult();
    worker = await runOwnedWorker(args, projectPathResult.canonicalPath, options.abortSignal);
  }
  if (worker.status === 75) {
    const openResult = invokeConnectableOwnerIfPresent(projectPathResult.canonicalPath, options);
    if (openResult) return openResult;
    return { ok: false, error: { code: "PROJECT_BUSY", message: "Project is already owned by another runtime." } };
  }
  if (worker.error || worker.status === null) {
    if (options.abortSignal?.aborted) return cancelledResult();
    return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
  }
  if (worker.status !== 0 && !isStructuredCliError(worker.stderr)) {
    return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
  }
  if (worker.stdout) process.stdout.write(worker.stdout);
  if (worker.stderr) process.stderr.write(worker.stderr);
  return { forwarded: true, exitCode: worker.status };
}
