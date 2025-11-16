import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
      <div className="mx-auto my-2 flex w-2/3 flex-col gap-2 overflow-auto">
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
