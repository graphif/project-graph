import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Extension } from "@/core/extension/Extension";
import { ExtensionManager } from "@/core/extension/ExtensionManager";
import { Blocks } from "lucide-react";
import { useEffect, useState } from "react";

export default function ExtensionsTab() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const names = await ExtensionManager.getExtensions();
        const exts = await Promise.all(names.map((name) => ExtensionManager.getExtension(name)));
        setExtensions(exts);
        if (exts.length > 0 && !selectedId) {
          setSelectedId(exts[0].metadata.extension?.id || null);
        }
      } catch (e) {
        console.error("Failed to load extensions", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedExtension = extensions.find((e) => e.metadata.extension?.id === selectedId);
  const ContentComponent = selectedExtension?.getComponent();

  return (
    <div className="flex h-full w-full">
      <Sidebar className="h-full overflow-auto border-r">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {loading ? (
                  <div className="text-muted-foreground p-4 text-center text-sm">加载中...</div>
                ) : extensions.length === 0 ? (
                  <div className="text-muted-foreground p-4 text-center text-sm">未发现扩展</div>
                ) : (
                  extensions.map((ext) => {
                    const metadata = ext.metadata.extension;
                    const id = metadata?.id || "";
                    return (
                      <SidebarMenuItem key={id}>
                        <SidebarMenuButton onClick={() => setSelectedId(id)} isActive={selectedId === id}>
                          <Blocks />
                          <span className="flex-1 truncate">{metadata?.name || "未知扩展"}</span>
                          <span className="opacity-50">v{metadata?.version || "0.0.0"}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="bg-background/50 flex-1 overflow-auto">
        {selectedExtension && ContentComponent ? (
          <ContentComponent />
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4">
            <Blocks className="size-16 opacity-20" />
            <p>{loading ? "正在加载扩展列表..." : "请选择一个扩展查看详情"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
