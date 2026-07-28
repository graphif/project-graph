import { describe, expect, it, vi } from "vitest";
import { AIRequestTraceBuffer } from "./AIRequestTrace";

function messages(text: string) {
  return [
    {
      id: "user-message",
      role: "user",
      parts: [{ type: "text", text }],
    },
  ];
}

describe("AI request trace buffer", () => {
  it("retains the latest 20 runs even when there are no subscribers", () => {
    const buffer = new AIRequestTraceBuffer(20);

    for (let index = 0; index < 21; index++) {
      buffer.startRun({
        sessionId: "session",
        model: "test-model",
        messages: messages(`request ${index}`),
      });
    }

    expect(buffer.getSnapshot()).toHaveLength(20);
    expect(buffer.getSnapshot()[0]?.id).toBe(2);
    expect(buffer.getSnapshot()[19]?.id).toBe(21);
  });

  it("compares the input box text with each captured request stage", () => {
    const buffer = new AIRequestTraceBuffer();
    buffer.capturePendingInput("session", "complete input");

    const runId = buffer.startRun({
      sessionId: "session",
      model: "test-model",
      messages: messages("input"),
    });
    buffer.recordPreparedInput(runId, {
      messages: [{ role: "user", content: "complete input" }],
    });

    const [run] = buffer.getSnapshot();
    expect(run?.originalInput).toBe("complete input");
    expect(run?.transportInput.currentUserText.status).toBe("changed");
    expect(run?.preparedInput?.currentUserText.status).toBe("exact");
  });

  it("groups middleware and provider payloads under the same model call", () => {
    const buffer = new AIRequestTraceBuffer();
    buffer.capturePendingInput("session", "complete input");
    const runId = buffer.startRun({
      sessionId: "session",
      model: "test-model",
      messages: messages("complete input"),
    });
    const callId = buffer.recordModelCall(runId, "agent", {
      prompt: [{ role: "user", content: [{ type: "text", text: "complete input" }] }],
      apiKey: "secret",
    });
    const body = JSON.stringify({
      model: "test-model",
      messages: [{ role: "user", content: "complete input" }],
    });
    const requestId = buffer.recordWireRequest(
      runId,
      callId,
      "https://example.com/v1/chat/completions?api_key=secret",
      body,
    );
    buffer.recordWireResponse(runId, requestId, 200);

    const call = buffer.getSnapshot()[0]?.calls[0];
    expect(JSON.stringify(call?.modelInput?.value)).not.toContain("secret");
    expect(call?.wireRequests[0]?.url).toBe("https://example.com/v1/chat/completions");
    expect(call?.wireRequests[0]?.input.currentUserText.status).toBe("exact");
    expect(call?.wireRequests[0]?.input.payloadCharacterCount).toBe(body.length);
    expect(call?.wireRequests[0]?.responseStatus).toBe(200);
  });

  it("notifies subscribers without requiring collection to be enabled", () => {
    const buffer = new AIRequestTraceBuffer();
    const listener = vi.fn();
    const unsubscribe = buffer.subscribe(listener);

    buffer.startRun({
      sessionId: "session",
      model: "test-model",
      messages: messages("request"),
    });
    unsubscribe();
    buffer.startRun({
      sessionId: "session",
      model: "test-model",
      messages: messages("another request"),
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(buffer.getSnapshot()).toHaveLength(2);
  });
});
