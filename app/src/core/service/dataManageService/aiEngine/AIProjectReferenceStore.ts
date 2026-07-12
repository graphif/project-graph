import type { AIObjectReferenceSnapshot } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { LazyStore } from "@tauri-apps/plugin-store";

type StoredAIProjectReferences = {
  version: 1;
  references: AIObjectReferenceSnapshot;
  updatedAt: number;
};

const store = new LazyStore("ai-project-references.json");
let initPromise: Promise<void> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

async function getStore(): Promise<LazyStore> {
  initPromise ??= store.init();
  await initPromise;
  return store;
}

function getProjectKey(projectUri: string): string {
  return `project:${projectUri}:references`;
}

function isStoredProjectReferences(value: unknown): value is StoredAIProjectReferences {
  if (!value || typeof value !== "object") return false;
  const stored = value as Partial<StoredAIProjectReferences>;
  const references = stored.references as Partial<AIObjectReferenceSnapshot> | undefined;
  return (
    stored.version === 1 &&
    typeof stored.updatedAt === "number" &&
    !!references &&
    Array.isArray(references.entries) &&
    typeof references.nextNodeRef === "number" &&
    Number.isInteger(references.nextNodeRef) &&
    references.nextNodeRef >= 1 &&
    typeof references.nextEdgeRef === "number" &&
    Number.isInteger(references.nextEdgeRef) &&
    references.nextEdgeRef >= 1
  );
}

export namespace AIProjectReferenceStore {
  export async function load(projectUri: string): Promise<AIObjectReferenceSnapshot | null> {
    const initializedStore = await getStore();
    const value = await initializedStore.get<unknown>(getProjectKey(projectUri));
    if (value === undefined || value === null) return null;
    if (!isStoredProjectReferences(value)) throw new Error("保存的 AI 项目引用格式无效");
    return value.references;
  }

  export async function save(projectUri: string, references: AIObjectReferenceSnapshot): Promise<void> {
    const result = writeQueue.then(
      async () => {
        const initializedStore = await getStore();
        await initializedStore.set(getProjectKey(projectUri), {
          version: 1,
          references,
          updatedAt: Date.now(),
        } satisfies StoredAIProjectReferences);
        await initializedStore.save();
      },
      async () => {
        const initializedStore = await getStore();
        await initializedStore.set(getProjectKey(projectUri), {
          version: 1,
          references,
          updatedAt: Date.now(),
        } satisfies StoredAIProjectReferences);
        await initializedStore.save();
      },
    );
    writeQueue = result;
    return result;
  }
}
