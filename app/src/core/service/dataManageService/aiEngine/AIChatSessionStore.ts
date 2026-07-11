import type { AIMessageMetadata } from "@/core/service/dataManageService/aiEngine/AIEngine";
import type { AIObjectReferenceSnapshot } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { LazyStore } from "@tauri-apps/plugin-store";
import type { UIMessage } from "ai";

export type StoredAIChatSession = {
  version: 1;
  messages: UIMessage<AIMessageMetadata>[];
  references: AIObjectReferenceSnapshot;
  updatedAt: number;
};

const store = new LazyStore("ai-chat-sessions.json");
let initPromise: Promise<void> | undefined;

async function getStore(): Promise<LazyStore> {
  initPromise ??= store.init();
  await initPromise;
  return store;
}

function getProjectKey(projectUri: string): string {
  return `project:${projectUri}`;
}

function isStoredAIChatSession(value: unknown): value is StoredAIChatSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredAIChatSession>;
  const references = session.references as Partial<AIObjectReferenceSnapshot> | undefined;
  return (
    session.version === 1 &&
    Array.isArray(session.messages) &&
    typeof session.updatedAt === "number" &&
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

export namespace AIChatSessionStore {
  export async function load(projectUri: string): Promise<StoredAIChatSession | null> {
    const initializedStore = await getStore();
    const value = await initializedStore.get<unknown>(getProjectKey(projectUri));
    if (value === undefined || value === null) return null;
    if (!isStoredAIChatSession(value)) {
      throw new Error("保存的AI会话格式无效");
    }
    return value;
  }

  export async function save(
    projectUri: string,
    messages: UIMessage<AIMessageMetadata>[],
    references: AIObjectReferenceSnapshot,
  ): Promise<void> {
    const initializedStore = await getStore();
    await initializedStore.set(getProjectKey(projectUri), {
      version: 1,
      messages,
      references,
      updatedAt: Date.now(),
    } satisfies StoredAIChatSession);
    await initializedStore.save();
  }
}
