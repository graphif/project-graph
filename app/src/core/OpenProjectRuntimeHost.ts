import type { Project } from "@/core/Project";
import { AIProjectReferenceStore } from "@/core/service/dataManageService/aiEngine/AIProjectReferenceStore";
import {
  createLiveProjectBuiltInToolRuntimeHost,
  invokeBuiltInTool,
} from "@/core/service/dataManageService/aiEngine/BuiltInToolRegistry";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type RuntimeInvocation = {
  requestId: string;
  projectPath: string;
  toolName: string;
  input: unknown;
};

type RuntimeResponse =
  | { ok: true; value: unknown }
  | {
      ok: false;
      error: {
        code: "RUNTIME_HOST_UNAVAILABLE" | "TOOL_EXECUTION_FAILED" | "PROJECT_REFERENCE_SAVE_FAILED";
        message: string;
      };
    };

const unavailableResponse = (): RuntimeResponse => ({
  ok: false,
  error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
});

export class OpenProjectRuntimeHost {
  private readonly activeInvocations = new Set<Promise<RuntimeResponse>>();
  private invocationQueue = Promise.resolve();
  private referencesNeedSave = false;
  private closing = false;

  constructor(private readonly project: Project) {}

  invoke(toolName: string, input: unknown): Promise<RuntimeResponse> {
    if (this.closing) return Promise.resolve(unavailableResponse());
    const invocation = this.invocationQueue.then(() => this.invokeLiveProject(toolName, input));
    this.invocationQueue = invocation.then(() => undefined);
    this.activeInvocations.add(invocation);
    void invocation.finally(() => this.activeInvocations.delete(invocation));
    return invocation;
  }

  async dispose(): Promise<void> {
    this.closing = true;
    await Promise.allSettled(this.activeInvocations);
  }

  private async invokeLiveProject(toolName: string, input: unknown): Promise<RuntimeResponse> {
    if (toolName !== "get_all_nodes") {
      return {
        ok: false,
        error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
      };
    }
    try {
      const references = await this.project.aiEngine.prepareProjectReferences(this.project);
      const before = references.exportSnapshot();
      const host = createLiveProjectBuiltInToolRuntimeHost(this.project, references);
      const value = await invokeBuiltInTool(toolName, input, host);
      const after = references.exportSnapshot();
      if (after.entries.length !== before.entries.length) this.referencesNeedSave = true;
      if (this.referencesNeedSave) {
        try {
          await AIProjectReferenceStore.save(this.project.aiEngine.getProjectReferenceStoreUri(this.project), after);
          this.referencesNeedSave = false;
        } catch {
          return {
            ok: false,
            error: {
              code: "PROJECT_REFERENCE_SAVE_FAILED",
              message: "Project Object References could not be saved.",
            },
          };
        }
      }
      return { ok: true, value };
    } catch {
      return {
        ok: false,
        error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
      };
    }
  }
}

const runtimeHosts = new Map<string, OpenProjectRuntimeHost>();
let bridgeListenerPromise: Promise<void> | undefined;

export function ensureOpenProjectRuntimeBridgeListener(): Promise<void> {
  bridgeListenerPromise ??= listen<RuntimeInvocation>("project-runtime-invocation", async ({ payload }) => {
    try {
      const host = runtimeHosts.get(payload.projectPath);
      const response = host ? await host.invoke(payload.toolName, payload.input) : unavailableResponse();
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
