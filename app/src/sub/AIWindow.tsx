import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Markdown from "@/components/ui/markdown";
import { Textarea } from "@/components/ui/textarea";
import { AITools } from "@/core/service/dataManageService/aiEngine/AITools";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { activeProjectAtom } from "@/state";
import SettingsWindow from "@/sub/SettingsWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { Bot, BrainCircuit, ChevronRight, FolderOpen, Loader2, Send, SettingsIcon, User, Wrench } from "lucide-react";
import OpenAI from "openai";
import { Fragment, useRef, useState } from "react";

export default function AIWindow() {
  const [project] = useAtom(activeProjectAtom);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<(OpenAI.ChatCompletionMessageParam & { tokens?: number })[]>([
    {
      role: "system",
      content:
        "尽可能尝试使用工具解决问题，如果实在不行才能问用户。TextNode正常情况下高度为75，多个节点叠起来时需要适当留padding。节点正常情况下的颜色应该是透明[0,0,0,0]，注意透明色并非是“看不见文本”",
    },
  ]);
  const [requesting, setRequesting] = useState(false);
  const [totalInputTokens, setTotalInputTokens] = useState(0);
  const [totalOutputTokens, setTotalOutputTokens] = useState(0);
  const messagesElRef = useRef<HTMLDivElement>(null);
  const [showTokenCount] = Settings.use("aiShowTokenCount");

  function addMessage(message: OpenAI.ChatCompletionMessageParam & { tokens?: number }) {
    setMessages((prev) => [...prev, message]);
  }
  function setLastMessage(msg: OpenAI.ChatCompletionMessageParam) {
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = msg;
      return newMessages;
    });
  }

  function scrollToBottom() {
    if (messagesElRef.current) {
      messagesElRef.current.scrollTo({ top: messagesElRef.current.scrollHeight });
    }
  }

  async function run(msgs: OpenAI.ChatCompletionMessageParam[] = [...messages, { role: "user", content: inputValue }]) {
    if (!project) return;
    scrollToBottom();
    setRequesting(true);
    try {
      const stream = await project.aiEngine.chat(msgs);
      addMessage({
        role: "assistant",
        content: "Requesting...",
      });
      const streamingMsg: OpenAI.ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: "",
        tool_calls: [],
      };
      let lastChunk: OpenAI.ChatCompletionChunk | null = null;
      for await (const chunk of stream) {
        const delta = chunk.choices[0].delta;
        streamingMsg.content! += delta.content ?? "";
        const toolCalls = delta.tool_calls || [];

        for (const toolCall of toolCalls) {
          if (typeof streamingMsg.tool_calls !== "undefined") {
            const index =
              toolCall.index !== undefined
                ? toolCall.index
                : toolCall.type
                  ? streamingMsg.tool_calls.length
                  : streamingMsg.tool_calls.length - 1;

            // 确保索引有效
            if (index >= streamingMsg.tool_calls.length) {
              streamingMsg.tool_calls[index] = {
                id: toolCall.id || crypto.randomUUID(),
                type: "function",
                function: {
                  name: "",
                  arguments: "",
                },
              };
            }

            // 更新工具调用信息
            if (toolCall.id) streamingMsg.tool_calls[index].id = toolCall.id;
            if (toolCall.function?.name) streamingMsg.tool_calls[index].function.name += toolCall.function.name;
            if (toolCall.function?.arguments)
              streamingMsg.tool_calls[index].function.arguments += toolCall.function.arguments;
          }
        }

        setLastMessage(streamingMsg);
        scrollToBottom();
        lastChunk = chunk;
      }
      setRequesting(false);
      if (!lastChunk) return;
      if (!lastChunk.usage) return;
      setTotalInputTokens((v) => v + lastChunk.usage!.prompt_tokens);
      setTotalOutputTokens((v) => v + lastChunk.usage!.completion_tokens);
      scrollToBottom();
      // 如果有工具调用，执行工具调用
      console.log(streamingMsg.tool_calls);
      if (streamingMsg.tool_calls && streamingMsg.tool_calls.length > 0) {
        const toolMsgs: OpenAI.ChatCompletionToolMessageParam[] = [];
        for (const toolCall of streamingMsg.tool_calls) {
          const tool = AITools.handlers.get(toolCall.function.name);
          if (!tool) {
            return;
          }
          let observation = "";
          try {
            const result = await tool(project, JSON.parse(toolCall.function.arguments));
            if (typeof result === "string") {
              observation = result;
            } else if (typeof result === "object") {
              observation = JSON.stringify(result);
            } else {
              observation = String(result);
            }
          } catch (e) {
            observation = `工具调用失败：${(e as Error).message}`;
          }
          const msg = {
            role: "tool" as const,
            content: observation,
            tool_call_id: toolCall.id!,
          };
          addMessage(msg);
          toolMsgs.push(msg);
        }
        // 工具调用结束后，重新发送消息，让模型继续思考
        run([...msgs, streamingMsg, ...toolMsgs]);
      }
    } catch (e) {
      addMessage({
        role: "assistant",
        content: String(e),
      });
    }
  }

  return project ? (
    <div className="flex h-full flex-col p-2">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto" ref={messagesElRef}>
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-11/12 bg-accent text-accent-foreground rounded-2xl rounded-br-none px-3 py-2">
                {msg.content as string}
              </div>
            </div>
          ) : msg.role === "assistant" ? (
            <div key={i} className="flex flex-col gap-2">
              {msg.content && typeof msg.content === "string" && (
                <>
                  {msg.content.startsWith("<think>") && (
                    <Collapsible className="group/collapsible" defaultOpen={!msg.content.includes("</think>")}>
                      <CollapsibleTrigger className="flex items-center gap-2">
                        <BrainCircuit />
                        <span>思考中</span>
                        <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-none! mt-2 rounded-lg border px-3 py-2 opacity-50">
                        <span className="text-sm">
                          <Markdown source={msg.content.split("<think>")[1].split("</think>")[0]} />
                        </span>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  <Markdown
                    source={msg.content.includes("</think>") ? msg.content.split("</think>")[1] : msg.content}
                  />
                </>
              )}
              {msg.tool_calls &&
                msg.tool_calls.map((toolCall) => (
                  <Collapsible className="group/collapsible" key={toolCall.id}>
                    <CollapsibleTrigger className="flex items-center gap-2">
                      <Wrench />
                      <span>{toolCall.function.name}</span>
                      <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="animate-none! mt-2 rounded-lg border px-3 py-2 opacity-50">
                      <span className="text-sm">
                        <Markdown source={`\`\`\`json\n${toolCall.function.arguments}\n\`\`\``} />
                      </span>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
            </div>
          ) : (
            <Fragment key={i} />
          ),
        )}
      </div>
      <div className="mb-2 flex gap-2">
        <SettingsIcon className="cursor-pointer" onClick={() => SettingsWindow.open("settings")} />
        {showTokenCount && (
          <>
            <div className="flex-1"></div>
            <User />
            <span>{totalInputTokens}</span>
            <Bot />
            <span>{totalOutputTokens}</span>
          </>
        )}
        <div className="flex-1"></div>
        {requesting ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Send
            className="cursor-pointer"
            onClick={() => {
              if (!inputValue.trim()) return;
              addMessage({ role: "user", content: inputValue });
              setInputValue("");
              run();
            }}
          />
        )}
      </div>
      <Textarea placeholder="What can I say?" onChange={(e) => setInputValue(e.target.value)} value={inputValue} />
    </div>
  ) : (
    <div className="flex flex-col gap-2 p-8">
      <FolderOpen />
      请先打开一个文件
    </div>
  );
}

AIWindow.open = () => {
  SubWindow.create({
    title: "AI",
    children: <AIWindow />,
    rect: new Rectangle(new Vector(8, 88), new Vector(350, window.innerHeight - 96)),
  });
};
