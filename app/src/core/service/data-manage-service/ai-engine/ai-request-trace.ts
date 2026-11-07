export type AIRequestTraceCallKind = "agent" | "memory-summary" | "unknown";

export type AIRequestTraceTextComparison = {
  status: "exact" | "changed" | "missing" | "unavailable";
  characterCount?: number;
};

export type AIRequestTraceSnapshot = {
  capturedAt: number;
  payloadCharacterCount?: number;
  payloadByteCount?: number;
  currentUserText: AIRequestTraceTextComparison;
  value: unknown;
};

export type AIRequestTraceWireRequest = {
  id: number;
  url: string;
  input: AIRequestTraceSnapshot;
  responseStatus?: number;
  error?: string;
};

export type AIRequestTraceCall = {
  id: number;
  kind: AIRequestTraceCallKind;
  modelInput?: AIRequestTraceSnapshot;
  wireRequests: AIRequestTraceWireRequest[];
};

export type AIRequestTraceRun = {
  id: number;
  sessionId?: string;
  model: string;
  startedAt: number;
  originalInput?: string;
  transportInput: AIRequestTraceSnapshot;
  preparedInput?: AIRequestTraceSnapshot;
  calls: AIRequestTraceCall[];
};

type StartRunOptions = {
  sessionId?: string;
  model: string;
  messages: unknown;
};

const DEFAULT_RUN_LIMIT = 20;
const SENSITIVE_FIELD_PATTERN = /^(authorization|api[-_]?key|x-api-key|token|password|secret)$/i;

