import type { Project } from "@/core/Project";
import { finalizeRuntimeCleanup } from "@/core/RuntimeCleanup";
import { AIProjectReferenceStore } from "@/core/service/dataManageService/aiEngine/AIProjectReferenceStore";
import {
  createLiveProjectBuiltInToolRuntimeHost,
  invokeBuiltInTool,
} from "@/core/service/dataManageService/aiEngine/BuiltInToolRegistry";
import { classifyBuiltInToolRuntimeError } from "@/core/service/dataManageService/aiEngine/BuiltInToolRuntimeError";
import type { AIObjectReferenceErrorCode } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { Bridge, events } from "@/platform/desktop";
import { prepareProjectReferences } from "@/core/automation/project-references";
import { getBuiltInToolDefinition } from "@/core/service/data-manage-service/ai-engine/built-in-tool-registry";
import { toast } from "sonner";
import { URI } from "vscode-uri";

type RuntimeResponse =
  | { ok: true; value: unknown }
  | {
      ok: false;
      error: {
        code:
          | "RUNTIME_HOST_UNAVAILABLE"
          | "TOOL_EXECUTION_FAILED"
          | "PROJECT_REFERENCE_SAVE_FAILED"
          | "RUNTIME_CLEANUP_FAILED"
          | "CANCELLED"
          | "PROJECT_SAVE_FAILED"
          | AIObjectReferenceErrorCode;
        message: string;
        details?: { ref: string } | { executionError: { code: string; message: string; details?: unknown } };
      };
    };

const unavailableResponse = (): RuntimeResponse => ({
  ok: false,
  error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
});

const cancelledResponse = (): RuntimeResponse => ({
  ok: false,
  error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." },
});

function failedInvocationResponse(error: unknown, abortSignal: AbortSignal): RuntimeResponse {
  if (abortSignal.aborted) return cancelledResponse();
  const referenceError = classifyBuiltInToolRuntimeError(error);
  return referenceError
    ? { ok: false, error: referenceError }
    : {
        ok: false,
        error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
      };
}

export class OpenProjectRuntimeHost {
  private readonly activeInvocations = new Set<Promise<RuntimeResponse>>();
  private readonly activeAbortControllers = new Set<AbortController>();
  private invocationQueue = Promise.resolve();
  private referencesNeedSave = false;
  private closing = false;

  constructor(private readonly project: Project) {}

  invoke(toolName: string, input: unknown, abortSignal?: AbortSignal): Promise<RuntimeResponse> {
    if (this.closing) return Promise.resolve(unavailableResponse());
    const abortController = new AbortController();
    const abort = () => abortController.abort(abortSignal?.reason);
    if (abortSignal?.aborted) abort();
    else abortSignal?.addEventListener("abort", abort, { once: true });
    this.activeAbortControllers.add(abortController);
    const invocation = this.invocationQueue.then(() =>
      abortController.signal.aborted
        ? cancelledResponse()
        : this.invokeLiveProject(toolName, input, abortController.signal),
    );
    this.invocationQueue = invocation.then(() => undefined);
    this.activeInvocations.add(invocation);
    void invocation.finally(() => {
      abortSignal?.removeEventListener("abort", abort);
      this.activeAbortControllers.delete(abortController);
      this.activeInvocations.delete(invocation);
    });
    return invocation;
  }

  async dispose(): Promise<void> {
    this.closing = true;
    for (const controller of this.activeAbortControllers) controller.abort();
    await Promise.allSettled(this.activeInvocations);
  }

  private async invokeLiveProject(
    toolName: string,
    input: unknown,
    abortSignal: AbortSignal,
  ): Promise<RuntimeResponse> {
    let unsubscribe: (() => void) | undefined;
    let response: RuntimeResponse;
    try {
      if (abortSignal.aborted) return cancelledResponse();
      const references = await prepareProjectReferences(this.project);
      if (abortSignal.aborted) return cancelledResponse();
      const host = createLiveProjectBuiltInToolRuntimeHost(this.project, references);
      unsubscribe = references.subscribe(() => {
        this.referencesNeedSave = true;
      });
      try {
        const value = await invokeBuiltInTool(toolName, input, host, { abortSignal });
        response = { ok: true, value: value === undefined ? null : value };
        const persistence = getBuiltInToolDefinition(toolName)?.persistence;
        if (persistence === "project" || persistence === "project-and-references") {
          try {
            await this.project.save();
          } catch (error) {
            toast.error(`CLI 修改已应用，但保存失败：${String(error)}`);
            response = {
              ok: false,
              error: { code: "PROJECT_SAVE_FAILED", message: `Changes applied but not saved: ${String(error)}` },
            };
          }
        }
      } catch (error) {
        response = failedInvocationResponse(error, abortSignal);
      }
      const after = references.exportSnapshot();
      if (this.referencesNeedSave) {
        try {
          await AIProjectReferenceStore.save(this.project, after);
          this.referencesNeedSave = false;
        } catch {
          response = {
            ok: false,
            error: {
              code: "PROJECT_REFERENCE_SAVE_FAILED",
              message: "Project Object References could not be saved.",
            },
          };
        }
      }
    } catch (error) {
      response = failedInvocationResponse(error, abortSignal);
    }
    return finalizeRuntimeCleanup(response, [() => unsubscribe?.()]);
  }
}

