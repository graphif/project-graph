import { Button } from "@/components/ui/button";
import { Check, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const INSTALL_SKILL_COMMAND = "npx -y skills add graphif/project-graph";
const LIST_TOOLS_COMMAND = "project-graph tool list";

function CommandCopyRow({ title, description, command }: { title: string; description: string; command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-muted-foreground text-sm">{description}</div>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "已复制" : "复制命令"}
        </Button>
      </div>
      <pre className="bg-muted overflow-x-auto rounded-md px-3 py-2 font-mono text-xs">{command}</pre>
    </div>
  );
}

export default function AiCliTab() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Terminal className="size-5" />
        <h2 className="text-lg font-semibold">AI / CLI 与 Skill 集成</h2>
      </div>
      <p className="text-muted-foreground text-sm">
        MyGo 架构已将 AI 能力下沉为独立的 Go CLI 工具链，无需启动桌面端即可由外部 Agent 直接调用。可复制下方命令给 Agent
        一键安装 Skill 或查看可用工具。
      </p>
      <CommandCopyRow
        title="一键安装 Agent Skill"
        description="复制给 Claude Code / Codex / Cursor / Jcode 等 Agent 执行安装"
        command={INSTALL_SKILL_COMMAND}
      />
      <CommandCopyRow
        title="查看 CLI 工具列表"
        description="验证本地 project-graph CLI 是否就绪并列出所有可用工具"
        command={LIST_TOOLS_COMMAND}
      />
    </div>
  );
}