export class AIRequestTraceBuffer {
  private runs: AIRequestTraceRun[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly pendingInputs = new Map<string, string>();
  private nextRunId = 1;
  private nextCallId = 1;
  private nextWireRequestId = 1;

  constructor(private readonly runLimit = DEFAULT_RUN_LIMIT) {
    if (!Number.isInteger(runLimit) || runLimit <= 0) throw new Error("AI 请求 Trace 的保留数量必须是正整数");
  }

  readonly getSnapshot = (): readonly AIRequestTraceRun[] => this.runs;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  capturePendingInput(sessionId: string, text: string): void {
    this.pendingInputs.set(sessionId, text);
  }

  startRun({ sessionId, model, messages }: StartRunOptions): number {
    const observedInput = extractLastUserText(messages);
    const pendingInput = sessionId ? this.pendingInputs.get(sessionId) : undefined;
    if (sessionId) this.pendingInputs.delete(sessionId);
    const originalInput = pendingInput ?? observedInput;
    const run: AIRequestTraceRun = {
      id: this.nextRunId++,
      sessionId,
      model,
      startedAt: Date.now(),
      originalInput,
      transportInput: createSnapshot(messages, observedInput, originalInput),
      calls: [],
    };
    this.runs = [...this.runs, run].slice(-this.runLimit);
    this.emit();
    return run.id;
  }

  recordPreparedInput(runId: number, value: unknown): void {
    this.updateRun(runId, (run) => ({
      ...run,
      preparedInput: createSnapshot(value, extractLastUserText(value), run.originalInput),
    }));
  }

  recordModelCall(runId: number, kind: AIRequestTraceCallKind, value: unknown): number {
    const callId = this.nextCallId++;
    this.updateRun(runId, (run) => ({
      ...run,
      calls: [
        ...run.calls,
        {
          id: callId,
          kind,
          modelInput: createSnapshot(value, extractLastUserText(value), run.originalInput),
          wireRequests: [],
        },
      ],
    }));
    return callId;
  }

  recordWireRequest(runId: number, callId: number | undefined, url: string, body: unknown): number {
    const wireRequestId = this.nextWireRequestId++;
    this.updateRun(runId, (run) => {
      const normalizedBody = normalizeWireBody(body);
      const wireRequest: AIRequestTraceWireRequest = {
        id: wireRequestId,
        url: sanitizeUrl(url),
        input: createSnapshot(
          normalizedBody.value,
          extractLastUserText(normalizedBody.value),
          run.originalInput,
          normalizedBody.raw,
        ),
      };
      const matchingCall = callId === undefined ? undefined : run.calls.find((call) => call.id === callId);
      if (!matchingCall) {
        return {
          ...run,
          calls: [
            ...run.calls,
            {
              id: callId ?? this.nextCallId++,
              kind: "unknown",
              wireRequests: [wireRequest],
            },
          ],
        };
      }
      return {
        ...run,
        calls: run.calls.map((call) =>
          call.id === matchingCall.id ? { ...call, wireRequests: [...call.wireRequests, wireRequest] } : call,
        ),
      };
    });
    return wireRequestId;
  }

  recordWireResponse(runId: number, wireRequestId: number, responseStatus: number): void {
    this.updateWireRequest(runId, wireRequestId, (request) => ({ ...request, responseStatus }));
  }

  recordWireError(runId: number, wireRequestId: number, error: unknown): void {
    this.updateWireRequest(runId, wireRequestId, (request) => ({
      ...request,
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  private updateWireRequest(
    runId: number,
    wireRequestId: number,
    update: (request: AIRequestTraceWireRequest) => AIRequestTraceWireRequest,
  ): void {
    this.updateRun(runId, (run) => ({
      ...run,
      calls: run.calls.map((call) => ({
        ...call,
        wireRequests: call.wireRequests.map((request) => (request.id === wireRequestId ? update(request) : request)),
      })),
    }));
  }

  private updateRun(runId: number, update: (run: AIRequestTraceRun) => AIRequestTraceRun): void {
    let changed = false;
    const nextRuns = this.runs.map((run) => {
      if (run.id !== runId) return run;
      changed = true;
      return update(run);
    });
    if (!changed) return;
    this.runs = nextRuns;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function createSnapshot(
  value: unknown,
  observedUserText: string | undefined,
  originalInput: string | undefined,
  rawPayload?: string,
): AIRequestTraceSnapshot {
  const sanitizedValue = sanitizeTraceValue(value);
  return {
    capturedAt: Date.now(),
    payloadCharacterCount: rawPayload?.length,
    payloadByteCount: rawPayload === undefined ? undefined : new TextEncoder().encode(rawPayload).length,
    currentUserText: compareUserText(originalInput, observedUserText),
    value: sanitizedValue,
  };
}

function compareUserText(
  originalInput: string | undefined,
  observedUserText: string | undefined,
): AIRequestTraceTextComparison {
  if (originalInput === undefined) {
    return {
      status: "unavailable",
      characterCount: observedUserText?.length,
    };
  }
  if (observedUserText === undefined) return { status: "missing" };
  return {
    status: observedUserText === originalInput ? "exact" : "changed",
    characterCount: observedUserText.length,
  };
}

function normalizeWireBody(body: unknown): { value: unknown; raw?: string } {
  if (typeof body === "string") {
    try {
      return { value: JSON.parse(body), raw: body };
    } catch (error) {
      return {
        value: {
          rawBody: body,
          traceParseError: error instanceof Error ? error.message : String(error),
        },
        raw: body,
      };
    }
  }
  if (body instanceof URLSearchParams) {
    const raw = body.toString();
    return { value: Object.fromEntries(body.entries()), raw };
  }
  if (body instanceof Blob) return { value: `[Blob ${body.size} bytes, ${body.type || "unknown type"}]` };
  if (body instanceof ArrayBuffer) return { value: `[ArrayBuffer ${body.byteLength} bytes]` };
  if (ArrayBuffer.isView(body)) return { value: `[Binary view ${body.byteLength} bytes]` };
  if (body instanceof FormData) return { value: "[FormData body]" };
  if (body instanceof ReadableStream) return { value: "[ReadableStream body]" };
  return { value: body ?? null };
}

function extractLastUserText(value: unknown): string | undefined {
  if (Array.isArray(value)) return extractLastUserTextFromMessages(value);
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["messages", "prompt", "input"]) {
    if (!Array.isArray(record[key])) continue;
    const text = extractLastUserTextFromMessages(record[key]);
    if (text !== undefined) return text;
  }
  return undefined;
}

function extractLastUserTextFromMessages(messages: unknown[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (!message || typeof message !== "object") continue;
    const record = message as Record<string, unknown>;
    if (record.role !== "user") continue;
    return extractText(record.parts ?? record.content);
  }
  return undefined;
}

function extractText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  const text = value
    .flatMap((part) => {
      if (typeof part === "string") return [part];
      if (!part || typeof part !== "object") return [];
      const record = part as Record<string, unknown>;
      return typeof record.text === "string" ? [record.text] : [];
    })
    .join("\n");
  return text || undefined;
}

function sanitizeTraceValue(value: unknown): unknown {
  try {
    const seen = new WeakSet<object>();
    return visitTraceValue(value, "", seen);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { traceCaptureError: message };
  }
}

function visitTraceValue(value: unknown, key: string, seen: WeakSet<object>): unknown {
  if (SENSITIVE_FIELD_PATTERN.test(key)) return "[redacted]";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return `[function ${value.name || "anonymous"}]`;
  if (typeof value === "symbol") return value.toString();
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return sanitizeUrl(value.toString());
  if (Array.isArray(value)) return value.map((item) => visitTraceValue(item, "", seen));
  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [entryKey, visitTraceValue(entryValue, entryKey, seen)]),
  );
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `${value.split("?")[0]} [Trace URL parse error: ${message}]`;
  }
}
