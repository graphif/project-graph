import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { useChat } from "@ai-sdk/react";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { fetch } from "@tauri-apps/plugin-http";
import { convertToModelMessages, DefaultChatTransport, streamText } from "ai";
import { CopyIcon, GlobeIcon, Loader, RefreshCcwIcon } from "lucide-react";
import { useState } from "react";

const aiProvider = createOpenAICompatible({
  name: "custom",
  baseURL: Settings.aiApiBaseUrl,
  apiKey: Settings.aiApiKey,
  includeUsage: true,
  fetch,
});

const customTransportFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
  const m = JSON.parse(init?.body as string);
  const result = streamText({
    model: aiProvider(Settings.aiModel),
    messages: convertToModelMessages(m.messages),
    abortSignal: init?.signal as AbortSignal | undefined,
  });
  return result.toUIMessageStreamResponse();
};

const models = [
  {
    name: "DeepSeek V3.1",
    value: "deepseek/deepseek-v3.1-terminus",
  },
];

export default function AIWindow() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      fetch: customTransportFetch,
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/*<div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {messages.map((msg) =>
          msg.role === "user"
            ? msg.parts.map((part, i) =>
                part.type === "text" ? (
                  <div
                    key={i}
                    className="bg-accent text-accent-foreground ml-auto rounded-lg rounded-br-none px-2 py-1.5"
                  >
                    {part.text}
                  </div>
                ) : null,
              )
            : msg.role === "assistant"
              ? msg.parts.map((part, i) =>
                  part.type === "text" ? (
                    <div key={i}>
                      {part.text}
                    </div>
                  ) : null,
                )
              : null,
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex gap-2 border-t border-white/5 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your prompt..."
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
      </form>*/}
      <Conversation className="h-full">
        <ConversationContent>
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "assistant" &&
                message.parts.filter((part) => part.type === "source-url").length > 0 && (
                  <Sources>
                    <SourcesTrigger count={message.parts.filter((part) => part.type === "source-url").length} />
                    {message.parts
                      .filter((part) => part.type === "source-url")
                      .map((part, i) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <Message key={`${message.id}-${i}`} from={message.role}>
                        <MessageContent>
                          <MessageResponse>{part.text}</MessageResponse>
                        </MessageContent>
                        {message.role === "assistant" && i === messages.length - 1 && (
                          <MessageActions>
                            <MessageAction label="Retry">
                              <RefreshCcwIcon className="size-3" />
                            </MessageAction>
                            <MessageAction onClick={() => navigator.clipboard.writeText(part.text)} label="Copy">
                              <CopyIcon className="size-3" />
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    );
                  case "reasoning":
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={
                          status === "streaming" && i === message.parts.length - 1 && message.id === messages.at(-1)?.id
                        }
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          ))}
          {status === "submitted" && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        onSubmit={(e) => {
          sendMessage(e);
          setInput("");
        }}
        className="mt-4"
        globalDrop
        multiple
      >
        <PromptInputHeader>
          <PromptInputAttachments>{(attachment) => <PromptInputAttachment data={attachment} />}</PromptInputAttachments>
        </PromptInputHeader>
        <PromptInputBody>
          <PromptInputTextarea onChange={(e) => setInput(e.target.value)} value={input} />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <PromptInputButton variant="ghost">
              <GlobeIcon size={16} />
              <span>Search</span>
            </PromptInputButton>
            <PromptInputSelect value="deepseek/deepseek-v3.1-terminus">
              <PromptInputSelectTrigger>
                <PromptInputSelectValue />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {models.map((model) => (
                  <PromptInputSelectItem key={model.value} value={model.value}>
                    {model.name}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
          </PromptInputTools>
          <PromptInputSubmit disabled={!input && !status} status={status} />
        </PromptInputFooter>
      </PromptInput>
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
