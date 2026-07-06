import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Extension } from "@/core/extension/Extension";
import { Themes } from "@/core/service/Themes";
import { Blocks, ChevronRight, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function ThemesTab() {
  const [selectedTheme, setSelectedTheme] = useState<Themes.Theme | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["builtin"]));
  const [extensionGroups, setExtensionGroups] = useState<{ extension: Extension; themes: Themes.Theme[] }[]>([]);
  const [applying, setApplying] = useState(false);

  const builtinThemes = useMemo(() => Themes.builtinThemes, []);

  useEffect(() => {
    const ids = Themes.getExtensionIdsWithThemes();
    const groups = ids
      .map((id) => {
        const themes = Themes.getExtensionThemesByExtensionId(id);
        const ext = themes[0]?.metadata.source;
        return ext ? { extension: ext, themes } : null;
      })
      .filter((g): g is { extension: Extension; themes: Themes.Theme[] } => g !== null);
    setExtensionGroups(groups);
    // 自动展开扩展分类
    setOpenCategories((prev) => {
      const next = new Set(prev);
      groups.forEach((g) => {
        const extId = g.extension.metadata.extension?.id || "";
        next.add(extId);
      });
      return next;
    });
  }, []);

  const handleApply = async (themeId: string) => {
    setApplying(true);
    try {
      await Themes.applyThemeById(themeId);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      <Sidebar className="h-full overflow-auto border-r">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* 内置主题 */}
                <Collapsible
                  open={openCategories.has("builtin")}
                  onOpenChange={() =>
                    setOpenCategories((prev) => {
                      const next = new Set(prev);
                      if (next.has("builtin")) {
                        next.delete("builtin");
                      } else {
                        next.add("builtin");
                      }
                      return next;
                    })
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <CollapsibleTrigger>
                        <Palette />
                        <span>内置主题</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </CollapsibleTrigger>
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      <CollapsibleContent>
                        {builtinThemes.length === 0 ? (
                          <SidebarMenuSubItem>
                            <span className="text-muted-foreground px-2 text-xs">无内置主题</span>
                          </SidebarMenuSubItem>
                        ) : (
                          builtinThemes.map((theme) => (
                            <SidebarMenuSubItem key={theme.metadata.id}>
                              <SidebarMenuSubButton
                                isActive={selectedTheme?.metadata.id === theme.metadata.id}
                                onClick={() => setSelectedTheme(theme)}
                              >
                                {theme.metadata.type === "light" ? (
                                  <Sun className="size-3 shrink-0" />
                                ) : (
                                  <Moon className="size-3 shrink-0" />
                                )}
                                <span className="truncate">{theme.metadata.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))
                        )}
                      </CollapsibleContent>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </Collapsible>

                {/* 扩展主题 */}
                {extensionGroups.map(({ extension, themes }) => {
                  const extId = extension.metadata.extension?.id || "";
                  return (
                    <Collapsible
                      key={extId}
                      open={openCategories.has(extId)}
                      onOpenChange={() =>
                        setOpenCategories((prev) => {
                          const next = new Set(prev);
                          if (next.has(extId)) {
                            next.delete(extId);
                          } else {
                            next.add(extId);
                          }
                          return next;
                        })
                      }
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <CollapsibleTrigger>
                            {extension.iconBlobUrl ? (
                              <img src={extension.iconBlobUrl} className="size-4 shrink-0 object-contain" alt="" />
                            ) : (
                              <Blocks />
                            )}
                            <span className="truncate">{extension.metadata.extension?.name || "未知扩展"}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </CollapsibleTrigger>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          <CollapsibleContent>
                            {themes.map((theme) => (
                              <SidebarMenuSubItem key={theme.metadata.id}>
                                <SidebarMenuSubButton
                                  isActive={selectedTheme?.metadata.id === theme.metadata.id}
                                  onClick={() => setSelectedTheme(theme)}
                                >
                                  {theme.metadata.type === "light" ? (
                                    <Sun className="size-3 shrink-0" />
                                  ) : (
                                    <Moon className="size-3 shrink-0" />
                                  )}
                                  <span className="truncate">{theme.metadata.name}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </CollapsibleContent>
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {builtinThemes.length === 0 && extensionGroups.length === 0 && (
            <div className="text-muted-foreground p-4 text-center text-sm">没有可用的主题</div>
          )}
        </SidebarContent>
      </Sidebar>

      {/* 右侧详情面板 */}
      <div className="bg-background/50 flex flex-1 flex-col items-center justify-center gap-4 overflow-auto p-6">
        {selectedTheme ? (
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              {selectedTheme.metadata.type === "light" ? (
                <Sun className="size-6 shrink-0" />
              ) : (
                <Moon className="size-6 shrink-0" />
              )}
              <div>
                <h2 className="text-lg font-semibold">{selectedTheme.metadata.name}</h2>
                <span className="text-muted-foreground text-xs">
                  {selectedTheme.metadata.type === "light" ? "浅色主题" : "深色主题"}
                </span>
              </div>
            </div>
            {selectedTheme.metadata.description && (
              <p className="text-muted-foreground text-sm">{selectedTheme.metadata.description}</p>
            )}
            {selectedTheme.metadata.source && (
              <p className="text-muted-foreground text-xs">
                来自扩展：{selectedTheme.metadata.source.metadata.extension?.name || "未知扩展"}
              </p>
            )}
            <Button onClick={() => handleApply(selectedTheme.metadata.id)} disabled={applying}>
              <Palette />
              {applying ? "应用中…" : "应用主题"}
            </Button>
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <Palette className="size-16 opacity-20" />
            <p>请在侧边栏选择一个主题</p>
          </div>
        )}
      </div>
    </div>
  );
}
