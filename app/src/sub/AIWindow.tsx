import { Button } from "@/components/ui/button";
import Markdown from "@/components/ui/markdown";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Project } from "@/core/Project";
import type { AIMessageMetadata } from "@/core/service/dataManageService/aiEngine/AIEngine";
import { Settings } from "@/core/service/Settings";
import { SubWindow } from "@/core/service/SubWindow";
import { activeTabAtom } from "@/state";
import { cn } from "@/utils/cn";
import { useChat } from "@ai-sdk/react";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import type { UIMessage } from "ai";
import { useAtom } from "jotai";
import { Bot, Check, ChevronRight, FolderOpen, Paperclip, Send, Sparkles, Square, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getOriginalNameOf } from "virtual:original-class-name";

let pendingInitialText: string | null = null;
let pendingInitialPrompt: string | null = null;

export function setAIWindowInitialText(text: string, prompt?: string) {
  pendingInitialText = text;
  pendingInitialPrompt = prompt || null;
}

export default function AIWindow({ winId = "" }: { winId?: string }) {
  const [tab] = useAtom(activeTabAtom);
  const project = tab instanceof Project ? tab : undefined;

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FolderOpen className="text-muted-foreground size-10" />
        <div className="font-medium">请先打开一个文件</div>
        <div className="text-muted-foreground max-w-64 text-sm">
          AI 工具需要当前画布上下文，打开文件后就可以帮你创建、整理和修改节点。
        </div>
      </div>
    );
  }

  return <AIChatPanel key={project.uri.toString()} project={project} winId={winId} />;
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getContrastTextColor(bg: Color): string {
  const luminance = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b) / 255;
  return luminance > 0.6 ? "#000" : "#fff";
}

function isEntity(
  obj: unknown,
): obj is { isSelected: boolean; collisionBox: { getRectangle(): Rectangle }; color?: Color } {
  return typeof obj === "object" && obj !== null && "isSelected" in obj && "collisionBox" in obj;
}

