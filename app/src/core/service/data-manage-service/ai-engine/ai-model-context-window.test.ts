import { describe, expect, it, vi } from "vitest";
import { resolveAIModelContextWindow } from "./AIModelContextWindow";

const baseOptions = {
  apiBaseUrl: "https://openrouter.ai/api/v1",
  apiKey: "test-key",
  model: "openai/gpt-4o:free",
  manualTokenLimit: 0,
};

describe("resolveAIModelContextWindow", () => {
  it("优先使用手动上下文上限", async () => {
    const fetchImpl = vi.fn();

    await expect(
      resolveAIModelContextWindow({ ...baseOptions, manualTokenLimit: 128_000 }, fetchImpl),
    ).resolves.toEqual({ tokenLimit: 128_000, source: "manual" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("非 OpenRouter 服务返回未知", async () => {
    const fetchImpl = vi.fn();

    await expect(
      resolveAIModelContextWindow(
        { ...baseOptions, apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/" },
        fetchImpl,
      ),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("从 OpenRouter 模型接口读取上下文上限", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { context_length: 128_000 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(resolveAIModelContextWindow(baseOptions, fetchImpl)).resolves.toEqual({
      tokenLimit: 128_000,
      source: "openrouter",
    });
    expect(fetchImpl).toHaveBeenCalledWith("https://openrouter.ai/api/v1/model/openai/gpt-4o%3Afree", {
      headers: { Authorization: "Bearer test-key" },
    });
  });

  it("拒绝无效的 OpenRouter 响应", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }));

    await expect(resolveAIModelContextWindow(baseOptions, fetchImpl)).rejects.toThrow(
      "OpenRouter 返回的模型上下文信息格式无效",
    );
  });
});
