import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import type { AIMessageMetadata } from "./AIEngine";
import {
  createSessionMemoryCompactionPlan,
  formatSessionMemoryTranscript,
  getSessionMemoryWorkingMessages,
} from "./AIChatSessionMemory";

function createConversation(turnCount: number, lastStepInputTokens?: number): UIMessage<AIMessageMetadata>[] {
  return Array.from({ length: turnCount }, (_, index) => [
    {
      id: `u${index}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: `request ${index}` }],
    },
    {
      id: `a${index}`,
      role: "assistant" as const,
      metadata: index === turnCount - 1 ? { lastStepInputTokens } : undefined,
      parts: [{ type: "text" as const, text: `response ${index}` }],
    },
  ]).flat();
}

describe("session memory compaction", () => {
  it("summarizes only complete oldest turns and preserves the latest four turns", () => {
    const messages = createConversation(6, 650);

    const plan = createSessionMemoryCompactionPlan({
      messages,
      memory: undefined,
      contextWindowTokens: 1000,
    });

    expect(plan).not.toBeNull();
    expect(plan?.messagesToSummarize.map((message) => message.id)).toEqual(["u0", "a0", "u1", "a1"]);
    expect(plan?.retainedMessages.map((message) => message.id)).toEqual([
      "u2",
      "a2",
      "u3",
      "a3",
      "u4",
      "a4",
      "u5",
      "a5",
    ]);
    expect(plan?.nextCoveredMessageCount).toBe(4);
  });

  it("extends existing memory without re-summarizing already covered messages", () => {
    const messages = createConversation(7, 700);

    const plan = createSessionMemoryCompactionPlan({
      messages,
      memory: { summary: "earlier work", coveredMessageCount: 4 },
      contextWindowTokens: 1000,
    });

    expect(plan?.messagesToSummarize.map((message) => message.id)).toEqual(["u2", "a2"]);
    expect(plan?.nextCoveredMessageCount).toBe(6);
    expect(plan?.retainedMessages[0]?.id).toBe("u3");
  });

  it("does not compact when all messages belong to the recent window", () => {
    const messages = createConversation(4, 900);

    expect(
      createSessionMemoryCompactionPlan({
        messages,
        memory: undefined,
        contextWindowTokens: 1000,
      }),
    ).toBeNull();
  });

  it("keeps the local full history intact while deriving the working suffix", () => {
    const messages = createConversation(5, 700);
    const workingMessages = getSessionMemoryWorkingMessages(messages, {
      summary: "first two turns",
      coveredMessageCount: 4,
    });

    expect(workingMessages.map((message) => message.id)).toEqual(["u2", "a2", "u3", "a3", "u4", "a4"]);
    expect(messages).toHaveLength(10);
  });

  it("includes tool outcomes but excludes private reasoning from the summary transcript", () => {
    const transcript = formatSessionMemoryTranscript([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "reasoning", text: "private chain" },
          {
            type: "tool-read_project",
            toolCallId: "call1",
            state: "output-available",
            input: { ref: "n1" },
            output: { text: "node text" },
          },
        ],
      },
    ] as UIMessage<AIMessageMetadata>[]);

    expect(transcript).toContain("node text");
    expect(transcript).not.toContain("private chain");
  });
});