const runtimeHosts = new Map<string, OpenProjectRuntimeHost>();
const bridgeInvocationControllers = new Map<string, AbortController>();
let bridgeListenerPromise: Promise<void> | undefined;
const openingRuntimeProjects = new Map<string, Promise<void>>();

async function ensureRuntimeProject(path: string, allowUpgrade = false): Promise<void> {
  if (runtimeHosts.has(path)) return;
  let pending = openingRuntimeProjects.get(path);
  if (!pending) {
    pending = (async () => {
      const { onOpenFile } = await import("@/core/service/global-menu");
      const project = await onOpenFile(URI.file(path), "CLI", { allowUpgrade });
      if (!project) throw new Error("PROJECT_LOAD_FAILED");
      toast.success(`已通过 CLI 打开工程：${URI.file(path).path.split("/").pop()}`);
    })();
    openingRuntimeProjects.set(path, pending);
    void pending
      .finally(() => openingRuntimeProjects.delete(path))
      .catch((error: unknown) => {
        toast.error(String(error));
      });
  }
  await pending;
}

export function ensureOpenProjectRuntimeBridgeListener(): Promise<void> {
  bridgeListenerPromise ??= Promise.resolve(
    events.projectRuntimeInvocation.on(async (payload) => {
      try {
        if (payload.kind === "cancel") {
          bridgeInvocationControllers.get(payload.requestId)?.abort();
          return;
        }
        const abortController = new AbortController();
        bridgeInvocationControllers.set(payload.requestId, abortController);
        let response: RuntimeResponse;
        try {
          await ensureRuntimeProject(payload.projectPath, payload.allowUpgrade);
          const host = runtimeHosts.get(payload.projectPath);
          response = host
            ? await host.invoke(payload.toolName, payload.input, abortController.signal)
            : unavailableResponse();
        } catch (error) {
          response = { ok: false, error: { code: "TOOL_EXECUTION_FAILED", message: String(error) } };
        } finally {
          bridgeInvocationControllers.delete(payload.requestId);
        }
        const delivered = await Bridge.respond(payload.requestId, response);
        if (!delivered) return;
      } catch (error) {
        window.dispatchEvent(new ErrorEvent("error", { error }));
      }
    }),
  ).then(() => undefined);
  return bridgeListenerPromise;
}

export type OpenProjectRuntimeHostRegistration = {
  rebind(canonicalPath: string): void;
  dispose(): Promise<void>;
};

export function registerOpenProjectRuntimeHost(project: Project): OpenProjectRuntimeHostRegistration {
  const initialCanonicalPath = project.canonicalProjectPath;
  if (!initialCanonicalPath) throw new Error("Open Project Runtime Host requires a canonical Project Path");
  let canonicalPath = initialCanonicalPath;
  const host = new OpenProjectRuntimeHost(project);
  const existingHost = runtimeHosts.get(canonicalPath);
  if (existingHost && existingHost !== host) throw new Error("Open Project Runtime Host already exists for this path");
  runtimeHosts.set(canonicalPath, host);
  return {
    rebind(nextCanonicalPath) {
      if (nextCanonicalPath === canonicalPath) return;
      const nextHost = runtimeHosts.get(nextCanonicalPath);
      if (nextHost && nextHost !== host) throw new Error("Open Project Runtime Host already exists for this path");
      if (runtimeHosts.get(canonicalPath) === host) runtimeHosts.delete(canonicalPath);
      runtimeHosts.set(nextCanonicalPath, host);
      canonicalPath = nextCanonicalPath;
    },
    async dispose() {
      if (runtimeHosts.get(canonicalPath) === host) runtimeHosts.delete(canonicalPath);
      await host.dispose();
    },
  };
}
