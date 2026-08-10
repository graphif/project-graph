import { spawnSync } from "node:child_process";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Project, ProjectState } from "@/core/Project";
import { FileSystemProviderFile, writeClosedProjectFileAtomically } from "./ClosedProjectFileSystemProvider";
import { ClosedProjectEffects } from "./ClosedProjectEffects";
import { finalizeRuntimeCleanup, RuntimeCleanupError } from "@/core/RuntimeCleanup";
import { compareProjectVersions, LATEST_PROJECT_VERSION, parseProjectFile } from "@/core/ProjectFile";
import {
  AIObjectReferenceRegistry,
  type AIObjectReferenceSnapshot,
} from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import {
  BuiltInToolCapabilityUnavailableError,
  executePreparedBuiltInTool,
  prepareBuiltInToolInvocation,
  type AcquiredBuiltInToolCapabilities,
  type BuiltInToolCapability,
  type BuiltInToolRuntimeHost,
} from "@/core/service/dataManageService/aiEngine/BuiltInToolRegistry";
import { classifyBuiltInToolRuntimeError } from "@/core/service/dataManageService/aiEngine/BuiltInToolRuntimeError";
import { canClosedProjectProvideCapabilities } from "@/core/service/dataManageService/aiEngine/BuiltInToolRuntimeProfiles";
// The serializer registers decorated classes when their modules load.
import "@/core/stage/stageObject/association/LineEdge";
import { StageManager } from "@/core/stage/stageManager/StageManager";
import { deserialize } from "@graphif/serializer";
import { Decoder } from "@msgpack/msgpack";
import { URI } from "vscode-uri";

export type ProjectGraphCliOperationalError =
  | {
      code:
        | "PROJECT_UPGRADE_REQUIRED"
        | "PROJECT_VERSION_UNSUPPORTED"
        | "PROJECT_LOAD_FAILED"
        | "PROJECT_MUST_BE_OPEN"
        | "TOOL_EXECUTION_FAILED"
        | "PROJECT_SAVE_FAILED"
        | "CANCELLED";
      message: string;
    }
  | {
      code: "invalid_ref_format" | "unknown_ref" | "stale_ref" | "wrong_ref_kind";
      message: string;
      details: { ref: string };
    }
  | {
      code: "PROJECT_REFERENCE_SAVE_FAILED";
      message: string;
      details?: { projectSaved: true };
    }
  | {
      code: "RUNTIME_CLEANUP_FAILED";
      message: string;
      details?: {
        executionError: { code: string; message: string; details?: unknown };
      };
    };

export type ClosedProjectInvocationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: ProjectGraphCliOperationalError };

function runtimeCleanupFailed(executionError: {
  code: string;
  message: string;
  details?: unknown;
}): ClosedProjectInvocationResult {
  return {
    ok: false,
    error: {
      code: "RUNTIME_CLEANUP_FAILED",
      message: "Project Runtime Host cleanup failed.",
      details: { executionError },
    },
  };
}

type StoredProjectReferences = {
  version: 1;
  references: AIObjectReferenceSnapshot;
  updatedAt: number;
};

type ServiceConstructor = { id?: string; new (...args: any[]): any };
type ClosedProjectModuleLoader = (id: string) => Promise<Record<string, unknown>>;

const closedProjectCapabilityServices: Partial<
  Record<BuiltInToolCapability, readonly { moduleId: string; exportName: string }[]>