function AIChatPanel({ project, winId }: { project: Project; winId: string }) {
  const [inputValue, setInputValue] = useState("");
  const messagesElRef = useRef<HTMLDivElement>(null);
  const [showTokenCount] = Settings.use("aiShowTokenCount");
  const transport = useMemo(() => project.aiEngine.createTransport(project), [project]);
  const [selectedCount, setSelectedCount] = useState(0);

  const { messages, sendMessage, stop, status, error } = useChat<UIMessage<AIMessageMetadata>>({
    transport,
    experimental_throttle: 50,
    onError: (err) => {
      toast.error(`AI 请求失败: ${err.message || err.toString() || JSON.stringify(err)}`);
    },
  });
  const requesting = status === "submitted" || status === "streaming";
  const tokenUsage = useMemo(() => getTokenUsage(messages), [messages]);

  useEffect(() => {
    messagesElRef.current?.scrollTo({ top: messagesElRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (error) console.error("AI Chat state error:", error);
  }, [error]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedCount(project.stageManager.getSelectedEntities().length);
    }, 300);
    return () => clearInterval(interval);
  }, [project]);

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

  function handleUserSend() {
    const text = inputValue.trim();
    if (!text || requesting) return;
    const selectedEntities = project.stageManager.getSelectedEntities();
    const prefix = selectedEntities.length > 0 ? selectedEntities.map((it) => `\`${it.uuid}\``).join(" ") : "";
    sendMessage({ text: prefix + text });
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserSend();
    }
  }

  const UuidCode = useCallback(
    ({ children, ...props }: any) => {
      const text = typeof children === "string" ? children : String(children ?? "");

      if (!UUID_V4_RE.test(text)) {
        return <code {...props}>{children}</code>;
      }

      const stageObject = project.stageManager.get(text);
      if (!stageObject || !isEntity(stageObject)) {
        return <code {...props}>{children}</code>;
      }

      const hasColor = "color" in stageObject && stageObject.color instanceof Color;
      const bgColor = hasColor ? (stageObject.color as Color).toHexStringWithoutAlpha() : undefined;
      const textColor = hasColor ? getContrastTextColor(stageObject.color as Color) : undefined;

      const hasText = "text" in stageObject && typeof stageObject.text === "string";
      const textPreview = hasText
        ? `${(stageObject.text as string).split("\n")[0]} `
        : `${getOriginalNameOf(stageObject.constructor)} ${text}`;

      const handleClick = () => {
        project.stageManager.clearSelectAll();
        stageObject.isSelected = true;
        const center = stageObject.collisionBox.getRectangle().center;
        project.camera.bombMove(center);
      };

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="hover:ring-primary/50 inline-flex cursor-pointer items-center rounded px-1.5 py-0.5 text-xs transition-all hover:ring-2"
              style={bgColor ? { backgroundColor: bgColor, color: textColor } : undefined}
              onClick={handleClick}
            >
              {textPreview}
            </span>
          </TooltipTrigger>
          <TooltipContent>{text}</TooltipContent>
        </Tooltip>
      );
    },
    [project],
  );

  const markdownComponents = useMemo(() => ({ code: UuidCode }), [UuidCode]);

  return (
    <div className="from-background via-background to-muted/30 flex h-full flex-col bg-gradient-to-b">
      <div data-pg-drag-region className="border-border/70 flex items-center gap-3 border-b px-3 py-2">
        <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-xl">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Project Graph AI</div>
          <div className="text-muted-foreground truncate text-xs">{Settings.aiModel}</div>
        </div>
        <X
          className="text-muted-foreground hover:text-foreground size-5 cursor-pointer"
          onClick={() => SubWindow.close(winId)}
        />
      </div>

      <div ref={messagesElRef} className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot className="size-10" />
            <div className="text-foreground font-medium">说说你想怎么改这张图</div>
            <div className="max-w-72 text-sm">
              例如：整理当前选中的节点、生成一棵知识树、批量改颜色，或者让它先读取画布再规划。
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message as any} components={markdownComponents} />
            ))}
          </div>
        )}
      </div>

      <div className="border-border/70 border-t p-3">
        <div className="mb-2 flex items-center gap-2 text-xs">
          {selectedCount > 0 && (
            <>
              <Paperclip className="size-3.5" />
              <span>已选中 {selectedCount} 个节点</span>
            </>
          )}
          {showTokenCount && (
            <Tooltip>
              <TooltipTrigger>
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5" />
                  <span>{formatTokenCount(tokenUsage.inputTokens)}</span>
                  <span></span>
                  <Bot className="size-3.5" />
                  <span>{formatTokenCount(tokenUsage.outputTokens)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Token 数量仅供参考，请以服务商实际计费为准</TooltipContent>
            </Tooltip>
          )}
          <div className="flex-1" />
          <span className="text-muted-foreground">{requesting ? "正在思考" : "准备就绪"}</span>
          {requesting ? (
            <Button size="sm" variant="outline" className="h-8 cursor-pointer" onClick={stop}>
              <Square className="size-4" />
            </Button>
          ) : (
            <Button size="sm" className="h-8 cursor-pointer" onClick={handleUserSend} disabled={!inputValue.trim()}>
              <Send className="size-4" />
            </Button>
          )}
        </div>
        <Textarea
          placeholder="让 AI 读取画布、创建节点、连线、整理选区..."
          className="max-h-36 resize-none"
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          value={inputValue}
          disabled={requesting}
        />
      </div>
    </div>
  );
}

