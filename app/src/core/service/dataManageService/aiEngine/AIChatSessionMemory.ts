import type { AIMessageMetadata } from "@/core/service/dataManageService/aiEngine/AIEngine";
import type { UIMessage } from "ai";

export type AIChatSessionMemory = {
  summary: string;
  coveredMessageCount: number;
};

export type SessionMemoryCompactionPlan = {
  messagesToSummarize: UIMessage<AIMessageMetadata>[];
  nextCoveredMessageCount: number;
  retainedMessages: UIMessage<AIMessageMetadata>[];
  maxOutputTokens: number;
};

const RECENT_USER_TURN_COUNT = 4;
const INPUT_TRIGGER_RATIO = 0.6;
const ESTIMATED_INPUT_TRIGGER_RATIO = 0.45;

export function getSessionMemoryWorkingMessages(
  messages: UIMessage<AIMessageMetadata>[],
  memory: AIChatSessionMemory | undefined,
): UIMessage<AIMessageMetadata>[] {
  return messages.slice(getCoveredMessageCount(messages, memory));
}

export function createSessionMemoryCompactionPlan({
  messages,
  memory,
  contextWindowTokens,
}: {
  messages: UIMessage<AIMessageMetadata>[];
  memory: AIChatSessionMemory | undefined;
  contextWindowTokens: number | undefined;
}): SessionMemoryCompactionPlan | null {
  if (!Number.isInteger(contextWindowTokens) || !contextWindowTokens || contextWindowTokens <= 0) return null;
  if (!shouldCompact(messages, contextWindowTokens)) return null;

  const coveredMessageCount = getCoveredMessageCount(messages, memory);
  const recentTurnStart = getRecentTurnStart(messages);
  if (recentTurnStart <= coveredMessageCount) return null;

  return {
    messagesToSummarize: messages.slice(coveredMessageCount, recentTurnStart),
    nextCoveredMessageCount: recentTurnStart,
    retainedMessages: messages.slice(recentTurnStart),
    maxOutputTokens: Math.min(1200, Math.max(256, Math.floor(contextWindowTokens * 0.08))),
  };
}

export function formatSessionMemoryTranscript(messages: UIMessage<AIMessageMetadata>[]): string {
  return messages
    .map((message) => {
      const parts = message.parts.map(formatMessagePart).filter(Boolean).join("\n");
      return `${message.role}:\n${parts || "[no retained content]"}`;
    })
    .join("\n\n");
}

function shouldCompact(messages: UIMessage<AIMessageMetadata>[], contextWindowTokens: number): boolean {
  const lastInputTokens = getLastInputTokens(messages);
  if (lastInputTokens !== undefined) return lastInputTokens >= contextWindowTokens * INPUT_TRIGGER_RATIO;
  return estimateSessionTokens(messages) >= contextWindowTokens * ESTIMATED_INPUT_TRIGGER_RATIO;
}

function getLastInputTokens(messages: UIMessage<AIMessageMetadata>[]): number | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const inputTokens = messages[index].metadata?.lastStepInputTokens;
    if (typeof inputTokens === "number" && Number.isFinite(inputTokens)) return inputTokens;
  }
  return undefined;
}

function estimateSessionTokens(messages: UIMessage<AIMessageMetadata>[]): number {
  const byteLength = new TextEncoder().encode(formatSessionMemoryTranscript(messages)).length;
  return Math.ceil(byteLength / 3);
}

function getCoveredMessageCount(
  messages: UIMessage<AIMessageMetadata>[],
  memory: AIChatSessionMemory | undefined,
): number {
  if (!memory || !Number.isInteger(memory.coveredMessageCount) || memory.coveredMessageCount <= 0) return 0;
  return Math.min(memory.coveredMessageCount, messages.length);
}

function getRecentTurnStart(messages: UIMessage<AIMessageMetadata>[]): number {
  const userMessageIndexes = messages.reduce<number[]>((indexes, message, index) => {
    if (message.role === "user") indexes.push(index);
    return indexes;
  }, []);
  const firstRecentTurn = userMessageIndexes.length - RECENT_USER_TURN_COUNT;
  return firstRecentTurn > 0 ? userMessageIndexes[firstRecentTurn] : 0;
}

function formatMessagePart(part: UIMessage<AIMessageMetadata>["parts"][number]): string {
  if (part.type === "text") return part.text;
  if (part.type === "reasoning" || part.type === "step-start") return "";

  if (part.type.startsWith("tool-")) {
    const toolPart = part as unknown as {
      type: string;
      state?: unknown;
      input?: unknown;
      output?: unknown;
      errorText?: unknown;
    };
    return [
      `[${toolPart.type} ${String(toolPart.state ?? "")}]`,
      `input: ${JSON.stringify(toolPart.input)}`,
      `output: ${JSON.stringify(toolPart.output)}`,
      toolPart.errorText === undefined ? "" : `error: ${String(toolPart.errorText)}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (part.type === "file") {
    return `[file: ${part.filename ?? part.mediaType ?? "attachment"}]`;
  }

  if (part.type === "source-url") {
    return `[source: ${part.sourceId} ${part.url}]`;
  }

  if (part.type === "source-document") {
    return `[source document: ${part.sourceId}]`;
  }

  return "";
}
