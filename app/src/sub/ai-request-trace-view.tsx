import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type AIRequestTraceBuffer,
  type AIRequestTraceRun,
  type AIRequestTraceSnapshot,
  type AIRequestTraceTextComparison,
} from "@/core/service/dataManageService/aiEngine/AIRequestTrace";
import { Bug, ChevronRight } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

export function AIRequestTraceView({
  buffer,
  activeSessionId,
}: {
  buffer: AIRequestTraceBuffer;
  activeSessionId: string;
}) {
  const runs = useSyncExternalStore(buffer.subscribe, buffer.getSnapshot, buffer.getSnapshot);
  const newestFirst = [...runs].reverse();

  return (
    <Collapsible className="group/trace border-border mt-2 rounded-md border">
      <CollapsibleTrigger className="hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs">
        <Bug className="size-3.5" />
        <span className="font-medium">Agent 请求 Trace</span>
        <Badge variant="outline">
          {runs.length}/{20}
        </Badge>
        <span className="text-muted-foreground ml-auto">内存记录</span>
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/trace:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent animate={false}>
        {newestFirst.length === 0 ? (
          <div className="text-muted-foreground border-border border-t px-3 py-2 text-xs">暂无请求记录</div>
        ) : (
          <ScrollArea className="border-border h-80 border-t">
            <div className="flex flex-col gap-2 p-2">
              {newestFirst.map((run) => (
                <TraceRunView key={run.id} run={run} activeSessionId={activeSessionId} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TraceRunView({ run, activeSessionId }: { run: AIRequestTraceRun; activeSessionId: string }) {
  const isCurrentSession = run.sessionId === activeSessionId;
  return (
    <Collapsible className="group/run border-border rounded-md border">
      <CollapsibleTrigger className="hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-xs">
        <span className="font-mono font-medium">Run #{run.id}</span>
        <Badge variant={isCurrentSession ? "secondary" : "outline"}>{isCurrentSession ? "当前会话" : "其他会话"}</Badge>
        <span className="text-muted-foreground ml-auto">
          {formatTraceTime(run.startedAt)} · {run.calls.length} 次模型调用
        </span>
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/run:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent animate={false} className="border-border flex flex-col gap-2 border-t p-2">
        {run.originalInput !== undefined && <TraceTextView title="输入框发送内容" text={run.originalInput} />}
        <TraceSnapshotView title="useChat 请求消息" snapshot={run.transportInput} />
        {run.preparedInput && <TraceSnapshotView title="压缩与转换后输入" snapshot={run.preparedInput} />}
        {run.calls.map((call, callIndex) => (
          <div key={call.id} className="border-border flex flex-col gap-2 rounded-md border p-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span>模型调用 {callIndex + 1}</span>
              <Badge variant="outline">{formatCallKind(call.kind)}</Badge>
            </div>
            {call.modelInput && <TraceSnapshotView title="AI SDK 模型参数" snapshot={call.modelInput} />}
            {call.wireRequests.map((request, requestIndex) => (
              <TraceSnapshotView
                key={request.id}
                title={`Provider HTTP ${requestIndex + 1} · ${formatWireStatus(request.responseStatus, request.error)}`}
                description={request.error ? `${request.url} · ${request.error}` : request.url}
                snapshot={request.input}
              />
            ))}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TraceTextView({ title, text }: { title: string; text: string }) {
  return (
    <Collapsible className="group/stage">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-2 text-left text-xs">
        <span>{title}</span>
        <span className="ml-auto">{text.length.toLocaleString()} 字符</span>
        <ChevronRight className="size-3 transition-transform group-data-[state=open]/stage:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent animate={false}>
        <pre className="bg-muted/60 mt-1 max-h-64 overflow-auto rounded-md p-2 text-xs break-words whitespace-pre-wrap">
          {text}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TraceSnapshotView({
  title,
  description,
  snapshot,
}: {
  title: string;
  description?: string;
  snapshot: AIRequestTraceSnapshot;
}) {
  const formattedValue = useMemo(() => formatTraceValue(snapshot.value), [snapshot.value]);
  const formattedByteCount = useMemo(() => new TextEncoder().encode(formattedValue).length, [formattedValue]);
  const characterCount = snapshot.payloadCharacterCount ?? formattedValue.length;
  const byteCount = snapshot.payloadByteCount ?? formattedByteCount;
  return (
    <Collapsible className="group/stage">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-2 text-left text-xs">
        <span>{title}</span>
        <TraceComparisonBadge comparison={snapshot.currentUserText} />
        <span className="ml-auto">
          {characterCount.toLocaleString()} 字符 · {formatBytes(byteCount)}
        </span>
        <ChevronRight className="size-3 transition-transform group-data-[state=open]/stage:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent animate={false}>
        {description && <div className="text-muted-foreground mt-1 truncate font-mono text-xs">{description}</div>}
        <pre className="bg-muted/60 mt-1 max-h-64 overflow-auto rounded-md p-2 text-xs break-words whitespace-pre-wrap">
          {formattedValue}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TraceComparisonBadge({ comparison }: { comparison: AIRequestTraceTextComparison }) {
  const presentation =
    comparison.status === "exact"
      ? { variant: "secondary" as const, text: "当前输入完整" }
      : comparison.status === "changed"
        ? { variant: "destructive" as const, text: "当前输入已改变" }
        : comparison.status === "missing"
          ? { variant: "destructive" as const, text: "当前输入缺失" }
          : { variant: "outline" as const, text: "无法比对" };
  return <Badge variant={presentation.variant}>{presentation.text}</Badge>;
}

function formatCallKind(kind: AIRequestTraceRun["calls"][number]["kind"]): string {
  if (kind === "agent") return "Agent";
  if (kind === "memory-summary") return "记忆压缩";
  return "未知";
}

function formatWireStatus(status: number | undefined, error: string | undefined): string {
  if (error) return "请求失败";
  return status === undefined ? "等待响应" : `HTTP ${status}`;
}

function formatTraceTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function formatTraceValue(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? String(value);
}
