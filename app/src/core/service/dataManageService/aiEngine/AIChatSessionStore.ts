import type { AIMessageMetadata } from "@/core/service/dataManageService/aiEngine/AIEngine";
import type { AIChatSessionMemory } from "@/core/service/dataManageService/aiEngine/AIChatSessionMemory";
import { LazyStore } from "@tauri-apps/plugin-store";
import type { UIMessage } from "ai";

export type AIChatSessionSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
};

export type AIChatSessionIndex = {
  version: 1;
  activeSessionId: string;
  sessions: AIChatSessionSummary[];
};

export type StoredAIChatSession = {
  version: 1;
  id: string;
  title: string;
  titleManuallyEdited: boolean;
  messages: UIMessage<AIMessageMetadata>[];
  memory?: AIChatSessionMemory;
  createdAt: number;
  updatedAt: number;
};

export type AIChatSessionProjectState = {
  index: AIChatSessionIndex;
  activeSession: StoredAIChatSession;
};

const DEFAULT_SESSION_TITLE = "新会话";
const store = new LazyStore("ai-chat-sessions.json");
let initPromise: Promise<void> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

async function getStore(): Promise<LazyStore> {
  initPromise ??= store.init();
  await initPromise;
  return store;
}

function enqueueWrite<T>(operation: (initializedStore: LazyStore) => Promise<T>): Promise<T> {
  const result = writeQueue.then(
    async () => operation(await getStore()),
    async () => operation(await getStore()),
  );
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function getIndexKey(projectUri: string): string {
  return `project:${projectUri}:session-index`;
}

function getSessionKey(projectUri: string, sessionId: string): string {
  return `project:${projectUri}:session:${sessionId}`;
}

function isSessionSummary(value: unknown): value is AIChatSessionSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Partial<AIChatSessionSummary>;
  return (
    typeof summary.id === "string" &&
    summary.id.length > 0 &&
    typeof summary.title === "string" &&
    typeof summary.createdAt === "number" &&
    typeof summary.updatedAt === "number" &&
    typeof summary.messageCount === "number" &&
    Number.isInteger(summary.messageCount) &&
    summary.messageCount >= 0
  );
}

function isSessionIndex(value: unknown): value is AIChatSessionIndex {
  if (!value || typeof value !== "object") return false;
  const index = value as Partial<AIChatSessionIndex>;
  return (
    index.version === 1 &&
    typeof index.activeSessionId === "string" &&
    index.activeSessionId.length > 0 &&
    Array.isArray(index.sessions) &&
    index.sessions.length > 0 &&
    index.sessions.every(isSessionSummary) &&
    index.sessions.some((session) => session.id === index.activeSessionId)
  );
}

function isStoredSession(value: unknown): value is StoredAIChatSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredAIChatSession>;
  return (
    session.version === 1 &&
    typeof session.id === "string" &&
    session.id.length > 0 &&
    typeof session.title === "string" &&
    typeof session.titleManuallyEdited === "boolean" &&
    Array.isArray(session.messages) &&
    (session.memory === undefined || isSessionMemory(session.memory)) &&
    typeof session.createdAt === "number" &&
    typeof session.updatedAt === "number"
  );
}

function isSessionMemory(value: unknown): value is AIChatSessionMemory {
  if (!value || typeof value !== "object") return false;
  const memory = value as Partial<AIChatSessionMemory>;
  return (
    typeof memory.summary === "string" &&
    memory.summary.trim().length > 0 &&
    typeof memory.coveredMessageCount === "number" &&
    Number.isInteger(memory.coveredMessageCount) &&
    memory.coveredMessageCount > 0
  );
}

