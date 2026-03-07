import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "@/core/service/Settings";
import { Themes } from "@/core/service/Themes";
import { parseYamlWithFrontmatter } from "@/utils/yaml";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import _ from "lodash";
import { Check, Copy, Delete, FileInput, Info, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ThemeEditor from "./editor";

export default function ThemesTab() {
  const [selectedThemeId, setSelectThemeId] = useState(Settings.theme);
  const [selectedTheme, setSelectedTheme] = useState<Themes.Theme | null>(null);
  const { i18n } = useTranslation();
  const [currentTab, setCurrentTab] = useState("preview");
  const [themes, setThemes] = useState<Themes.Theme[]>([]);
  const [currentTheme] = Settings.use("theme");
  const [themeMode] = Settings.use("themeMode");
  const [lightTheme] = Settings.use("lightTheme");
  const [darkTheme] = Settings.use("darkTheme");

  useEffect(() => {
    Themes.getThemeById(selectedThemeId).then(setSelectedTheme);
  }, [selectedThemeId]);
  useEffect(() => {
    updateThemeIds();
  }, []);

  function updateThemeIds() {
    Themes.list().then(setThemes);
  }

  return (
    <div className="flex h-full">
      <Sidebar className="h-full overflow-auto">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    onClick={async () => {
                      const path = await open({
                        multiple: false,
                        title: "选择主题文件",
                        filters: [{ name: "Project Graph 主题文件", extensions: ["pg-theme"] }],
                      });
                      if (!path) return;
                      const fileContent = await readTextFile(path);
                      const data = parseYamlWithFrontmatter<Themes.Metadata, any>(fileContent);
                      Themes.writeCustomTheme({
                        metadata: data.frontmatter,
                        content: data.content,
                      }).then(updateThemeIds);
                    }}
                  >
                    <div>
                      <FileInput />
                      <span>导入主题</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarSeparator />
                {themes.map(({ metadata }) => (
                  <SidebarMenuItem key={metadata.id}>
                    <SidebarMenuButton
                      asChild
                      onClick={() => setSelectThemeId(metadata.id)}
                      isActive={selectedThemeId === metadata.id}
                    >
                      <div>
                        {currentTheme === metadata.id ? <Check /> : metadata.type === "dark" ? <Moon /> : <Sun />}
                        <span>{metadata.name[i18n.language]}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="mx-auto flex w-2/3 flex-col gap-2 overflow-auto">
        <div className="flex gap-2">
          <Button
            onClick={() => {
              Settings.theme = selectedThemeId;
            }}
          >
            <Palette />
            应用
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedTheme) return;
              Themes.writeCustomTheme(_.set(_.cloneDeep(selectedTheme), "metadata.id", crypto.randomUUID())).then(
                updateThemeIds,
              );
            }}
          >
            <Copy />
            复制
          </Button>
          <Button
            variant="destructive"
            disabled={Themes.builtinThemes.some((it) => it.metadata.id === selectedThemeId)}
            onClick={() => {
              if (!selectedTheme) return;
              Themes.deleteCustomTheme(selectedThemeId).then(updateThemeIds);
            }}
          >
            <Delete />
            删除
          </Button>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">主题模式</label>
            <div className="flex items-center gap-2">
              <span className="text-sm">白天</span>
              <Switch
                checked={themeMode === "dark"}
                onCheckedChange={(checked) => {
                  Settings.themeMode = checked ? "dark" : "light";
                }}
              />
              <span className="text-sm">黑夜</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">浅色主题</label>
              <Select
                value={lightTheme}
                onValueChange={(value) => {
                  Settings.lightTheme = value;
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择浅色主题" />
                </SelectTrigger>
                <SelectContent>
                  {themes
                    .filter((theme) => theme.metadata.type === "light")
                    .map((theme) => (
                      <SelectItem key={theme.metadata.id} value={theme.metadata.id}>
                        {theme.metadata.name[i18n.language]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">深色主题</label>
              <Select
                value={darkTheme}
                onValueChange={(value) => {
                  Settings.darkTheme = value;
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择深色主题" />
                </SelectTrigger>
                <SelectContent>
                  {themes
                    .filter((theme) => theme.metadata.type === "dark")
                    .map((theme) => (
                      <SelectItem key={theme.metadata.id} value={theme.metadata.id}>
                        {theme.metadata.name[i18n.language]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-muted-foreground text-xs">
            当前主题模式为 {themeMode === "light" ? "白天" : "黑夜"}，使用{" "}
            {themeMode === "light" ? lightTheme : darkTheme} 主题
          </div>
        </div>
        <Tabs value={currentTab} onValueChange={setCurrentTab as any}>
          <TabsList>
            <TabsTrigger value="preview">预览</TabsTrigger>
            <TabsTrigger value="edit">编辑</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-8 flex flex-col gap-2">
            <span className="mb-2 text-4xl font-bold">{selectedTheme?.metadata.name[i18n.language]}</span>
            <span>{selectedTheme?.metadata.description[i18n.language]}</span>
            <span>作者: {selectedTheme?.metadata.author[i18n.language]}</span>
          </TabsContent>
          <TabsContent value="edit">
            {Themes.builtinThemes.some((it) => it.metadata.id === selectedThemeId) ? (
              <Alert>
                <Info />
                <AlertTitle>内置主题</AlertTitle>
                <AlertDescription>这是一个内置的主题，需要复制后再编辑</AlertDescription>
              </Alert>
            ) : (
              <ThemeEditor themeId={selectedThemeId} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
