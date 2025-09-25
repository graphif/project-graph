import { Dialog } from "@/components/ui/dialog";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

import { loadAllServicesAfterInit, loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { Project } from "@/core/Project";
import { activeProjectAtom, isClassroomModeAtom, projectsAtom, store } from "@/state";
import AIWindow from "@/sub/AIWindow";
import AttachmentsWindow from "@/sub/AttachmentsWindow";
import ExportPngWindow from "@/sub/ExportPngWindow";
import FindWindow from "@/sub/FindWindow";
import GenerateNodeTree, { GenerateNodeGraph } from "@/sub/GenerateNodeWindow";
import LoginWindow from "@/sub/LoginWindow";
import NodeDetailsWindow from "@/sub/NodeDetailsWindow";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import TestWindow from "@/sub/TestWindow";
import UserWindow from "@/sub/UserWindow";
import { getDeviceId } from "@/utils/otherApi";
import { PathString } from "@/utils/pathString";
import { Color } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Decoder } from "@msgpack/msgpack";
import { getVersion } from "@tauri-apps/api/app";
import { appCacheDir, dataDir, join } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { useAtom } from "jotai";
import {
  Airplay,
  AppWindow,
  Axe,
  Bot,
  CircleAlert,
  CircleDot,
  Dumbbell,
  ExternalLink,
  File,
  FileClock,
  FileCode,
  FileDigit,
  FileDown,
  FileImage,
  FileInput,
  FileOutput,
  FilePlus,
  Folder,
  FolderClock,
  FolderCog,
  FolderOpen,
  FolderTree,
  Frown,
  Fullscreen,
  GitCompareArrows,
  Grip,
  Images,
  Keyboard,
  LayoutGrid,
  Loader,
  MapPin,
  MessageCircleWarning,
  MousePointer2,
  Move3d,
  Network,
  Palette,
  Paperclip,
  PersonStanding,
  PictureInPicture2,
  Plus,
  Rabbit,
  Radiation,
  Redo,
  RefreshCcwDot,
  Rows4,
  Columns4,
  Save,
  Scaling,
  Search,
  SettingsIcon,
  SquareDashedMousePointer,
  Tag,
  TestTube2,
  TextQuote,
  Tv,
  Undo,
  VenetianMask,
  View,
  Bug,
  BookOpenText,
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { ProjectUpgrader } from "../stage/ProjectUpgrader";
import { LineEdge } from "../stage/stageObject/association/LineEdge";
import { TextNode } from "../stage/stageObject/entity/TextNode";
import { RecentFileManager } from "./dataFileService/RecentFileManager";
import { DragFileIntoStageEngine } from "./dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";
import { FeatureFlags } from "./FeatureFlags";
import { Settings } from "./Settings";
import { Telemetry } from "./Telemetry";
import TagWindow from "@/sub/TagWindow";

const Content = MenubarContent;
const Item = MenubarItem;
const Menu = MenubarMenu;
const Separator = MenubarSeparator;
const Sub = MenubarSub;
const SubContent = MenubarSubContent;
const SubTrigger = MenubarSubTrigger;
const Trigger = MenubarTrigger;

export function GlobalMenu() {
  // const [projects, setProjects] = useAtom(projectsAtom);
  const [activeProject] = useAtom(activeProjectAtom);
  const [isClassroomMode, setIsClassroomMode] = useAtom(isClassroomModeAtom);
  const [recentFiles, setRecentFiles] = useState<RecentFileManager.RecentFile[]>([]);
  const [version, setVersion] = useState<string>("");
  const [isUnstableVersion, setIsUnstableVersion] = useState(false);
  const { t } = useTranslation("globalMenu");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setRecentFiles(await RecentFileManager.getRecentFiles());
    const ver = await getVersion();
    setVersion(ver);
    setIsUnstableVersion(
      ver.includes("alpha") ||
        ver.includes("beta") ||
        ver.includes("rc") ||
        ver.includes("dev") ||
        ver.includes("nightly"),
    );
  }

  return (
    <Menubar className="shrink-0">
      {/* 文件 */}
      <Menu>
        <Trigger>
          <File />
          {t("file.title")}
        </Trigger>
        <Content>
          <Item onClick={() => onNewDraft()}>
            <FilePlus />
            {t("file.new")}
          </Item>
          <Item
            onClick={async () => {
              await onOpenFile(undefined, "GlobalMenu");
              await refresh();
            }}
          >
            <FolderOpen />
            {t("file.open")}
          </Item>
          <Sub>
            <SubTrigger>
              <FileClock />
              {t("file.recentFiles")}
            </SubTrigger>
            <SubContent>
              {recentFiles
                .toReversed()
                .slice(0, 12)
                .map((file) => (
                  <Item
                    key={file.uri.toString()}
                    onClick={async () => {
                      await onOpenFile(file.uri, "GlobalMenu最近打开的文件");
                      await refresh();
                    }}
                  >
                    <File />
                    {PathString.absolute2file(decodeURI(file.uri.toString()))}
                  </Item>
                ))}
              {recentFiles.length > 12 && (
                <>
                  <Separator />
                  <span className="p-2 text-sm opacity-50">注：此处仅显示12个</span>
                </>
              )}

              {/* <Item
                variant="destructive"
                onClick={async () => {
                  await RecentFileManager.clearAllRecentFiles();
                  await refresh();
                }}
              >
                <Trash />
                {t("file.clear")}
              </Item> */}
            </SubContent>
          </Sub>
          {recentFiles.length > 12 && (
            <Item
              onClick={() => {
                RecentFilesWindow.open();
              }}
            >
              <LayoutGrid />
              查看全部历史文件
            </Item>
          )}
          <Separator />
          <Item
            disabled={!activeProject}
            onClick={() => {
              activeProject?.save();
            }}
          >
            <Save />
            {t("file.save")}
          </Item>
          <Item
            disabled={!activeProject}
            onClick={async () => {
              const path = await save({
                title: t("file.saveAs"),
                filters: [{ name: "Project Graph", extensions: ["prg"] }],
              });
              if (!path) return;
              activeProject!.uri = URI.file(path);
              await activeProject!.save();
            }}
          >
            <FileDown />
            {t("file.saveAs")}
          </Item>
          <Separator />
          <Sub>
            <SubTrigger>
              <FileInput />
              {t("file.import")}
            </SubTrigger>
            <SubContent>
              <Item
                disabled={!activeProject}
                onClick={async () => {
                  const path = await open({
                    title: "打开文件夹",
                    directory: true,
                    multiple: false,
                    filters: [],
                  });
                  console.log(path);
                  if (!path) {
                    return;
                  }
                  activeProject!.generateFromFolder.generateFromFolder(path);
                }}
              >
                <FolderTree />
                {t("file.importFromFolder")}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={async () => {
                  const pathList = await open({
                    title: "打开文件",
                    directory: false,
                    multiple: true,
                    filters: [{ name: "*", extensions: ["png"] }],
                  });
                  console.log(pathList);
                  if (!pathList) {
                    return;
                  }
                  for (const path of pathList) {
                    DragFileIntoStageEngine.handleDropPng(activeProject!, path);
                  }
                }}
              >
                <Images />
                导入PNG图片
              </Item>
              <Item
                disabled={!activeProject}
                onClick={async () => {
                  const pathList = await open({
                    title: "打开文件",
                    directory: false,
                    multiple: true,
                    filters: [{ name: "*", extensions: ["svg"] }],
                  });
                  console.log(pathList);
                  if (!pathList) {
                    return;
                  }
                  for (const path of pathList) {
                    DragFileIntoStageEngine.handleDropSvg(activeProject!, path);
                  }
                }}
              >
                <Images />
                导入SVG图片
              </Item>
            </SubContent>
          </Sub>

          {/* 各种导出 */}
          <Sub>
            <SubTrigger disabled={!activeProject}>
              <FileOutput />
              {t("file.export")}
            </SubTrigger>
            <SubContent>
              <Sub>
                <SubTrigger>
                  <FileCode />
                  SVG
                </SubTrigger>
                <SubContent>
                  <Item
                    onClick={async () => {
                      const svg = activeProject!.stageExportSvg.dumpStageToSVGString();
                      const path = await save({
                        title: t("file.exportAsSVG"),
                        filters: [{ name: "Scalable Vector Graphics", extensions: ["svg"] }],
                      });
                      if (!path) return;
                      await writeTextFile(path, svg);
                    }}
                  >
                    <FileDigit />
                    {t("file.exportAll")}
                  </Item>
                  <Item
                    onClick={async () => {
                      const svg = activeProject!.stageExportSvg.dumpSelectedToSVGString();
                      const path = await save({
                        title: t("file.exportAsSVG"),
                        filters: [{ name: "Scalable Vector Graphics", extensions: ["svg"] }],
                      });
                      if (!path) return;
                      await writeTextFile(path, svg);
                    }}
                  >
                    <MousePointer2 />
                    {t("file.exportSelected")}
                  </Item>
                </SubContent>
              </Sub>
              <Item onClick={() => ExportPngWindow.open()}>
                <FileImage />
                PNG
              </Item>
              {/*<Item>
                <FileType />
                Markdown
              </Item>*/}
              <Sub>
                <SubTrigger>
                  <TextQuote />
                  {t("file.plainText")}
                </SubTrigger>
                <SubContent>
                  {/* 导出 全部 网状关系 */}
                  <Item
                    onClick={() => {
                      if (!activeProject) {
                        toast.warning(t("file.noProject"));
                        return;
                      }
                      const entities = activeProject.stageManager.getEntities();
                      const result = activeProject.stageExport.getPlainTextByEntities(entities);
                      Dialog.copy(t("file.exportSuccess"), "", result);
                    }}
                  >
                    <FileDigit />
                    {t("file.plainTextType.exportAllNodeGraph")}
                  </Item>
                  {/* 导出 选中 网状关系 */}
                  <Item
                    onClick={() => {
                      if (!activeProject) {
                        toast.warning(t("file.noProject"));
                        return;
                      }
                      const entities = activeProject.stageManager.getEntities();
                      const selectedEntities = entities.filter((entity) => entity.isSelected);
                      const result = activeProject.stageExport.getPlainTextByEntities(selectedEntities);
                      Dialog.copy(t("file.exportSuccess"), "", result);
                    }}
                  >
                    <MousePointer2 />
                    {t("file.plainTextType.exportSelectedNodeGraph")}
                  </Item>
                  {/* 导出 选中 树状关系 （纯文本缩进） */}
                  <Item
                    onClick={() => {
                      const textNode = getOneSelectedTextNodeWhenExportingPlainText(activeProject);
                      if (textNode) {
                        const result = activeProject!.stageExport.getTabStringByTextNode(textNode);
                        Dialog.copy(t("file.exportSuccess"), "", result);
                      }
                    }}
                  >
                    <MousePointer2 />
                    {t("file.plainTextType.exportSelectedNodeTree")}
                  </Item>
                  {/* 导出 选中 树状关系 （Markdown格式） */}
                  <Item
                    onClick={() => {
                      const textNode = getOneSelectedTextNodeWhenExportingPlainText(activeProject);
                      if (textNode) {
                        const result = activeProject!.stageExport.getMarkdownStringByTextNode(textNode);
                        Dialog.copy(t("file.exportSuccess"), "", result);
                      }
                    }}
                  >
                    <MousePointer2 />
                    {t("file.plainTextType.exportSelectedNodeTreeMarkdown")}
                  </Item>
                </SubContent>
              </Sub>
            </SubContent>
          </Sub>

          <Separator />

          {/* 附件管理器 */}
          <Item disabled={!activeProject} onClick={() => AttachmentsWindow.open()}>
            <Paperclip />
            {t("file.attachments")}
          </Item>

          {/* 标签管理器 */}
          <Item
            disabled={!activeProject}
            onClick={() => {
              TagWindow.open();
            }}
          >
            <Tag />
            {t("file.tags")}
          </Item>
        </Content>
      </Menu>

      {/* 位置 */}
      <Menu>
        <Trigger>
          <Folder />
          {t("location.title")}
        </Trigger>
        <Content>
          <Item
            onClick={async () => {
              const path = await join(await dataDir(), "liren.project-graph");
              await shellOpen(path);
            }}
          >
            <FolderCog />
            {t("location.openConfigFolder")}
          </Item>
          <Item
            onClick={async () => {
              const path = await appCacheDir();
              await shellOpen(path);
            }}
          >
            <FolderClock />
            {t("location.openCacheFolder")}
          </Item>
          <Item
            disabled={!activeProject || activeProject.isDraft}
            onClick={async () => {
              const path = await join(activeProject!.uri.fsPath, "..");
              await shellOpen(path);
            }}
          >
            <FolderOpen />
            {t("location.openCurrentProjectFolder")}
          </Item>
        </Content>
      </Menu>

      {/* 视野 */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <View />
          {t("view.title")}
        </Trigger>
        <Content>
          <Item
            onClick={() => {
              activeProject?.camera.reset();
            }}
          >
            <Fullscreen />
            {t("view.resetViewAll")}
          </Item>
          <Item
            onClick={() => {
              activeProject?.camera.resetBySelected();
            }}
          >
            <SquareDashedMousePointer />
            {t("view.resetViewSelected")}
          </Item>
          <Item
            onClick={() => {
              activeProject?.camera.resetScale();
            }}
          >
            <Scaling />
            {t("view.resetViewScale")}
          </Item>
          <Item
            onClick={() => {
              activeProject?.camera.resetLocationToZero();
            }}
          >
            <MapPin />
            {t("view.moveViewToOrigin")}
          </Item>
        </Content>
      </Menu>

      {/* 操作 */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <Axe />
          {t("actions.title")}
        </Trigger>
        <Content>
          <Item
            onClick={() => {
              FindWindow.open();
            }}
          >
            <Search />
            {t("actions.search")}
          </Item>
          <Item>
            <RefreshCcwDot />
            {t("actions.refresh")}
          </Item>
          <Item
            onClick={() => {
              activeProject?.historyManager.undo();
            }}
          >
            <Undo />
            {t("actions.undo")}
          </Item>
          <Item
            onClick={() => {
              activeProject?.historyManager.redo();
            }}
          >
            <Redo />
            {t("actions.redo")}
          </Item>
          <Item
            onClick={() => {
              activeProject?.controller.pressingKeySet.clear();
            }}
          >
            <Keyboard />
            {t("actions.releaseKeys")}
          </Item>
          {/* 生成子菜单 */}
          <Sub>
            <SubTrigger>
              <Plus />
              {t("actions.generate.title")}
            </SubTrigger>
            <SubContent>
              <Item
                onClick={async () => {
                  GenerateNodeTree.open();
                }}
              >
                <Network className="-rotate-90" />
                {t("actions.generate.generateNodeTreeByText")}
              </Item>
              <Item
                onClick={async () => {
                  GenerateNodeGraph.open();
                }}
              >
                <GitCompareArrows />
                {t("actions.generate.generateNodeGraphByText")}
              </Item>
            </SubContent>
          </Sub>
          {/* 清空舞台最不常用，放在最后一个 */}
          <Item
            className="*:text-destructive! text-destructive!"
            onClick={async () => {
              if (
                await Dialog.confirm(t("actions.confirmClearStage"), t("actions.irreversible"), { destructive: true })
              ) {
                activeProject!.stage = [];
              }
            }}
          >
            <Radiation />
            <span className="">{t("actions.clearStage")}</span>
          </Item>
        </Content>
      </Menu>

      {/* 设置 */}
      <Menu>
        <Trigger>
          <SettingsIcon />
          {t("settings.title")}
        </Trigger>
        <Content>
          <Item onClick={() => SettingsWindow.open("settings")}>
            <SettingsIcon />
            {t("settings.title")}
          </Item>
          <Sub>
            <SubTrigger>
              <Rabbit />
              自动化操作设置
            </SubTrigger>
            <SubContent>
              <Item
                onClick={() => {
                  Dialog.input("设置自动命名", "填入参数写法详见设置页面", {
                    defaultValue: Settings.autoNamerTemplate,
                  }).then((result) => {
                    if (!result) return;
                    Settings.autoNamerTemplate = result;
                  });
                }}
              >
                <span>创建节点时填入命名：</span>
                <span>{Settings.autoNamerTemplate}</span>
              </Item>
              <Item
                onClick={() => {
                  Dialog.input("设置自动框命名", "填入参数写法详见设置页面", {
                    defaultValue: Settings.autoNamerSectionTemplate,
                  }).then((result) => {
                    if (!result) return;
                    Settings.autoNamerSectionTemplate = result;
                  });
                }}
              >
                <span>创建框时自动命名：</span>
                <span>{Settings.autoNamerSectionTemplate}</span>
              </Item>
              <Item
                onClick={() => {
                  Dialog.confirm("确认改变？", Settings.autoFillNodeColorEnable ? "即将关闭" : "即将开启").then(() => {
                    Settings.autoFillNodeColorEnable = !Settings.autoFillNodeColorEnable;
                  });
                }}
              >
                <span>创建节点时自动上色是否开启：</span>
                <span>{Settings.autoFillNodeColorEnable ? "开启" : "关闭"}</span>
              </Item>
              <Item
                onClick={() => {
                  Dialog.input(
                    "设置自动上色",
                    "填入颜色数组式代码[r, g, b, a]，其中a为不透明度，取之范围在0-1之间，例如纯红色[255, 0, 0, 1]",
                    {
                      defaultValue: JSON.stringify(new Color(...Settings.autoFillNodeColor).toArray()),
                    },
                  ).then((result) => {
                    if (!result) return;
                    // 解析字符串
                    const colorArray: [number, number, number, number] = JSON.parse(result);
                    if (colorArray.length !== 4) {
                      toast.error("颜色数组长度必须为4");
                      return;
                    }
                    const color = new Color(...colorArray);
                    if (color.a < 0 || color.a > 1) {
                      toast.error("颜色不透明度必须在0-1之间");
                      return;
                    }
                    Settings.autoFillNodeColor = colorArray;
                  });
                }}
              >
                <span>创建节点时自动上色：</span>
                <span>{JSON.stringify(Settings.autoFillNodeColor)}</span>
              </Item>
            </SubContent>
          </Sub>
          <Item onClick={() => SettingsWindow.open("appearance")}>
            <Palette />
            {t("settings.appearance")}
          </Item>
          <Item
            className="*:text-destructive! text-destructive!"
            onClick={async () => {
              if (
                await Dialog.confirm(
                  "确认重置全部快捷键",
                  "此操作会将所有快捷键恢复为默认值，无法撤销。\n\n是否继续？",
                  { destructive: true },
                )
              ) {
                try {
                  const activeProject = store.get(activeProjectAtom);
                  if (activeProject) {
                    await activeProject.keyBinds.resetAllKeyBinds();
                    toast.success("所有快捷键已重置为默认值");
                  }
                } catch (error) {
                  toast.error("重置快捷键失败");
                  console.error("重置快捷键失败:", error);
                }
              }
            }}
          >
            <Radiation />
            重置全部快捷键
          </Item>
        </Content>
      </Menu>

      {/* AI */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <Bot />
          {t("ai.title")}
        </Trigger>
        <Content>
          <Item onClick={() => AIWindow.open()}>
            <ExternalLink />
            {t("ai.openAIPanel")}
          </Item>
        </Content>
      </Menu>

      {/* 视图 */}
      <Menu>
        <Trigger>
          <AppWindow />
          {t("window.title")}
        </Trigger>
        <Content>
          <Item
            onClick={() =>
              getCurrentWindow()
                .isFullscreen()
                .then((res) => getCurrentWindow().setFullscreen(!res))
            }
          >
            <Fullscreen />
            {t("window.fullscreen")}
          </Item>
          <Item
            disabled={!activeProject}
            onClick={async () => {
              setIsClassroomMode(!Settings.isClassroomMode);
              Settings.isClassroomMode = !Settings.isClassroomMode;
            }}
          >
            <Airplay />
            {activeProject ? (
              <>
                {isClassroomMode ? "退出" : "开启"}
                {t("window.classroomMode")}（顶部菜单在鼠标移开时透明）
              </>
            ) : (
              "请先打开工程文件才能使用此功能"
            )}
          </Item>
          <Item
            disabled={!activeProject}
            onClick={() => {
              if (Settings.protectingPrivacy) {
                toast.info("您已退出隐私模式，再次点击将进入隐私模式");
              } else {
                toast.success("您已进入隐私模式，再次点击将退出隐私模式，现在您可以放心地截图、将bug报告给开发者了");
              }
              Settings.protectingPrivacy = !Settings.protectingPrivacy;
            }}
          >
            <VenetianMask />
            {activeProject ? "进入/退出 隐私模式" : "请先打开工程文件才能使用此功能"}
          </Item>
          <Item
            disabled={!activeProject}
            onClick={() => {
              Settings.isStealthModeEnabled = !Settings.isStealthModeEnabled;
            }}
          >
            <CircleDot />
            {activeProject ? <span>开启/关闭狙击镜</span> : "请先打开工程文件才能使用此功能"}
          </Item>
          <Sub>
            <SubTrigger>
              <LayoutGrid />
              背景网格与坐标设置
            </SubTrigger>
            <SubContent>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.showBackgroundHorizontalLines = !Settings.showBackgroundHorizontalLines;
                }}
              >
                <Rows4 />
                {activeProject ? <span>开启/关闭 背景横线</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.showBackgroundVerticalLines = !Settings.showBackgroundVerticalLines;
                }}
              >
                <Columns4 />
                {activeProject ? <span>开启/关闭 背景竖线</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.showBackgroundDots = !Settings.showBackgroundDots;
                }}
              >
                <Grip />
                {activeProject ? <span>开启/关闭 背景洞洞板</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.showBackgroundCartesian = !Settings.showBackgroundCartesian;
                }}
              >
                <Move3d />
                {activeProject ? <span>开启/关闭 坐标轴</span> : "请先打开工程文件才能使用此功能"}
              </Item>
            </SubContent>
          </Sub>
          <Sub>
            <SubTrigger>
              <PictureInPicture2 />
              调整舞台透明度
            </SubTrigger>
            <SubContent>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.windowBackgroundAlpha = Settings.windowBackgroundAlpha === 0 ? 1 : 0;
                }}
              >
                <PictureInPicture2 />
                {activeProject ? <span>开启/关闭舞台背景颜色透明</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.windowBackgroundAlpha = Math.max(0, Settings.windowBackgroundAlpha - 0.1);
                }}
              >
                <PictureInPicture2 />
                {activeProject ? <span>降低舞台背景不透明度</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.windowBackgroundAlpha = Math.min(1, Settings.windowBackgroundAlpha + 0.1);
                }}
              >
                <PictureInPicture2 />
                {activeProject ? <span>提高舞台背景不透明度</span> : "请先打开工程文件才能使用此功能"}
              </Item>
            </SubContent>
          </Sub>
          <Item
            disabled={!activeProject}
            onClick={() => {
              Settings.showDebug = !Settings.showDebug;
            }}
          >
            <Bug />
            {activeProject ? <span>开启/关闭Debug 模式</span> : "请先打开工程文件才能使用此功能"}
          </Item>
        </Content>
      </Menu>

      {/* 关于 */}
      <Menu>
        <Trigger>
          <CircleAlert />
          {t("about.title")}
        </Trigger>
        <Content>
          <Item onClick={() => SettingsWindow.open("about")}>
            <MessageCircleWarning />
            {t("about.title")}
          </Item>
          <Sub>
            <SubTrigger>
              <BookOpenText />
              图文教程
            </SubTrigger>
            <SubContent>
              <Item
                onClick={() => {
                  shellOpen("https://project-graph.top/docs/app/features/feature/camera");
                }}
              >
                <Globe />
                官网文档
              </Item>
            </SubContent>
          </Sub>
          <Sub>
            <SubTrigger>
              <Tv />
              视频教程
            </SubTrigger>
            <SubContent>
              <Item className="*:text-destructive! text-destructive!">
                <Tv />
                2.1 版本使用教程（筹备中） <Loader />
              </Item>
              <Item
                onClick={() => {
                  shellOpen("https://www.bilibili.com/video/BV19B5WzyEiZ");
                }}
              >
                <Tv />
                1.6 版本基础教程
              </Item>
              <Item
                onClick={() => {
                  shellOpen("https://www.bilibili.com/video/BV1MM5WzKESm");
                }}
              >
                <Tv />
                1.6 版本进阶教程
              </Item>
              <Item
                onClick={() => {
                  shellOpen("https://www.bilibili.com/video/BV1W4k7YqEgU");
                }}
              >
                <Tv />
                1.0 版本宣传片
              </Item>
              <Item
                onClick={() => {
                  shellOpen("https://www.bilibili.com/video/BV1VVpEe4EXG");
                }}
              >
                <Tv />
                pyqt 版本更新后使用教程（考古用 2024.9）
              </Item>
              <Item
                onClick={() => {
                  shellOpen("https://www.bilibili.com/video/BV1hmHKeDE9D");
                }}
              >
                <Tv />
                pyqt 版本使用教程（考古用 2024.8）
              </Item>
            </SubContent>
          </Sub>
          <Item
            onClick={() => {
              toast.warning(
                "由于2.0文件类型变更为了prg，因此新手引导文件无法正常加载，但整体内容与1.8版本几乎一致，请参考1.8版本的新手引导文件。此新手引导文件将在2.1版补充完整。如果您是新用户，建议在github历史中下载1.8版本。github链接在关于页面",
              );
            }}
            className="*:text-destructive! text-destructive!"
          >
            <PersonStanding />
            {t("about.guide")}
            <Frown />
          </Item>
          <Item
            onClick={() =>
              Dialog.confirm(
                "2.0使用提示",
                [
                  "1. 底部工具栏移动至右键菜单（在空白处右键，因为在节点上右键是点击式连线）",
                  "2. 文件从json升级为了prg文件，能够内置图片了，打开旧版本json文件时会自动转为prg文件",
                  "3. 快捷键与秘籍键合并了",
                  "4. 节点详细信息不是markdown格式了",
                  "5. 标签面板暂时关闭了，后续会用更高级的功能代替",
                ].join("\n"),
              )
            }
          >
            <Dumbbell />
            1.8 至 2.0 升级使用指南
          </Item>
        </Content>
      </Menu>

      {isUnstableVersion && (
        <Menu>
          <Trigger className="*:text-destructive! text-destructive!">
            <MessageCircleWarning />
            {t("unstable.title")}
          </Trigger>
          <Content>
            <Item variant="destructive">v{version}</Item>
            <Item variant="destructive">{t("unstable.notRelease")}</Item>
            <Item variant="destructive">{t("unstable.mayHaveBugs")}</Item>
            {/*<Separator />
            <Item onClick={() => shellOpen("https://github.com/graphif/project-graph/issues/487")}>
              <Bug />
              {t("unstable.reportBug")}
            </Item>*/}
            <Separator />
            <Sub>
              <SubTrigger disabled={!activeProject}>
                <TestTube2 />
                {t("unstable.test")}
              </SubTrigger>
              <SubContent>
                <Item variant="destructive">仅供开发使用</Item>
                <Item
                  onClick={() => {
                    TestWindow.open();
                  }}
                >
                  测试窗口
                </Item>
                <Item
                  onClick={() => {
                    const tn1 = new TextNode(activeProject!, { text: "tn1" });
                    const tn2 = new TextNode(activeProject!, { text: "tn2" });
                    const le = LineEdge.fromTwoEntity(activeProject!, tn1, tn2);
                    console.log(serialize([tn1, tn2, le]));
                  }}
                >
                  serialize
                </Item>
                <Item
                  onClick={() => {
                    activeProject!.renderer.tick = function () {
                      throw new Error("test");
                    };
                  }}
                >
                  trigger bug
                </Item>
                <Item
                  onClick={() => {
                    activeProject!.stageManager
                      .getSelectedEntities()
                      .filter((it) => it instanceof TextNode)
                      .forEach((it) => {
                        it.text = "hello world";
                      });
                  }}
                >
                  edit text node
                </Item>
                <Item
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  reload
                </Item>
                <Item
                  onClick={async () => {
                    toast(await getDeviceId());
                  }}
                >
                  get device
                </Item>
                <Sub>
                  <SubTrigger>feature flags</SubTrigger>
                  <SubContent>
                    <Item disabled>telemetry = {FeatureFlags.TELEMETRY ? "true" : "false"}</Item>
                    <Item disabled>ai = {FeatureFlags.AI ? "true" : "false"}</Item>
                    <Item disabled>user = {FeatureFlags.USER ? "true" : "false"}</Item>
                  </SubContent>
                </Sub>
                <Item onClick={() => NodeDetailsWindow.open()}>plate</Item>
                <Item
                  onClick={() => {
                    console.log(activeProject!.stage);
                  }}
                >
                  在控制台输出舞台内容
                </Item>
                <Item
                  onClick={() => {
                    const selectedEntity = activeProject!.stageManager.getSelectedEntities();
                    for (const entity of selectedEntity) {
                      console.log(entity.details);
                    }
                  }}
                >
                  输出选中节点的详细信息
                </Item>
                <Item
                  onClick={() => {
                    const selectedEntity = activeProject!.stageManager.getSelectedEntities();
                    for (const entity of selectedEntity) {
                      console.log(entity.detailsManager.getBeSearchingText());
                    }
                  }}
                >
                  输出选中节点的详细信息转换成Markdown
                </Item>
                <Item onClick={() => LoginWindow.open()}>login</Item>
                <Item onClick={() => UserWindow.open()}>user</Item>
              </SubContent>
            </Sub>
          </Content>
        </Menu>
      )}
    </Menubar>
  );
}

