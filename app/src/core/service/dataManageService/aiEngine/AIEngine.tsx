import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { AITools } from "@/core/service/dataManageService/aiEngine/AITools";
import { AIObjectReferenceRegistry } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { fetch } from "@tauri-apps/plugin-http";
import { convertToModelMessages, DefaultChatTransport, stepCountIs, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT =
  "尽可能尝试使用工具解决问题，如果实在不行才能问用户。TextNode正常情况下高度为75，多个节点叠起来时需要适当留padding。节点正常情况下的颜色应该是透明[0,0,0,0]，注意透明色并非是“看不见文本”。工具使用n1、n2、e1等当前项目对象引用，这些引用在项目的不同会话间保持一致；不要猜测引用，提及对象时用反引号包裹引用，以便用户点击定位。";

export type AIMessageMetadata = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  lastStepInputTokens?: number;
  lastStepOutputTokens?: number;
};

@service("aiEngine")
export class AIEngine {
  private references: AIObjectReferenceRegistry | undefined;

  getProjectReferences(project: Project) {
    this.references ??= new AIObjectReferenceRegistry(project);
    return this.references;
  }

  createConversation(project: Project, references = this.getProjectReferences(project)) {
    const transport = new DefaultChatTransport({
      api: "/api/project-graph-ai-chat",
      fetch: this.createChatFetch(project, references),
    });
    return { references, transport };
  }

  createChatFetch(project: Project, references: AIObjectReferenceRegistry): typeof fetch {
    return async (_url, options) => {
      const body = await this.readRequestBody(options?.body);
      const messages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : [];

      const provider = createOpenAICompatible({
        name: "project-graph",
        baseURL: Settings.aiApiBaseUrl,
        apiKey: Settings.aiApiKey || undefined,
        fetch: async (url: any, init: any) => {
          const response = await fetch(url.toString(), {
            ...init,
            headers: {
              ...init?.headers,
            },
            mode: "cors",
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => "unknown error");
            throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
          }

          return response;
        },
        includeUsage: true,
      });

      const tools = AITools.createTools(project, references);

      let lastStepUsage: { inputTokens?: number; outputTokens?: number } | undefined;
      const textStream = streamText({
        model: provider.chatModel(Settings.aiModel),
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(messages, {
          tools,
          ignoreIncompleteToolCalls: true,
        }),
        tools,
        stopWhen: stepCountIs(8),
        abortSignal: options?.signal ?? undefined,
        maxRetries: 0,
        onStepFinish: ({ usage }) => {
          lastStepUsage = usage;
        },
      });

      return textStream.toUIMessageStreamResponse<UIMessage<AIMessageMetadata>>({
        originalMessages: messages as UIMessage<AIMessageMetadata>[],
        messageMetadata: ({ part }) => {
          if (part.type !== "finish") return;
          return {
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            totalTokens: part.totalUsage.totalTokens,
            lastStepInputTokens: lastStepUsage?.inputTokens,
            lastStepOutputTokens: lastStepUsage?.outputTokens,
          };
        },
      });
    };
  }

  async getModels() {
    return ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
  }

  private async readRequestBody(body: BodyInit | null | undefined): Promise<any> {
    if (!body) return {};
    if (typeof body === "string") return JSON.parse(body);
    if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
    if (body instanceof Blob) return JSON.parse(await body.text());
    if (body instanceof FormData) return Object.fromEntries(body.entries());
    if (body instanceof ReadableStream) return JSON.parse(await new Response(body).text());
    return JSON.parse(String(body));
  }
}
