import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Project } from "@/core/Project";
import { compareProjectVersions, LATEST_PROJECT_VERSION, parseProjectFile } from "@/core/ProjectFile";
import {
  AIObjectReferenceRegistry,
  type AIObjectReferenceSnapshot,
} from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import {
  invokeBuiltInTool,
  type AcquiredBuiltInToolCapabilities,
  type BuiltInToolCapability,
  type BuiltInToolRuntimeHost,
} from "@/core/service/dataManageService/aiEngine/BuiltInToolRegistry";
// The serializer registers decorated classes when their modules load.
import "@/core/stage/stageObject/association/LineEdge";
import type { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { deserialize } from "@graphif/serializer";
import { Decoder } from "@msgpack/msgpack";
import { URI } from "vscode-uri";

export type ProjectGraphCliOperationalError = {
  code:
    | "PROJECT_UPGRADE_REQUIRED"
    | "PROJECT_VERSION_UNSUPPORTED"
    | "PROJECT_LOAD_FAILED"
    | "TOOL_EXECUTION_FAILED"
    | "PROJECT_REFERENCE_SAVE_FAILED";
  message: string;
};

export type ClosedProjectInvocationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: ProjectGraphCliOperationalError };

type StoredProjectReferences = {
  version: 1;
  references: AIObjectReferenceSnapshot;
  updatedAt: number;
};

const supportedCapabilities = new Set<BuiltInToolCapability>(["project", "references", "dom", "image", "settings"]);

type ClosedReadProject = Pick<
  Project,
  "attachments" | "tags" | "references" | "metadata" | "readme" | "uri" | "stage"
> & {
  stageManager: Pick<Project["stageManager"], "get">;
};

function projectReferenceStorePath(): string {
  return (
    process.env.PROJECT_GRAPH_REFERENCE_STORE_PATH ??
    join(homedir(), "Library", "Application Support", "liren.project-graph", "ai-project-references.json")
  );
}

function projectReferenceKey(canonicalPath: string): string {
  return `project:${URI.file(canonicalPath).toString()}:references`;
}

async function readReferenceStore(): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(await readFile(projectReferenceStorePath(), "utf8"));
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
  const store = await readReferenceStore();
  store[projectReferenceKey(canonicalPath)] = {
    version: 1,
    references,
    updatedAt: Date.now(),
  } satisfies StoredProjectReferences;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store));
}

function createClosedReadProject(
  parsed: Awaited<ReturnType<typeof parseProjectFile>>,
  attachments: Map<string, Blob>,
  canonicalPath: string,
): {
  project: ClosedReadProject;
  dispose(): void;
} {
  let stage: StageObject[] | undefined;
  const project: ClosedReadProject = {
    attachments,
    tags: parsed.tags,
    references: parsed.references,
    metadata: parsed.metadata,
    readme: parsed.readme,
    uri: URI.file(canonicalPath),
    get stage() {
      stage ??= deserialize(parsed.serializedStageObjects, project) as StageObject[];
      return stage;
    },
    stageManager: {
      get(uuid: string) {
        return project.stage.find((object) => object.uuid === uuid);
      },
    },
  };
  return {
    project,
    dispose() {
      if (stage) stage.length = 0;
    },
  };
}

function createGetAllNodesRuntimeHost(
  project: ClosedReadProject,
  references: AIObjectReferenceRegistry,
  beforeExecutorInvoke?: () => void | Promise<void>,
): BuiltInToolRuntimeHost {
  return {
    beforeExecutorInvoke,
    acquireCapabilities(capabilities): AcquiredBuiltInToolCapabilities {
      if (capabilities.some((capability) => !supportedCapabilities.has(capability))) {
        throw new Error("The closed Project Runtime Host cannot provide all declared capabilities for this tool");
      }
      const acquired: Record<string, unknown> = {};
      for (const capability of capabilities) {
        if (capability === "project") acquired.project = project;
        else if (capability === "references") acquired.references = references;
        else if (capability === "dom" || capability === "image" || capability === "settings") {
          acquired[capability] = true;
        }
      }
      return acquired as AcquiredBuiltInToolCapabilities;
    },
  };
}

export async function invokeClosedProjectTool(options: {
  toolName: string;
  input: unknown;
  canonicalPath: string;
  allowUpgrade: boolean;
}): Promise<ClosedProjectInvocationResult> {
  const attachments = new Map<string, Blob>();
  let project: ClosedReadProject | undefined;
  let disposeProject: (() => void) | undefined;
  try {
    let parsed;
    try {
      parsed = await parseProjectFile(
        new Uint8Array(await readFile(options.canonicalPath)),
        new Decoder(),
        attachments,
      );
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

    const loadedProject = createClosedReadProject(parsed, attachments, options.canonicalPath);
    project = loadedProject.project;
    disposeProject = loadedProject.dispose;
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
    try {
      value = await invokeBuiltInTool(
        options.toolName,
        options.input,
        createGetAllNodesRuntimeHost(
          project,
          references,
          executorReadyPath ? () => writeFile(executorReadyPath, process.hrtime.bigint().toString()) : undefined,
        ),
      );
    } catch {
      return { ok: false, error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." } };
    }

    if (pendingReferenceSnapshot) {
      try {
        await saveReferences(options.canonicalPath, pendingReferenceSnapshot);
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
  } finally {
    disposeProject?.();
    attachments.clear();
  }
}