export async function onNewDraft() {
  const project = Project.newDraft();
  loadAllServicesBeforeInit(project);
  await project.init();
  loadAllServicesAfterInit(project);
  store.set(projectsAtom, [...store.get(projectsAtom), project]);
  store.set(activeProjectAtom, project);
}
export async function onOpenFile(uri?: URI, source: string = "unknown") {
  if (!uri) {
    const path = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "工程文件", extensions: ["prg", "json"] }],
    });
    if (!path) return;
    uri = URI.file(path);
  }
  let upgraded: ReturnType<typeof ProjectUpgrader.convertVAnyToN1> extends Promise<infer T> ? T : never;

  // 读取文件内容并判断格式
  const fileData = await readFile(uri.fsPath);

  // 检查是否是以 '{' 开头的 JSON 文件
  if (fileData[0] === 0x7b) {
    // 0x7B 是 '{' 的 ASCII 码
    const content = new TextDecoder().decode(fileData);
    const json = JSON.parse(content);
    const t = performance.now();
    upgraded = await toast
      .promise(ProjectUpgrader.convertVAnyToN1(json, uri), {
        loading: "正在转换旧版项目文件...",
        success: () => {
          const time = performance.now() - t;
          Telemetry.event("转换vany->n1", { time, length: content.length });
          return `转换成功，耗时 ${time}ms`;
        },
        error: (e) => {
          Telemetry.event("转换vany->n1报错", { error: String(e) });
          return `转换失败，已发送错误报告，可在群内联系开发者\n${String(e)}`;
        },
      })
      .unwrap();
    toast.info("您正在尝试导入旧版的文件！稍后如果点击了保存文件，文件会保存为相同文件夹内的 .prg 后缀的文件");
    uri = uri.with({ path: uri.path.replace(/\.json$/, ".prg") });
  }
  // 检查是否是以 0x91 0x86 开头的 msgpack 数据
  if (fileData.length >= 2 && fileData[0] === 0x84 && fileData[1] === 0xa7) {
    const decoder = new Decoder();
    const decodedData = decoder.decode(fileData);
    if (typeof decodedData !== "object" || decodedData === null) {
      throw new Error("msgpack 解码结果不是有效的对象");
    }
    const t = performance.now();
    upgraded = await toast
      .promise(ProjectUpgrader.convertVAnyToN1(decodedData as Record<string, any>, uri), {
        loading: "正在转换旧版项目文件...",
        success: () => {
          const time = performance.now() - t;
          Telemetry.event("转换vany->n1", { time, length: fileData.length });
          return `转换成功，耗时 ${time}ms`;
        },
        error: (e) => {
          Telemetry.event("转换vany->n1报错", { error: String(e) });
          return `转换失败，已发送错误报告，可在群内联系开发者\n${String(e)}`;
        },
      })
      .unwrap();
    toast.info("您正在尝试导入旧版的文件！稍后如果点击了保存文件，文件会保存为相同文件夹内的 .prg 后缀的文件");
    uri = uri.with({ path: uri.path.replace(/\.json$/, ".prg") });
  }

  if (store.get(projectsAtom).some((p) => p.uri.toString() === uri.toString())) {
    store.set(activeProjectAtom, store.get(projectsAtom).find((p) => p.uri.toString() === uri.toString())!);
    store.get(activeProjectAtom)?.loop();
    // 把其他项目pause
    store
      .get(projectsAtom)
      .filter((p) => p.uri.toString() !== uri.toString())
      .forEach((p) => p.pause());
    toast.success("切换到已打开的标签页");
    return;
  }
  const project = new Project(uri);
  const t = performance.now();
  loadAllServicesBeforeInit(project);
  const loadServiceTime = performance.now() - t;
  await RecentFileManager.addRecentFileByUri(uri);
  toast.promise(
    async () => {
      await project.init();
      loadAllServicesAfterInit(project);
    },
    {
      loading: "正在打开文件...",
      success: () => {
        if (upgraded) {
          project.stage = deserialize(upgraded.data, project);
          project.attachments = upgraded.attachments;
        }
        const readFileTime = performance.now() - t;
        store.set(projectsAtom, [...store.get(projectsAtom), project]);
        store.set(activeProjectAtom, project);
        setTimeout(() => {
          project.camera.reset();
        }, 100);
        Telemetry.event("打开文件", {
          loadServiceTime,
          readFileTime,
          source,
        });
        return `耗时 ${readFileTime}ms，共 ${project.stage.length} 个舞台对象，${project.attachments.size} 个附件`;
      },
      error: (e) => {
        Telemetry.event("打开文件失败", {
          error: String(e),
        });
        return `读取时发生错误，已发送错误报告，可在群内联系开发者\n${String(e)}`;
      },
    },
  );
}

/**
 * 获取唯一选中的文本节点，用于导出纯文本时。
 * 如果不符合情况就提前弹窗错误，并返回null
 * @param activeProject
 * @returns
 */
function getOneSelectedTextNodeWhenExportingPlainText(activeProject: Project | undefined): TextNode | null {
  if (!activeProject) {
    toast.warning("请先打开工程文件");
    return null;
  }
  const entities = activeProject.stageManager.getEntities();
  const selectedEntities = entities.filter((entity) => entity.isSelected);
  if (selectedEntities.length === 0) {
    toast.warning("没有选中节点");
    return null;
  } else if (selectedEntities.length === 1) {
    const result = selectedEntities[0];
    if (!(result instanceof TextNode)) {
      toast.warning("必须选中文本节点，而不是其他类型的节点");
      return null;
    }
    if (!activeProject.graphMethods.isTree(result)) {
      toast.warning("不符合树形结构");
      return null;
    }
    return result;
  } else {
    toast.warning(`只能选择一个节点，你选中了${selectedEntities.length}个节点`);
    return null;
  }
}
