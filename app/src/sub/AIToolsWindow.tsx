import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Project } from "@/core/Project";
import { SubWindow } from "@/core/service/SubWindow";
import {
  AIMCPStore,
  discoverMCPTools,
  normalizeMCPServerName,
  type AIMCPServerConfig,
  type AIMCPToolDescriptor,
} from "@/core/service/dataManageService/aiEngine/AIMCP";
import { AISkillTrustStore, discoverSkills, type AISkill } from "@/core/service/dataManageService/aiEngine/AISkills";
import { AITools } from "@/core/service/dataManageService/aiEngine/AITools";
import { activeTabAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtom } from "jotai";
import { ChevronRight, Wrench } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import z from "zod/v4";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function RawJsonSchema({ schema }: { schema: unknown }) {
  return (
    <Collapsible className="group/json-schema mt-2">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs">
        <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/json-schema:rotate-90" />
        原始 JSON Schema
      </CollapsibleTrigger>
      <CollapsibleContent animate={false} className="mt-1">
        <pre className="bg-muted max-h-64 overflow-auto rounded p-2 font-mono text-xs select-text">
          {JSON.stringify(schema, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolHeading({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm font-semibold">
      <Wrench className="h-4 w-4 shrink-0" />
      {name}
    </div>
  );
}

function BuiltInToolsSection() {
  const tools = AITools.tools;
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold">内置工具</h2>
        <p className="text-muted-foreground text-xs">{tools.length} 个 Project Graph 工具</p>
      </div>
      {tools.map((entry) => {
        const agentTool = entry as any;
        const schema = agentTool.parameters as any;
        const properties = schema?.shape as Record<string, any> | undefined;
        const hasParams = properties && Object.keys(properties).length > 0;
        return (
          <div key={agentTool.name} className="rounded-lg border px-3 py-2">
            <ToolHeading name={agentTool.name} />
            {agentTool.description && <div className="text-muted-foreground mt-1 text-sm">{agentTool.description}</div>}
            {hasParams ? (
              <Collapsible className="group/collapsible mt-2">
                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs">
                  <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  参数
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 animate-none!">
                  <div className="flex flex-col gap-1">
                    {Object.entries(properties).map(([key, zodType]) => {
                      const description = (zodType as any)._def?.description;
                      return (
                        <div key={key} className="bg-muted rounded px-2 py-1 font-mono text-xs">
                          <span className="text-foreground font-semibold">{key}</span>
                          {description && <div className="text-muted-foreground mt-0.5 font-sans">{description}</div>}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="text-muted-foreground mt-1 text-xs">无参数</div>
            )}
            <RawJsonSchema schema={z.toJSONSchema(agentTool.parameters)} />
          </div>
        );
      })}
    </section>
  );
}

function MCPToolRow({
  descriptor,
  enabled,
  disabled,
  onEnabledChange,
}: {
  descriptor: AIMCPToolDescriptor;
  enabled: boolean;
  disabled: boolean;
  onEnabledChange(enabled: boolean): void;
}) {
  return (
    <div className="bg-muted/40 rounded-md border p-2">
      <label className="flex cursor-pointer items-start gap-2">
        <Checkbox
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
          aria-label={`启用 ${descriptor.name}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-xs font-semibold break-all">{descriptor.modelName}</span>
          {(descriptor.title || descriptor.description) && (
            <span className="text-muted-foreground mt-1 block text-xs">
              {descriptor.title && <span className="text-foreground font-medium">{descriptor.title} </span>}
              {descriptor.description}
            </span>
          )}
        </span>
      </label>
      <RawJsonSchema schema={descriptor.inputSchema} />
    </div>
  );
}

function MCPSection() {
  const [servers, setServers] = useState<AIMCPServerConfig[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busyServer, setBusyServer] = useState<string | null>(null);

  useEffect(() => {
    void AIMCPStore.load()
      .then(setServers)
      .catch((error) => toast.error(`读取 MCP 配置失败：${getErrorMessage(error)}`));
  }, []);

  const saveServers = async (nextServers: AIMCPServerConfig[]) => {
    setServers(await AIMCPStore.save(nextServers));
  };

  const runServerAction = async (serverName: string, action: () => Promise<void>) => {
    setBusyServer(serverName);
    try {
      await action();
    } catch (error) {
      toast.error(`MCP 操作失败：${getErrorMessage(error)}`);
    } finally {
      setBusyServer(null);
    }
  };

  const addServer = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = normalizeMCPServerName(name);
    await runServerAction(normalizedName, async () => {
      if (!name.trim()) throw new Error("服务器名称不能为空");
      if (servers.some((server) => server.name === normalizedName)) throw new Error(`服务器 ${normalizedName} 已存在`);
      await saveServers([
        ...servers,
        { name: normalizedName, url: url.trim(), enabled: false, enabledTools: [], cachedTools: [] },
      ]);
      setName("");
      setUrl("");
    });
  };

  const updateServer = async (serverName: string, update: (server: AIMCPServerConfig) => AIMCPServerConfig) => {
    await runServerAction(serverName, async () => {
      await saveServers(servers.map((server) => (server.name === serverName ? update(server) : server)));
    });
  };

  const refreshTools = async (server: AIMCPServerConfig) => {
    await runServerAction(server.name, async () => {
      const cachedTools = await discoverMCPTools(server);
      const availableNames = new Set(cachedTools.map((tool) => tool.name));
      await saveServers(
        servers.map((entry) =>
          entry.name === server.name
            ? { ...entry, cachedTools, enabledTools: entry.enabledTools.filter((tool) => availableNames.has(tool)) }
            : entry,
        ),
      );
      toast.success(`已读取 ${cachedTools.length} 个 MCP 工具`);
    });
  };

  const deleteServer = async (serverName: string) => {
    await runServerAction(serverName, async () => {
      await saveServers(servers.filter((server) => server.name !== serverName));
    });
  };

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold">MCP 服务器</h2>
        <p className="text-muted-foreground text-xs">仅支持 Streamable HTTP；每次工具调用都需要审批。</p>
      </div>
      <form
        className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2"
        onSubmit={(event) => void addServer(event)}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="服务器名称"
          aria-label="MCP 服务器名称"
        />
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/mcp"
          aria-label="MCP 服务器 URL"
        />
        <Button type="submit" disabled={busyServer !== null}>
          添加
        </Button>
      </form>
      {servers.length === 0 && (
        <div className="text-muted-foreground rounded-lg border p-3 text-xs">尚未配置 MCP 服务器。</div>
      )}
      {servers.map((server) => {
        const busy = busyServer !== null;
        const serverBusy = busyServer === server.name;
        return (
          <div key={server.name} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{server.name}</span>
                  <Badge variant="outline">{server.cachedTools.length} tools</Badge>
                </div>
                <div className="text-muted-foreground mt-1 text-xs break-all">{server.url}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground text-xs">启用</span>
                <Switch
                  checked={server.enabled}
                  disabled={busy || (!server.enabled && server.cachedTools.length === 0)}
                  onCheckedChange={(checked) =>
                    void updateServer(server.name, (entry) => ({ ...entry, enabled: checked }))
                  }
                  aria-label={`启用 MCP 服务器 ${server.name}`}
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                className="h-7 px-2"
                variant="outline"
                disabled={busy}
                onClick={() => void refreshTools(server)}
              >
                {serverBusy ? "处理中" : "连接并刷新工具"}
              </Button>
              <Button
                size="sm"
                className="h-7 px-2"
                variant="destructive"
                disabled={busy}
                onClick={() => void deleteServer(server.name)}
              >
                删除
              </Button>
            </div>
            {server.cachedTools.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {server.cachedTools.map((descriptor) => (
                  <MCPToolRow
                    key={descriptor.name}
                    descriptor={descriptor}
                    enabled={server.enabledTools.includes(descriptor.name)}
                    disabled={busy}
                    onEnabledChange={(enabled) =>
                      void updateServer(server.name, (entry) => ({
                        ...entry,
                        enabledTools: enabled
                          ? [...new Set([...entry.enabledTools, descriptor.name])]
                          : entry.enabledTools.filter((tool) => tool !== descriptor.name),
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function SkillsSection() {
  const [tab] = useAtom(activeTabAtom);
  const project = tab instanceof Project ? tab : undefined;
  const projectUri = project?.uri.toString();
  const canTrustProject = project?.uri.scheme === "file";
  const [trusted, setTrusted] = useState(false);
  const [skills, setSkills] = useState<AISkill[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const discoveryUri = projectUri ?? "untitled:ai-tools";
      const [projectTrusted, catalog] = await Promise.all([
        canTrustProject && projectUri ? AISkillTrustStore.isProjectTrusted(projectUri) : Promise.resolve(false),
        discoverSkills(discoveryUri),
      ]);
      if (!active) return;
      setTrusted(projectTrusted);
      setSkills([...catalog.values()].sort((left, right) => left.name.localeCompare(right.name)));
    };
    void load().catch((error) => toast.error(`读取 Skills 失败：${getErrorMessage(error)}`));
    return () => {
      active = false;
    };
  }, [canTrustProject, projectUri]);

  const setProjectTrust = async (nextTrusted: boolean) => {
    if (!canTrustProject || !projectUri) return;
    setBusy(true);
    try {
      await AISkillTrustStore.setProjectTrusted(projectUri, nextTrusted);
      setTrusted(nextTrusted);
      const catalog = await discoverSkills(projectUri);
      setSkills([...catalog.values()].sort((left, right) => left.name.localeCompare(right.name)));
    } catch (error) {
      toast.error(`更新 Skills 信任状态失败：${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const names = skills.map((skill) => skill.name);
  const activateSchema = {
    type: "object",
    properties: { name: { type: "string", enum: names } },
    required: ["name"],
    additionalProperties: false,
  };
  const resourceSchema = {
    type: "object",
    properties: {
      skill: { type: "string", enum: names },
      relativePath: { type: "string", minLength: 1, maxLength: 1024 },
    },
    required: ["skill", "relativePath"],
    additionalProperties: false,
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Agent Skills</h2>
          <p className="text-muted-foreground text-xs">从 SKILL.md 渐进加载；激活后的说明保存在当前会话。</p>
        </div>
        {canTrustProject && projectUri && (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
            信任项目 Skills
            <Switch
              checked={trusted}
              disabled={busy}
              onCheckedChange={(checked) => void setProjectTrust(checked)}
              aria-label="信任当前项目中的 Agent Skills"
            />
          </label>
        )}
      </div>
      {canTrustProject && projectUri && !trusted && (
        <div className="border-destructive/30 bg-destructive/10 rounded-md border p-2 text-xs">
          项目内的 Skill 可影响模型行为。确认项目来源可信后再启用；用户级 Skills 不受此开关影响。
        </div>
      )}
      {skills.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border p-3 text-xs">未发现可用的 Skills。</div>
      ) : (
        <>
          <div className="rounded-lg border px-3 py-2">
            <ToolHeading name="activate_skill" />
            <div className="text-muted-foreground mt-1 text-sm">将 Skill 的完整说明加载到当前会话。</div>
            <RawJsonSchema schema={activateSchema} />
          </div>
          <div className="rounded-lg border px-3 py-2">
            <ToolHeading name="read_skill_resource" />
            <div className="text-muted-foreground mt-1 text-sm">读取已激活 Skill 中列出的 UTF-8 文本资源。</div>
            <RawJsonSchema schema={resourceSchema} />
          </div>
          {skills.map((skill) => (
            <div key={skill.name} className="rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">{skill.name}</span>
                <Badge variant={skill.scope === "project" ? "default" : "secondary"}>
                  {skill.scope === "project" ? "项目" : "用户"}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-1 text-sm">{skill.description}</div>
              <div className="text-muted-foreground mt-1 text-xs">{skill.resources.length} 个资源文件</div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export default function AIToolsWindow() {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-3">
      <MCPSection />
      <SkillsSection />
      <BuiltInToolsSection />
    </div>
  );
}

AIToolsWindow.open = () => {
  SubWindow.create({
    title: "AI 工具与扩展",
    children: <AIToolsWindow />,
    rect: new Rectangle(new Vector(100, 60), new Vector(620, 720)),
  });
};
