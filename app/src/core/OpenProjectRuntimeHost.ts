import type { Project } from "@/core/Project";
import { finalizeRuntimeCleanup } from "@/core/RuntimeCleanup";
import { AIProjectReferenceStore } from "@/core/service/dataManageService/aiEngine/AIProjectReferenceStore";
import {
  createLiveProjectBuiltInToolRuntimeHost,
  invokeBuiltInTool,
} from "@/core/service/dataManageService/aiEngine/BuiltInToolRegistry";
import { classifyBuiltInToolRuntimeError } from "@/core/service/dataManageService/aiEngine/BuiltInToolRuntimeError";
import type { AIObjectReferenceErrorCode } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type RuntimeInvocation =
  | {
      kind?: "invoke";
      requestId: string;
      projectPath: string;
      toolName: string;
      input: unknown;
    }
  | { kind: "cancel"; requestId: string };

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
      const references = await this.project.aiEngine.prepareProjectReferences(this.project);
      if (abortSignal.aborted) return cancelledResponse();
      const host = createLiveProjectBuiltInToolRuntimeHost(this.project, references);
      unsubscribe = references.subscribe(() => {
        this.referencesNeedSave = true;
      });
      try {
        const value = await invokeBuiltInTool(toolName, input, host, { abortSignal });
        response = abortSignal.aborted ? cancelledResponse() : { ok: true, value: value === undefined ? null : value };
      } catch (error) {
        const referenceError = classifyBuiltInToolRuntimeError(error);
        response = abortSignal.aborted
          ? cancelledResponse()
          : referenceError
            ? { ok: false, error: referenceError }
            : {
                ok: false,
                error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
              };
      }
      const after = references.exportSnapshot();
      if (this.referencesNeedSave) {
        try {
          await AIProjectReferenceStore.save(this.project.aiEngine.getProjectReferenceStoreUri(this.project), after);
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
      const referenceError = classifyBuiltInToolRuntimeError(error);
      response = abortSignal.aborted
        ? cancelledResponse()
        : referenceError
          ? { ok: false, error: referenceError }
          : {
              ok: false,
              error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
            };
    }
    return finalizeRuntimeCleanup(response, [() => unsubscribe?.()]);
  }
}

const runtimeHosts = new Map<string, OpenProjectRuntimeHost>();
const bridgeInvocationControllers = new Map<string, AbortController>();
let bridgeListenerPromise: Promise<void> | undefined;

export function ensureOpenProjectRuntimeBridgeListener(): Promise<void> {
  bridgeListenerPromise ??= listen<RuntimeInvocation>("project-runtime-invocation", async ({ payload }) => {
    try {
      if (payload.kind === "cancel") {
        bridgeInvocationControllers.get(payload.requestId)?.abort();
        return;
      }
      const host = runtimeHosts.get(payload.projectPath);
      const abortController = new AbortController();
      bridgeInvocationControllers.set(payload.requestId, abortController);
      let response: RuntimeResponse;
      try {
        response = host
          ? await host.invoke(payload.toolName, payload.input, abortController.signal)
          : unavailableResponse();
      } finally {
        bridgeInvocationControllers.delete(payload.requestId);
      }
      const delivered = await invoke<boolean>("respond_project_runtime_bridge", {
        requestId: payload.requestId,
        response,
      });
      if (!delivered) return;
    } catch (error) {
      window.dispatchEvent(new ErrorEvent("error", { error }));
    }
  }).then(() => undefined);
  return bridgeListenerPromise;
}

export function registerOpenProjectRuntimeHost(project: Project): { dispose(): Promise<void> } {
  const canonicalPath = project.canonicalProjectPath;
  if (!canonicalPath) throw new Error("Open Project Runtime Host requires a canonical Project Path");
  const host = new OpenProjectRuntimeHost(project);
  runtimeHosts.set(canonicalPath, host);
  return {
    async dispose() {
      if (runtimeHosts.get(canonicalPath) === host) runtimeHosts.delete(canonicalPath);
      await host.dispose();
    },
  };
}