> = {
  history: [{ moduleId: "/src/core/stage/stageManager/StageHistoryManager.tsx", exportName: "HistoryManager" }],
  delete: [
    { moduleId: "/src/core/stage/stageManager/basicMethods/SectionMethods.tsx", exportName: "SectionMethods" },
    {
      moduleId: "/src/core/stage/stageManager/concreteMethods/StageSectionInOutManager.tsx",
      exportName: "SectionInOutManager",
    },
    {
      moduleId: "/src/core/stage/stageManager/concreteMethods/StageSyncAssociationManager.tsx",
      exportName: "StageSyncAssociationManager",
    },
    {
      moduleId: "/src/core/stage/stageManager/concreteMethods/StageDeleteManager.tsx",
      exportName: "DeleteManager",
    },
  ],
  text: [
    { moduleId: "/src/core/render/canvas2d/basicRenderer/textRenderer.tsx", exportName: "TextRenderer" },
    {
      moduleId: "/src/core/stage/stageManager/concreteMethods/StageSyncAssociationManager.tsx",
      exportName: "StageSyncAssociationManager",
    },
  ],
  graph: [{ moduleId: "/src/core/stage/stageManager/basicMethods/GraphMethods.tsx", exportName: "GraphMethods" }],
  layout: [
    {
      moduleId: "/src/core/stage/stageManager/concreteMethods/StageEntityMoveManager.tsx",
      exportName: "EntityMoveManager",
    },
    { moduleId: "/src/core/service/controlService/autoLayoutEngine/mainTick.tsx", exportName: "AutoLayout" },
  ],
  "tree-import": [
    {
      moduleId: "/src/core/stage/stageManager/concreteMethods/StageEntityMoveManager.tsx",
      exportName: "EntityMoveManager",
    },
    {
      moduleId: "/src/core/service/controlService/autoLayoutEngine/autoLayoutFastTreeMode.tsx",
      exportName: "AutoLayoutFastTree",
    },
    {
      moduleId: "/src/core/service/dataGenerateService/stageImportEngine/stageImportEngine.tsx",
      exportName: "StageImport",
    },
  ],
  "node-connect": [
    {
      moduleId: "/src/core/stage/stageManager/concreteMethods/StageNodeConnector.tsx",
      exportName: "NodeConnector",
    },
  ],
};

function loadServiceOnce(project: Project, service: ServiceConstructor): void {
  if (!service.id || !project.getService(service.id as keyof Project & string)) project.loadService(service);
}

async function loadClosedProjectCapability(
  project: Project,
  capability: BuiltInToolCapability,
  loadModule: ClosedProjectModuleLoader,
): Promise<void> {
  if (capability === "effects") loadServiceOnce(project, ClosedProjectEffects);
  for (const service of closedProjectCapabilityServices[capability] ?? []) {
    const loaded = (await loadModule(service.moduleId))[service.exportName];
    if (typeof loaded !== "function") throw new Error(`Closed Project service is unavailable: ${service.exportName}`);
    loadServiceOnce(project, loaded as ServiceConstructor);
  }
}

function projectReferenceStorePath(): string {
  return (
    process.env.PROJECT_GRAPH_REFERENCE_STORE_PATH ??
    join(homedir(), "Library", "Application Support", "liren.project-graph", "ai-project-references.json")
  );
}

function projectReferenceKey(canonicalPath: string): string {
  return `project:${URI.file(canonicalPath).toString()}:references`;
}

async function readReferenceStore(path = projectReferenceStorePath()): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid reference store");
    return value as Record<string, unknown>;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}

function parseStoredReferences(value: unknown): AIObjectReferenceSnapshot | null {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object") throw new Error("Invalid Project Object Reference snapshot");
  const stored = value as Partial<StoredProjectReferences>;
  const references = stored.references as Partial<AIObjectReferenceSnapshot> | undefined;
  if (
    stored.version !== 1 ||
    typeof stored.updatedAt !== "number" ||
    !references ||
    !Array.isArray(references.entries) ||
    !Number.isInteger(references.nextNodeRef) ||
    (references.nextNodeRef ?? 0) < 1 ||
    !Number.isInteger(references.nextEdgeRef) ||
    (references.nextEdgeRef ?? 0) < 1
  ) {
    throw new Error("Invalid Project Object Reference snapshot");
  }
  return references as AIObjectReferenceSnapshot;
}