function createEmptySession(): StoredAIChatSession {
  const now = Date.now();
  return {
    version: 1,
    id: crypto.randomUUID(),
    title: DEFAULT_SESSION_TITLE,
    titleManuallyEdited: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function toSummary(session: StoredAIChatSession): AIChatSessionSummary {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
  };
}

function replaceSummary(index: AIChatSessionIndex, session: StoredAIChatSession): AIChatSessionIndex {
  return {
    ...index,
    sessions: index.sessions
      .map((summary) => (summary.id === session.id ? toSummary(session) : summary))
      .sort((left, right) => right.updatedAt - left.updatedAt),
  };
}

function extractText(message: UIMessage<AIMessageMetadata>): string {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join(" ");
}

function createAutomaticTitle(messages: UIMessage<AIMessageMetadata>[]): string | undefined {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return undefined;
  const title = extractText(firstUserMessage)
    .replace(/^\[selected:\s+(?:[ne]\d+\s*)+\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return undefined;
  return title.length > 36 ? `${title.slice(0, 36)}…` : title;
}

async function readIndex(initializedStore: LazyStore, projectUri: string): Promise<AIChatSessionIndex | null> {
  const value = await initializedStore.get<unknown>(getIndexKey(projectUri));
  if (value === undefined || value === null) return null;
  if (!isSessionIndex(value)) throw new Error("保存的 AI 会话索引格式无效");
  return value;
}

async function readRequiredSession(
  initializedStore: LazyStore,
  projectUri: string,
  sessionId: string,
): Promise<StoredAIChatSession> {
  const value = await initializedStore.get<unknown>(getSessionKey(projectUri, sessionId));
  if (!isStoredSession(value) || value.id !== sessionId) throw new Error("保存的 AI 会话格式无效");
  return value;
}

export namespace AIChatSessionStore {
  export async function initializeProject(projectUri: string): Promise<AIChatSessionProjectState> {
    return enqueueWrite(async (initializedStore) => {
      const existingIndex = await readIndex(initializedStore, projectUri);
      if (existingIndex) {
        return {
          index: existingIndex,
          activeSession: await readRequiredSession(initializedStore, projectUri, existingIndex.activeSessionId),
        };
      }

      const activeSession = createEmptySession();
      const index: AIChatSessionIndex = {
        version: 1,
        activeSessionId: activeSession.id,
        sessions: [toSummary(activeSession)],
      };
      await initializedStore.set(getSessionKey(projectUri, activeSession.id), activeSession);
      await initializedStore.set(getIndexKey(projectUri), index);
      await initializedStore.save();
      return { index, activeSession };
    });
  }

  export async function loadSession(projectUri: string, sessionId: string): Promise<StoredAIChatSession> {
    const initializedStore = await getStore();
    return readRequiredSession(initializedStore, projectUri, sessionId);
  }

  export async function getSessionMemory(
    projectUri: string,
    sessionId: string,
  ): Promise<AIChatSessionMemory | undefined> {
    return (await loadSession(projectUri, sessionId)).memory;
  }

  export async function setSessionMemory(
    projectUri: string,
    sessionId: string,
    memory: AIChatSessionMemory,
  ): Promise<void> {
    if (!isSessionMemory(memory)) throw new Error("AI 会话记忆格式无效");
    await enqueueWrite(async (initializedStore) => {
      const index = await readIndex(initializedStore, projectUri);
      if (!index || !index.sessions.some((session) => session.id === sessionId)) {
        throw new Error("指定的 AI 会话不存在");
      }
      const current = await readRequiredSession(initializedStore, projectUri, sessionId);
      const savedSession: StoredAIChatSession = {
        ...current,
        memory,
        updatedAt: Date.now(),
      };
      await initializedStore.set(getSessionKey(projectUri, sessionId), savedSession);
      await initializedStore.set(getIndexKey(projectUri), replaceSummary(index, savedSession));
      await initializedStore.save();
    });
  }

  export async function createSession(projectUri: string): Promise<AIChatSessionProjectState> {
    return enqueueWrite(async (initializedStore) => {
      const index = await readIndex(initializedStore, projectUri);
      if (!index) throw new Error("AI 会话索引尚未初始化");
      const activeSession = createEmptySession();
      const nextIndex: AIChatSessionIndex = {
        ...index,
        activeSessionId: activeSession.id,
        sessions: [toSummary(activeSession), ...index.sessions],
      };
      await initializedStore.set(getSessionKey(projectUri, activeSession.id), activeSession);
      await initializedStore.set(getIndexKey(projectUri), nextIndex);
      await initializedStore.save();
      return { index: nextIndex, activeSession };
    });
  }

  export async function saveSession(
    projectUri: string,
    sessionId: string,
    messages: UIMessage<AIMessageMetadata>[],
  ): Promise<AIChatSessionProjectState> {
    return enqueueWrite(async (initializedStore) => {
      const index = await readIndex(initializedStore, projectUri);
      if (!index) throw new Error("AI 会话索引尚未初始化");
      if (!index.sessions.some((summary) => summary.id === sessionId)) throw new Error("指定的 AI 会话不存在");
      const current = await readRequiredSession(initializedStore, projectUri, sessionId);
      const automaticTitle = current.titleManuallyEdited ? undefined : createAutomaticTitle(messages);
      const savedSession: StoredAIChatSession = {
        ...current,
        title: automaticTitle ?? current.title,
        messages,
        updatedAt: Date.now(),
      };
      const nextIndex = replaceSummary(index, savedSession);
      await initializedStore.set(getSessionKey(projectUri, sessionId), savedSession);
      await initializedStore.set(getIndexKey(projectUri), nextIndex);
      await initializedStore.save();
      const activeSession =
        nextIndex.activeSessionId === sessionId
          ? savedSession
          : await readRequiredSession(initializedStore, projectUri, nextIndex.activeSessionId);
      return { index: nextIndex, activeSession };
    });
  }

  export async function setActiveSession(projectUri: string, sessionId: string): Promise<AIChatSessionProjectState> {
    return enqueueWrite(async (initializedStore) => {
      const index = await readIndex(initializedStore, projectUri);
      if (!index || !index.sessions.some((session) => session.id === sessionId)) {
        throw new Error("指定的 AI 会话不存在");
      }
      const activeSession = await readRequiredSession(initializedStore, projectUri, sessionId);
      const nextIndex = { ...index, activeSessionId: sessionId };
      await initializedStore.set(getIndexKey(projectUri), nextIndex);
      await initializedStore.save();
      return { index: nextIndex, activeSession };
    });
  }

  export async function renameSession(
    projectUri: string,
    sessionId: string,
    title: string,
  ): Promise<AIChatSessionProjectState> {
    const normalizedTitle = title.replace(/\s+/g, " ").trim();
    if (!normalizedTitle) throw new Error("会话标题不能为空");
    return enqueueWrite(async (initializedStore) => {
      const index = await readIndex(initializedStore, projectUri);
      if (!index) throw new Error("AI 会话索引尚未初始化");
      const current = await readRequiredSession(initializedStore, projectUri, sessionId);
      const renamedSession: StoredAIChatSession = {
        ...current,
        title: normalizedTitle,
        titleManuallyEdited: true,
        updatedAt: Date.now(),
      };
      const nextIndex = replaceSummary(index, renamedSession);
      await initializedStore.set(getSessionKey(projectUri, sessionId), renamedSession);
      await initializedStore.set(getIndexKey(projectUri), nextIndex);
      await initializedStore.save();
      return {
        index: nextIndex,
        activeSession:
          nextIndex.activeSessionId === sessionId
            ? renamedSession
            : await readRequiredSession(initializedStore, projectUri, nextIndex.activeSessionId),
      };
    });
  }

  export async function deleteSession(projectUri: string, sessionId: string): Promise<AIChatSessionProjectState> {
    return enqueueWrite(async (initializedStore) => {
      const index = await readIndex(initializedStore, projectUri);
      if (!index || !index.sessions.some((session) => session.id === sessionId)) {
        throw new Error("指定的 AI 会话不存在");
      }

      const remaining = index.sessions.filter((session) => session.id !== sessionId);
      let activeSession: StoredAIChatSession;
      if (remaining.length === 0) {
        activeSession = createEmptySession();
        remaining.push(toSummary(activeSession));
        await initializedStore.set(getSessionKey(projectUri, activeSession.id), activeSession);
      } else if (index.activeSessionId === sessionId) {
        activeSession = await readRequiredSession(initializedStore, projectUri, remaining[0].id);
      } else {
        activeSession = await readRequiredSession(initializedStore, projectUri, index.activeSessionId);
      }

      const nextIndex: AIChatSessionIndex = {
        ...index,
        activeSessionId: activeSession.id,
        sessions: remaining,
      };
      await initializedStore.delete(getSessionKey(projectUri, sessionId));
      await initializedStore.set(getIndexKey(projectUri), nextIndex);
      await initializedStore.save();
      return { index: nextIndex, activeSession };
    });
  }
}