function getTokenUsage(messages: UIMessage<AIMessageMetadata>[]) {
  return messages.reduce(
    (usage, message) => {
      usage.inputTokens += message.metadata?.inputTokens ?? 0;
      usage.outputTokens += message.metadata?.outputTokens ?? 0;
      usage.totalTokens += message.metadata?.totalTokens ?? 0;
      return usage;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
}

function formatTokenCount(value: number) {
  return value.toLocaleString();
}

function MessageBubble({
  message,
  components,
}: {
  message: any;
  components?: Record<string, React.ComponentType<any>>;
}) {
  const isUser = message.role === "user";
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const bubbles = isUser ? [parts] : splitPartsByStepStart(parts);

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="bg-primary/10 text-primary mt-1 flex size-7 shrink-0 items-center justify-center rounded-full">
          <Bot className="size-4" />
        </div>
      )}
      <div className={cn("flex max-w-[88%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {bubbles.length > 0 ? (
          bubbles.map((bubbleParts, bubbleIndex) => (
            <div
              key={bubbleIndex}
              className={cn(
                "flex cursor-text flex-col gap-2 rounded-2xl px-3 py-2 text-sm select-text",
                isUser
                  ? "bg-accent text-accent-foreground rounded-br-md"
                  : "bg-card border-border/70 rounded-bl-md border shadow-sm",
              )}
            >
              {bubbleParts.length > 0 ? (
                bubbleParts.map((part: any, index: number) => (
                  <MessagePart
                    key={part.toolCallId ?? `${part.type}-${bubbleIndex}-${index}`}
                    part={part}
                    components={components}
                  />
                ))
              ) : (
                <Markdown source={String(message.content ?? "")} components={components} />
              )}
            </div>
          ))
        ) : (
          <div
            className={cn(
              "cursor-text rounded-2xl px-3 py-2 text-sm select-text",
              isUser
                ? "bg-accent text-accent-foreground rounded-br-md"
                : "bg-card border-border/70 rounded-bl-md border shadow-sm",
            )}
          >
            <Markdown source={String(message.content ?? "")} components={components} />
          </div>
        )}
      </div>
      {isUser && (
        <div className="bg-accent text-accent-foreground mt-1 flex size-7 shrink-0 items-center justify-center rounded-full">
          <User className="size-4" />
        </div>
      )}
    </div>
  );
}

function splitPartsByStepStart(parts: any[]) {
  const bubbles: any[][] = [];
  let current: any[] = [];

  for (const part of parts) {
    if (part.type === "step-start") {
      if (current.length > 0) {
        bubbles.push(current);
        current = [];
      }
      continue;
    }
    current.push(part);
  }

  if (current.length > 0) {
    bubbles.push(current);
  }

  return bubbles;
}

function MessagePart({ part, components }: { part: any; components?: Record<string, React.ComponentType<any>> }) {
  if (part.type === "text") {
    return <Markdown source={part.text ?? ""} components={components} />;
  }
  if (part.type === "reasoning") {
    return (
      <div className="text-muted-foreground border-l-2 pl-2 text-xs leading-relaxed">{part.text ?? part.reasoning}</div>
    );
  }
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return <ToolPart part={part} />;
  }
  return (
    <pre className="text-muted-foreground overflow-auto text-xs">unknown part: {JSON.stringify(part, null, 2)}</pre>
  );
}

function ToolPart({ part }: { part: any }) {
  const name = part.type.replace(/^tool-/, "");
  const done = part.state === "output-available";
  const failed = part.state === "output-error";

  return (
    <Collapsible className="group/collapsible">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-xs">
        {done ? <Check className="size-4" /> : <X className={cn("size-4", failed && "text-destructive")} />}
        <span>{name}</span>
        <span>{toolStateText(part.state)}</span>
        <ChevronRight className="size-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="bg-muted/60 mt-2 animate-none! rounded-lg px-3 py-2">
        <Markdown
          source={`\`\`\`json\n${JSON.stringify({ input: part.input, output: part.output, error: part.errorText }, null, 2)}\n\`\`\``}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function toolStateText(state: string | undefined) {
  switch (state) {
    case "input-streaming":
      return "准备参数";
    case "input-available":
      return "执行中";
    case "output-available":
      return "完成";
    case "output-error":
      return "失败";
    default:
      return state ?? "";
  }
}

AIWindow.open = () => {
  SubWindow.create({
    title: "",
    closable: false,
    titleBarOverlay: true,
    children: <AIWindow />,
    rect: new Rectangle(new Vector(8, 88), new Vector(380, window.innerHeight - 96)),
  });
};
