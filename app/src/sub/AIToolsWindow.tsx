import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AITools } from "@/core/service/dataManageService/aiEngine/AITools";
import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { ChevronRight, Wrench } from "lucide-react";

export default function AIToolsWindow() {
  const tools = AITools.tools;

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <div className="text-muted-foreground mb-1 text-sm">
        共 {tools.length} 个工具，您可以通过查看AI工具，了解AI的能力范围
      </div>
      {tools.map((tool) => {
        const params = tool.function.parameters as Record<string, any> | undefined;
        const props = params?.properties as Record<string, any> | undefined;
        const required: string[] = params?.required ?? [];
        const hasParams = props && Object.keys(props).length > 0;

        return (
          <div key={tool.function.name} className="rounded-lg border px-3 py-2">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold">
              <Wrench className="h-4 w-4 shrink-0" />
              {tool.function.name}
            </div>
            {tool.function.description && (
              <div className="text-muted-foreground mt-1 text-sm">{tool.function.description}</div>
            )}
            {hasParams && (
              <Collapsible className="group/collapsible mt-2">
                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs">
                  <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  参数
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-none! mt-1">
                  <div className="flex flex-col gap-1">
                    {Object.entries(props!).map(([key, schema]) => {
                      const isRequired = required.includes(key);
                      const type: string =
                        schema.type ??
                        (schema.anyOf ? schema.anyOf.map((s: any) => s.type ?? s.const).join(" | ") : "any");
                      const desc: string | undefined = schema.description;
                      return (
                        <div key={key} className="bg-muted rounded px-2 py-1 font-mono text-xs">
                          <span className="text-foreground font-semibold">{key}</span>
                          <span className="text-muted-foreground ml-1">{type}</span>
                          {isRequired && <span className="ml-1 text-red-400">*</span>}
                          {desc && <div className="text-muted-foreground mt-0.5 font-sans">{desc}</div>}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            {!hasParams && <div className="text-muted-foreground mt-1 text-xs">无参数</div>}
          </div>
        );
      })}
    </div>
  );
}
AIToolsWindow.open = () => {
  SubWindow.create({
    title: "AI 工具列表",
    children: <AIToolsWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(400, 500)),
  });
};
