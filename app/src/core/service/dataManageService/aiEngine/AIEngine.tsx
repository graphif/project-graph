import { Project, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { AITools } from "@/core/service/dataManageService/aiEngine/AITools";
import { ChatOpenAI } from "@langchain/openai";
import { fetch } from "@tauri-apps/plugin-http";
import { createAgent } from "langchain";

@service("aiEngine")
export class AIEngine {
  private openai: ChatOpenAI | null = null;

  async updateConfig() {
    this.openai = new ChatOpenAI({
      apiKey: Settings.aiApiKey,
      modelName: Settings.aiModel,
      configuration: {
        baseURL: Settings.aiApiBaseUrl,
        fetch,
      },
      streaming: true,
    });
  }

  async chat(messages: any[], project: Project, abortSignal?: AbortSignal) {
    await this.updateConfig();
    if (!this.openai) throw new Error("AI Engine not initialized");

    const agent = createAgent({
      model: this.openai,
      tools: AITools.tools,
    });

    return agent.stream(
      { messages },
      {
        configurable: {
          project: project,
        },
        signal: abortSignal,
        streamMode: "messages",
      },
    );
  }

  async getModels() {
    return ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
  }
}