async function saveReferences(canonicalPath: string, references: AIObjectReferenceSnapshot): Promise<void> {
  const path = projectReferenceStorePath();
  await mkdir(dirname(path), { recursive: true });
  const lock = await open(`${path}.lock`, "a+");
  try {
    const acquired = spawnSync("/usr/bin/lockf", ["-s", "3"], {
      stdio: ["ignore", "ignore", "ignore", lock.fd],
    });
    if (acquired.error || acquired.status !== 0) {
      throw acquired.error ?? new Error("Project Object Reference store lock could not be acquired");
    }
    const store = await readReferenceStore(path);
    store[projectReferenceKey(canonicalPath)] = {
      version: 1,
      references,
      updatedAt: Date.now(),
    } satisfies StoredProjectReferences;
    await writeClosedProjectFileAtomically(path, JSON.stringify(store));
  } finally {
    await lock.close();
  }
}

function createClosedProject(
  parsed: Awaited<ReturnType<typeof parseProjectFile>>,
  attachments: Map<string, Blob>,
  canonicalPath: string,
): {
  project: Project;
  dispose(): Promise<void>;
} {
  const project = new Project(URI.file(canonicalPath));
  project.registerFileSystemProvider("file", FileSystemProviderFile);
  project.attachments = attachments;
  project.tags = parsed.tags;
  project.references = parsed.references;
  project.metadata = parsed.metadata;
  project.readme = parsed.readme;
  project.stage = deserialize(parsed.serializedStageObjects, project);
  project.loadService(StageManager);
  project.stageManager.updateReferences();
  project.projectState = ProjectState.Saved;
  return {
    project,
    async dispose() {
      await project.dispose();
      project.stage.length = 0;
    },
  };
}

function createClosedProjectRuntimeHost(
  project: Project,
  references: AIObjectReferenceRegistry,
  loadModule: ClosedProjectModuleLoader,
  beforeExecutorInvoke?: () => void | Promise<void>,
): BuiltInToolRuntimeHost {
  return {
    beforeExecutorInvoke,
    canProvideCapabilities: canClosedProjectProvideCapabilities,
    async acquireCapabilities(capabilities, context): Promise<AcquiredBuiltInToolCapabilities> {
      const acquired: Record<string, unknown> = {};
      for (const capability of capabilities) {
        if (capability === "project") acquired.project = project;
        else if (capability === "references") acquired.references = references;
        else if (capability === "abort-signal") acquired[capability] = context.abortSignal;
        else {
          await loadClosedProjectCapability(project, capability, loadModule);
          acquired[capability] = true;
        }
      }
      return acquired as AcquiredBuiltInToolCapabilities;
    },
  };
}

type ClosedProjectLifecycle = {
  attachments: Map<string, Blob>;
  disposeProject?: () => Promise<void>;
};

