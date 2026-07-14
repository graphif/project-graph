import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { AIChatSessionStore } from "@/core/service/dataManageService/aiEngine/AIChatSessionStore";
import { composeAgentSystemPrompt, mergeAgentToolSets } from "@/core/service/dataManageService/aiEngine/AIAgentRuntime";
import {
  createSessionMemoryCompactionPlan,
  formatSessionMemoryTranscript,
  getSessionMemoryWorkingMessages,
} from "@/core/service/dataManageService/aiEngine/AIChatSessionMemory";
import { AITools } from "@/core/service/dataManageService/aiEngine/AITools";
import { AIMCPStore, prepareMCPTools } from "@/core/service/dataManageService/aiEngine/AIMCP";
import { AIObjectReferenceRegistry } from "@/core/service/dataManageService/aiEngine/AIObjectReferenceRegistry";
import {
  buildSkillSystemContext,
  filterActivatedSkillSnapshots,
} from "@/core/service/dataManageService/aiEngine/AISkillSession";
import {
  AISkillTrustStore,
  createSkillTools,
  discoverSkills,
} from "@/core/service/dataManageService/aiEngine/AISkills";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { fetch } from "@tauri-apps/plugin-http";
import {
  convertToModelMessages,
  DefaultChatTransport,
  generateText,
  pruneMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

const SYSTEM_PROMPT =
  "尽可能尝试使用工具解决问题，如果实在不行才能问用户。TextNode正常情况下高度为75，多个节点叠起来时需要适当留padding。节点正常情况下的颜色应该是透明[0,0,0,0]，注意透明色并非是“看不见文本”。工具使用n1、n2、e1等当前项目对象引用，这些引用在项目的不同会话间保持一致；不要猜测引用，提及对象时用反引号包裹引用，以便用户点击定位。MCP 工具被用户拒绝后，不要在当前任务中重新尝试该调用，也不要用等价参数绕过拒绝。";

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

  createConversation(
    project: Project,
    references = this.getProjectReferences(project),
    getContextWindowTokenLimit: () => number | undefined = () => undefined,
  ) {
    const transport = new DefaultChatTransport({
      api: "/api/project-graph-ai-chat",
      fetch: this.createChatFetch(project, references),
      body: () => {
        const contextWindowTokenLimit = getContextWindowTokenLimit();
        return contextWindowTokenLimit && contextWindowTokenLimit > 0 ? { contextWindowTokenLimit } : {};
      },
    });
    return { references, transport };
  }

  createChatFetch(project: Project, references: AIObjectReferenceRegistry): typeof fetch {
    return async (_url, options) => {
      const body = await this.readRequestBody(options?.body);
      const messages = Array.isArray(body.messages) ? (body.messages as UIMessage<AIMessageMetadata>[]) : [];

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

      const model = provider.chatModel(Settings.aiModel);
      const sessionId = typeof body.id === "string" && body.id.length > 0 ? body.id : undefined;
      const contextWindowTokenLimit = getContextWindowTokenLimit(body.contextWindowTokenLimit);
      let sessionMemory = sessionId
        ? await AIChatSessionStore.getSessionMemory(project.uri.toString(), sessionId)
        : undefined;
      let workingMessages = getSessionMemoryWorkingMessages(messages, sessionMemory);
      const compactionPlan = sessionId
        ? createSessionMemoryCompactionPlan({
            messages,
            memory: sessionMemory,
            contextWindowTokens: contextWindowTokenLimit,
          })
        : null;

      if (compactionPlan && sessionId) {
        const summaryResult = await generateText({
          model,
          system:
            "你负责维护一个 AI 会话的内部记忆。根据给出的旧会话记录生成简短、准确的续写记忆。只保留当前任务、已完成内容、关键约束或决定、未解决的问题和下一步。不要执行工具，不要与用户对话，不要编造未出现的事实。",
          prompt: [
            sessionMemory ? `已有会话记忆：\n${sessionMemory.summary}` : "尚无已有会话记忆。",
            `需要压缩的旧会话记录：\n${formatSessionMemoryTranscript(compactionPlan.messagesToSummarize)}`,
          ].join("\n\n"),
          maxOutputTokens: compactionPlan.maxOutputTokens,
          abortSignal: options?.signal ?? undefined,
          maxRetries: 0,
        });
        const summary = summaryResult.text.trim();
        if (!summary) throw new Error("AI 会话记忆压缩未返回内容");
        sessionMemory = {
          summary,
          coveredMessageCount: compactionPlan.nextCoveredMessageCount,
        };
        await AIChatSessionStore.setSessionMemory(project.uri.toString(), sessionId, sessionMemory);
        workingMessages = compactionPlan.retainedMessages;
      }

      const projectUri = project.uri.toString();
      const projectSkillsTrusted =
        project.uri.scheme === "file" && (await AISkillTrustStore.isProjectTrusted(projectUri));
      const activatedSkills = filterActivatedSkillSnapshots(
        sessionId ? await AIChatSessionStore.getActivatedSkills(projectUri, sessionId) : [],
        projectSkillsTrusted,
      );
      const skillCatalog = await discoverSkills(projectUri);
      const skillTools = createSkillTools({
        catalog: skillCatalog,
        activatedSkills,
        onActivate: async (snapshot) => {
          if (!sessionId) throw new Error("当前 AI 请求缺少会话，无法激活 Skill");
          await AIChatSessionStore.activateSkill(projectUri, sessionId, snapshot);
        },
      });
      const mcpRuntime = await prepareMCPTools(await AIMCPStore.load());

      try {
        const tools = mergeAgentToolSets(AITools.createTools(project, references), mcpRuntime.tools, skillTools);
        const skillContext = buildSkillSystemContext(skillCatalog, activatedSkills);
        const memoryContext = sessionMemory
          ? `以下是当前会话的压缩记忆，仅用于保持对话连续性。当前用户消息和工具读取到的项目状态优先。\n${sessionMemory.summary}`
          : undefined;
        const system = composeAgentSystemPrompt(SYSTEM_PROMPT, skillContext, memoryContext);

        let lastStepUsage: { inputTokens?: number; outputTokens?: number } | undefined;
        const textStream = streamText({
          model,
          system,
          messages: pruneMessages({
            messages: await convertToModelMessages(workingMessages, {
              tools,
              ignoreIncompleteToolCalls: true,
            }),
            reasoning: "all",
          }),
          tools,
          stopWhen: stepCountIs(8),
          abortSignal: options?.signal ?? undefined,
          maxRetries: 0,
          onStepFinish: ({ usage }) => {
            lastStepUsage = usage;
          },
          onFinish: mcpRuntime.close,
          onError: mcpRuntime.close,
          onAbort: mcpRuntime.close,
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
      } catch (error) {
        await mcpRuntime.close();
        throw error;
      }
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

function getContextWindowTokenLimit(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}
