import type { AIObjectReferenceSnapshot } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { invoke } from "@tauri-apps/api/core";

let writeQueue: Promise<void> = Promise.resolve();

function isAIObjectReferenceSnapshot(value: unknown): value is AIObjectReferenceSnapshot {
  if (!value || typeof value !== "object") return false;
  const references = value as Partial<AIObjectReferenceSnapshot>;
  return (
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
    const value = await invoke<unknown>("load_project_reference_snapshot", { projectUri });
    if (value === undefined || value === null) return null;
    if (!isAIObjectReferenceSnapshot(value)) throw new Error("保存的 AI 项目引用格式无效");
    return value;
  }

  export async function save(projectUri: string, references: AIObjectReferenceSnapshot): Promise<void> {
    const result = writeQueue.then(
      () => invoke<void>("save_project_reference_snapshot", { projectUri, references }),
      () => invoke<void>("save_project_reference_snapshot", { projectUri, references }),
    );
    writeQueue = result;
    return result;
  }
}
