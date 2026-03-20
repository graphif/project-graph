import { service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { AITools } from "@/core/service/dataManageService/aiEngine/AITools";
import OpenAI from "openai";

@service("aiEngine")
export class AIEngine {
  private openai = new OpenAI({
    apiKey: "",
    dangerouslyAllowBrowser: true,
  });

  // constructor(private readonly project: Project) {}

  async updateConfig() {
    this.openai.baseURL = Settings.aiApiBaseUrl;
    this.openai.apiKey = Settings.aiApiKey;
  }

  async chat(messages: OpenAI.ChatCompletionMessageParam[]) {
    await this.updateConfig();
    const stream = await this.openai.chat.completions.create({
      messages,
      model: Settings.aiModel,
      stream: true,
      stream_options: {
        include_usage: true,
      },
      tools: AITools.tools,
    });
    return stream;
  }

  async getModels() {
    await this.updateConfig();
    const resp = await this.openai.models.list();
    return resp.data.map((it) => it.id.replaceAll("models/", ""));
  }
}
