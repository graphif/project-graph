import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "@/core/service/Settings";
import {
  getAllSubWindowOpenModes,
  resetSubWindowOpenMode,
  resetSubWindowOpenModes,
  setSubWindowOpenMode,
} from "@/core/subWindowOpen";
import {
  DEFAULT_SUB_WINDOW_OPEN_MODES,
  SUB_WINDOW_IDS,
  SUB_WINDOW_OPEN_MODES,
  type SubWindowId,
  type SubWindowOpenMode,
} from "@/core/subWindowOpenModes";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

const MODE_LABELS: Record<SubWindowOpenMode, string> = {
  floating: "浮动窗口",
  docked: "停靠（标签栏）",
  dockedLeft: "停靠左侧",
  dockedRight: "停靠右侧",
};

const WINDOW_LABELS: Record<SubWindowId, string> = {
  AIToolsWindow: "AI 工具列表",
  AIWindow: "AI 助手",
  AttachmentsWindow: "附件管理器",
  AutoCompleteWindow: "自动补全",
  LogicNodePanel: "逻辑节点",
  BackgroundManagerWindow: "背景管理器",
  ColorPaletteWindow: "当前文件颜色表",
  ColorWindow: "调色盘",
  ColorManagerPanel: "颜色管理",
  EditUrlNodeLinkWindow: "编辑 URL 节点链接",
  ExportPngWindow: "导出 PNG",
  FindWindow: "搜索",
  FormWindow: "表单",
  GenerateNodeTree: "生成节点群",
  GenerateNodeTreeByMarkdown: "Markdown 生成节点群",
  GenerateNodeGraph: "生成节点网",
  GenerateNodeMermaid: "Mermaid 生成结构",
  KeyboardRecentFilesWindow: "键盘最近文件",
  LatexEditWindow: "LaTeX 编辑",
  NewExportPngWindow: "新导出 PNG",
  NodeDetailsWindow: "节点详情",
  OnboardingWindow: "引导",
  RecentFilesWindow: "最近打开的文件",
  ReferencesWindow: "引用管理器",
  SectionReferencePanel: "框引用面板",
  TagWindow: "标签管理器",
  LittleTagWindow: "单个标签窗口",
  TestWindow: "测试窗口",
  TextImportWindow: "文本导入",
  WelcomeWindow: "欢迎页",
  SettingsWindow: "设置",
};

export default function WindowOpenModesPage() {
  const [modes, setModes] = useState(() => getAllSubWindowOpenModes());

  useEffect(() => {
    return Settings.watch("subWindowOpenModes", () => {
      setModes(getAllSubWindowOpenModes());
    });
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">子窗口打开方式</h2>
          <p className="text-muted-foreground text-sm">
            配置各面板首次打开时的布局。已打开的窗口不会随设置变更自动重排，下次打开时生效。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetSubWindowOpenModes();
            setModes(getAllSubWindowOpenModes());
          }}
        >
          <RotateCcw className="size-4" />
          全部重置
        </Button>
      </div>

      <div className="space-y-2">
        {SUB_WINDOW_IDS.map((id) => {
          const mode = modes[id];
          const isDefault = mode === DEFAULT_SUB_WINDOW_OPEN_MODES[id];
          return (
            <div key={id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{WINDOW_LABELS[id]}</div>
                <div className="text-muted-foreground truncate text-xs">{id}</div>
              </div>
              <Select
                value={mode}
                onValueChange={(value) => {
                  setSubWindowOpenMode(id, value as SubWindowOpenMode);
                  setModes(getAllSubWindowOpenModes());
                }}
              >
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUB_WINDOW_OPEN_MODES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {MODE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isDefault}
                title="重置为默认"
                onClick={() => {
                  resetSubWindowOpenMode(id);
                  setModes(getAllSubWindowOpenModes());
                }}
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
