import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { z } from "zod";

const openRouterModelResponseSchema = z.object({
  data: z.object({
    context_length: z.number().int().positive(),
  }),
});

export type AIModelContextWindow = {
  tokenLimit: number;
  source: "manual" | "openrouter";
};

export type AIModelContextWindowOptions = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  manualTokenLimit: number;
};

export async function resolveAIModelContextWindow(
  options: AIModelContextWindowOptions,
  fetchImpl: typeof globalThis.fetch = tauriFetch,
): Promise<AIModelContextWindow | null> {
  if (Number.isInteger(options.manualTokenLimit) && options.manualTokenLimit > 0) {
    return { tokenLimit: options.manualTokenLimit, source: "manual" };
  }

  const apiBaseUrl = new URL(options.apiBaseUrl);
  if (apiBaseUrl.hostname.toLowerCase() !== "openrouter.ai") return null;

  const modelPath = options.model
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const modelUrl = new URL(`/api/v1/model/${modelPath}`, apiBaseUrl.origin);
  const apiKey = options.apiKey.trim();
  const response = await fetchImpl(modelUrl.toString(), {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`OpenRouter 模型信息请求失败 (${response.status})`);
  }

  const parsed = openRouterModelResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("OpenRouter 返回的模型上下文信息格式无效");
  }

  return {
    tokenLimit: parsed.data.data.context_length,
    source: "openrouter",
  };
}