async function executeClosedProjectTool(
  options: {
    toolName: string;
    input: unknown;
    canonicalPath: string;
    allowUpgrade: boolean;
    abortSignal?: AbortSignal;
  },
  loadModule: ClosedProjectModuleLoader,
  lifecycle: ClosedProjectLifecycle,
): Promise<ClosedProjectInvocationResult> {
  const { attachments } = lifecycle;
  let prepared;
  try {
    prepared = prepareBuiltInToolInvocation(options.toolName, options.input, canClosedProjectProvideCapabilities);
  } catch (error) {
    if (error instanceof BuiltInToolCapabilityUnavailableError) {
      return {
        ok: false,
        error: { code: "PROJECT_MUST_BE_OPEN", message: "This tool requires a matching Open Project." },
      };
    }
    return { ok: false, error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." } };
  }
  let parsed;
  try {
    parsed = await parseProjectFile(new Uint8Array(await readFile(options.canonicalPath)), new Decoder(), attachments);
  } catch {
    return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
  }

  const versionComparison = compareProjectVersions(parsed.metadata.version, LATEST_PROJECT_VERSION);
  if (versionComparison > 0) {
    return {
      ok: false,
      error: {
        code: "PROJECT_VERSION_UNSUPPORTED",
        message: "Project version is newer than this Project Graph runtime.",
      },
    };
  }
  if (versionComparison < 0 && !options.allowUpgrade) {
    return {
      ok: false,
      error: { code: "PROJECT_UPGRADE_REQUIRED", message: "Project must be upgraded before it can be invoked." },
    };
  }
  if (versionComparison < 0) {
    try {
      const { ProjectUpgrader } = await import("@/core/stage/ProjectUpgrader");
      [parsed.serializedStageObjects, parsed.metadata] = ProjectUpgrader.upgradeNAnyToNLatest(
        parsed.serializedStageObjects,
        parsed.metadata,
      );
    } catch {
      return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
    }
  }

  const loadedProject = createClosedProject(parsed, attachments, options.canonicalPath);
  const project = loadedProject.project;
  lifecycle.disposeProject = loadedProject.dispose;
  let pendingReferenceSnapshot: AIObjectReferenceSnapshot | undefined;
  const references = new AIObjectReferenceRegistry(project, (snapshot) => {
    pendingReferenceSnapshot = snapshot;
  });
  try {
    const storedReferences = parseStoredReferences(
      (await readReferenceStore())[projectReferenceKey(options.canonicalPath)],
    );
    if (storedReferences) references.restoreSnapshot(storedReferences);
  } catch {
    return { ok: false, error: { code: "PROJECT_LOAD_FAILED", message: "Project file could not be loaded." } };
  }

  const executorReadyPath = process.env.PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH;
  let value: unknown;
  if (options.abortSignal?.aborted) {
    return { ok: false, error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." } };
  }
  try {
    value = await executePreparedBuiltInTool(
      prepared,
      createClosedProjectRuntimeHost(
        project,
        references,
        loadModule,
        executorReadyPath ? () => writeFile(executorReadyPath, process.hrtime.bigint().toString()) : undefined,
      ),
      { abortSignal: options.abortSignal },
    );
  } catch (error) {
    if (options.abortSignal?.aborted) {
      return { ok: false, error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." } };
    }
    const referenceError = classifyBuiltInToolRuntimeError(error);
    if (referenceError) return { ok: false, error: referenceError };
    return { ok: false, error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." } };
  }
  if (options.abortSignal?.aborted) {
    return { ok: false, error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." } };
  }

  let projectSaved = false;
  if (project.projectState === ProjectState.Unsaved) {
    try {
      await project.save({ includeThumbnail: false });
      projectSaved = true;
    } catch (error) {
      if (error instanceof RuntimeCleanupError) {
        return runtimeCleanupFailed({ code: "PROJECT_SAVE_FAILED", message: "Project could not be saved." });
      }
      return { ok: false, error: { code: "PROJECT_SAVE_FAILED", message: "Project could not be saved." } };
    }
  }
  if (!projectSaved && options.abortSignal?.aborted) {
    return { ok: false, error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." } };
  }

  if (pendingReferenceSnapshot) {
    try {
      await saveReferences(options.canonicalPath, pendingReferenceSnapshot);
    } catch (error) {
      if (error instanceof RuntimeCleanupError) {
        return runtimeCleanupFailed({
          code: "PROJECT_REFERENCE_SAVE_FAILED",
          message: "Project Object References could not be saved.",
          ...(projectSaved ? { details: { projectSaved: true as const } } : {}),
        });
      }
      return {
        ok: false,
        error: {
          code: "PROJECT_REFERENCE_SAVE_FAILED",
          message: "Project Object References could not be saved.",
          ...(projectSaved ? { details: { projectSaved: true as const } } : {}),
        },
      };
    }
  }
  return { ok: true, value };
}

export async function invokeClosedProjectTool(
  options: {
    toolName: string;
    input: unknown;
    canonicalPath: string;
    allowUpgrade: boolean;
    abortSignal?: AbortSignal;
  },
  loadModule: ClosedProjectModuleLoader,
): Promise<ClosedProjectInvocationResult> {
  const lifecycle: ClosedProjectLifecycle = { attachments: new Map() };
  let result: ClosedProjectInvocationResult;
  try {
    result = await executeClosedProjectTool(options, loadModule, lifecycle);
  } catch {
    result = { ok: false, error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." } };
  }
  return finalizeRuntimeCleanup(result, [
    async () => lifecycle.disposeProject?.(),
    () => lifecycle.attachments.clear(),
  ]);
}
