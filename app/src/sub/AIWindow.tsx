import { Project } from "@/core/Project";
import { Button } from "@/components/ui/button";
import Markdown from "@/components/ui/markdown";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { activeTabAtom } from "@/state";
import SettingsWindow from "@/sub/SettingsWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useAtom } from "jotai";
import { Bot, ChevronRight, CornerDownRight, FolderOpen, Send, SettingsIcon, Square, User, Wrench } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

let pendingInitialText: string | null = null;
let pendingInitialPrompt: string | null = null;

export function setAIWindowInitialText(text: string, prompt?: string) {
  pendingInitialText = text;
  pendingInitialPrompt = prompt || null;
}

export default function AIWindow() {
  const [tab] = useAtom(activeTabAtom);
  const project = tab instanceof Project ? tab : undefined;
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<BaseMessage[]>([
    new SystemMessage(
      "尽可能尝试使用工具解决问题，如果实在不行才能问用户。TextNode正常情况下高度为75，多个节点叠起来时需要适当留padding。节点正常情况下的颜色应该是透明[0,0,0,0]，注意透明色并非是“看不见文本”",
    ),
  ]);
  const [requesting, setRequesting] = useState(false);
  const [totalInputTokens, setTotalInputTokens] = useState(0);
  const [totalOutputTokens, setTotalOutputTokens] = useState(0);
  const [executingToolIds, setExecutingToolIds] = useState<Set<string>>(new Set());
  const messagesElRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showTokenCount] = Settings.use("aiShowTokenCount");

  useEffect(() => {
    if (pendingInitialText) {
      const text = pendingInitialText;
      const prompt = pendingInitialPrompt;
      pendingInitialText = null;
      pendingInitialPrompt = null;

      if (prompt) {
        setInputValue(`${prompt}\n\n---\n\n${text}`);
      } else {
        setInputValue(text);
      }
    }
  }, []);

  function addMessage(message: BaseMessage) {
    setMessages((prev) => [...prev, message]);
  }

  function scrollToBottom() {
    if (messagesElRef.current) {
      messagesElRef.current.scrollTo({ top: messagesElRef.current.scrollHeight });
    }
  }

  async function run(msgs: BaseMessage[]) {
    if (!project) return;
    scrollToBottom();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setRequesting(true);
    try {
      const stream = await project.aiEngine.chat(msgs, project, abortController.signal);
      for await (const [chunk] of stream) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          // 如果 chunk 是增量消息（BaseMessageChunk），尝试与最后一条消息合并
          if (lastMsg && lastMsg.id === chunk.id && typeof (lastMsg as any).concat === "function") {
            try {
              const mergedMsg = (lastMsg as any).concat(chunk);
              return [...prev.slice(0, -1), mergedMsg];
            } catch (e) {
              console.warn("Message concat failed, falling back to replacement", e);
              return [...prev.slice(0, -1), chunk as BaseMessage];
            }
          } else {
            // 新消息（或者是不同 ID 的消息）
            return [...prev, chunk as BaseMessage];
          }
        });

        const token = chunk as any;
        // 处理执行中的工具 ID 提示
        if (token.type === "ai") {
          const aiMsg = token as any;
          if (aiMsg.contentBlocks) {
            const toolCalls = aiMsg.contentBlocks.filter((b: any) => b.type === "tool_call");
            if (toolCalls.length > 0) {
              setExecutingToolIds((prev) => {
                const next = new Set(prev);
                toolCalls.forEach((tc: any) => {
                  next.add(tc.id);
                });
                return next;
              });
            }
          }
        } else if (token.type === "tool") {
          const toolMsg = token as ToolMessage;
          setExecutingToolIds((prev) => {
            const next = new Set(prev);
            next.delete(toolMsg.tool_call_id);
            return next;
          });
        }

        const msgWithUsage = token as any;
        if (msgWithUsage.usage_metadata) {
          setTotalInputTokens((v) => v + (msgWithUsage.usage_metadata.input_tokens ?? 0));
          setTotalOutputTokens((v) => v + (msgWithUsage.usage_metadata.output_tokens ?? 0));
        }
        scrollToBottom();
      }
      setRequesting(false);
      abortControllerRef.current = null;
    } catch (e) {
      setRequesting(false);
      abortControllerRef.current = null;
      if ((e as Error).name === "AbortError") return;
      toast.error(String(e));
      addMessage(new AIMessage(String(e)));
    }
  }

  function handleUserSend() {
    if (!inputValue.trim()) return;
    const humanMsg = new HumanMessage(inputValue);
    const newMsgs = [...messages, humanMsg];
    setMessages(newMsgs);
    setInputValue("");
    run(newMsgs);
  }

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserSend();
    }
  }

  return project ? (
    <div className="flex h-full flex-col p-2">
      <div className="flex flex-1 cursor-text select-text flex-col gap-2 overflow-y-auto" ref={messagesElRef}>
        {messages.map((msg, i) => {
          if (msg.type === "human") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-11/12 bg-accent text-accent-foreground cursor-text select-text rounded-2xl rounded-br-none px-3 py-2">
                  {msg.content as string}
                </div>
              </div>
            );
          } else if (msg.type === "ai") {
            const aiMsg = msg as any;
            if (!aiMsg.contentBlocks) {
              return (
                <div key={i} className="flex flex-col gap-2 opacity-50">
                  <Markdown source={String(aiMsg.content)} />
                </div>
              );
            }
            return (
              <div key={i} className="flex cursor-text select-text flex-col gap-2">
                {aiMsg.contentBlocks.map((block: any, j: number) => (
                  <div key={j}>
                    {block.type === "reasoning" && (
                      <div className="text-muted-foreground mb-1 border-l-2 pl-2 text-sm italic">
                        <Markdown source={block.reasoning} />
                      </div>
                    )}
                    {block.type === "text" && <Markdown source={block.text} />}
                    {block.type === "tool_call" && (
                      <Collapsible className="group/collapsible">
                        <CollapsibleTrigger
                          className={`flex cursor-pointer items-center gap-2 ${executingToolIds.has(block.id ?? "") ? "animate-blink" : ""}`}
                        >
                          <Wrench />
                          <span>{block.name}</span>
                          <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="animate-none! mt-2 cursor-text select-text rounded-lg border px-3 py-2 opacity-50">
                          <div className="cursor-text select-text overflow-visible whitespace-pre-wrap break-words text-sm">
                            <Markdown source={`\`\`\`json\n${JSON.stringify(block.args, null, 2)}\n\`\`\``} />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}
              </div>
            );
          } else if (msg.type === "tool") {
            const toolMsg = msg as ToolMessage;
            return (
              <div key={i} className="flex cursor-text select-text flex-col gap-2 opacity-50">
                <Collapsible className="group/collapsible">
                  <CollapsibleTrigger
                    className={`flex cursor-pointer items-center gap-2 ${executingToolIds.has(toolMsg.tool_call_id ?? "") ? "animate-blink" : ""}`}
                  >
                    <CornerDownRight />
                    <span>成功</span>
                    <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-none! mt-2 cursor-text select-text rounded-lg border px-3 py-2 opacity-50">
                    <div className="cursor-text select-text overflow-visible whitespace-pre-wrap break-words text-sm">
                      <Markdown source={`\`\`\`json\n${JSON.stringify(toolMsg.content, null, 2)}\n\`\`\``} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          }
          return null;
        })}
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
          <Button className="cursor-pointer" onClick={handleStop}>
            <Square />
          </Button>
        ) : (
          <Button className="cursor-pointer" onClick={handleUserSend}>
            <Send />
          </Button>
        )}
      </div>
      <Textarea
        placeholder="What can I say?"
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        value={inputValue}
      />
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
