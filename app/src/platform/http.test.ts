import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ isMyGo: vi.fn(() => true), fetch: vi.fn() }));
vi.mock("mygo-runtime", () => ({ isMyGo: mocks.isMyGo }));
vi.mock("@mygo-plugins/fetch", () => ({ fetch: mocks.fetch }));

import { fetch } from "./http";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isMyGo.mockReturnValue(true);
});

describe("desktop HTTP", () => {
  it("preserves Request, AbortSignal and a streaming Response", async () => {
    const controller = new AbortController();
    const request = new Request("https://example.com/events");
    const response = new Response(
      new ReadableStream({
        start(stream) {
          stream.enqueue(new TextEncoder().encode("data: hello\n\n"));
          stream.close();
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
    mocks.fetch.mockResolvedValue(response);
    const result = await fetch(request, { signal: controller.signal });
    expect(result).toBe(response);
    expect(mocks.fetch).toHaveBeenCalledWith(request, { signal: controller.signal });
    expect(await result.text()).toBe("data: hello\n\n");
  });

  it("does not consume errors or replace the global browser fetch", async () => {
    const globalFetch = globalThis.fetch;
    mocks.fetch.mockRejectedValue(new TypeError("connection failed"));
    await expect(fetch("https://example.com")).rejects.toThrow("connection failed");
    expect(globalThis.fetch).toBe(globalFetch);
  });

  it("requires an explicit CLI implementation outside a desktop host", async () => {
    mocks.isMyGo.mockReturnValue(false);
    await expect(fetch("https://example.com")).rejects.toThrow("Desktop host missing");
  });
});
