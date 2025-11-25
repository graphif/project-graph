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
import { activeProjectAtom, isClassroomModeAtom, isDevAtom, projectsAtom, store } from "@/state";
import AIWindow from "@/sub/AIWindow";
import AttachmentsWindow from "@/sub/AttachmentsWindow";
import LogicNodePanel from "@/sub/AutoComputeWindow";
import ExportPngWindow from "@/sub/ExportPngWindow";
import FindWindow from "@/sub/FindWindow";
import GenerateNodeTree, {
  GenerateNodeGraph,
  GenerateNodeMermaid,
  GenerateNodeTreeByMarkdown,
} from "@/sub/GenerateNodeWindow";
import LoginWindow from "@/sub/LoginWindow";
import NodeDetailsWindow from "@/sub/NodeDetailsWindow";
import OnboardingWindow from "@/sub/OnboardingWindow";
import RecentFilesWindow from "@/sub/RecentFilesWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import TagWindow from "@/sub/TagWindow";
import ReferencesWindow from "@/sub/ReferencesWindow";
import TestWindow from "@/sub/TestWindow";
import UserWindow from "@/sub/UserWindow";
import { getDeviceId } from "@/utils/otherApi";
import { PathString } from "@/utils/pathString";
import { Color, Vector } from "@graphif/data-structures";
import { deserialize, serialize } from "@graphif/serializer";
import { Decoder } from "@msgpack/msgpack";
import { getVersion } from "@tauri-apps/api/app";
import { appCacheDir, dataDir, join, tempDir } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { exists, readFile, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { useAtom } from "jotai";
import {
  Airplay,
  AppWindow,
  Archive,
  Axe,
  BookOpen,
  BookOpenText,
  Bot,
  Bug,
  BugPlay,
  CircleAlert,
  CircleDot,
  CircleMinus,
  CirclePlus,
  Columns4,
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
  FolderClock,
  FolderCog,
  FolderOpen,
  FolderTree,
  Fullscreen,
  GitCompareArrows,
  Globe,
  Grip,
  Images,
  Keyboard,
  LayoutGrid,
  MapPin,
  MessageCircleWarning,
  MousePointer2,
  Move3d,
  Network,
  Palette,
  Paperclip,
  Map,
  PictureInPicture2,
  Plus,
  Rabbit,
  Radiation,
  Redo,
  RefreshCcwDot,
  Rows4,
  Save,
  Scaling,
  Search,
  SettingsIcon,
  SquareDashedMousePointer,
  SquareSquare,
  Tag,
  TestTube2,
  TextQuote,
  Tv,
  Undo,
  VectorSquare,
  VenetianMask,
  View,
  Workflow,
  Link,
  OctagonX,
  Dices,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { ProjectUpgrader } from "../stage/ProjectUpgrader";
import { LineEdge } from "../stage/stageObject/association/LineEdge";
import { TextNode } from "../stage/stageObject/entity/TextNode";
import { AssetsRepository } from "./AssetsRepository";
import { RecentFileManager } from "./dataFileService/RecentFileManager";
import { DragFileIntoStageEngine } from "./dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";
import { FeatureFlags } from "./FeatureFlags";
import { Settings } from "./Settings";
import { Telemetry } from "./Telemetry";
import { Entity } from "../stage/stageObject/abstract/StageEntity";

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
  const [isDev, setIsDev] = useAtom(isDevAtom);
  const { t } = useTranslation("globalMenu");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    await RecentFileManager.sortTimeRecentFiles();
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
    setIsDev(ver.includes("dev"));
  }

  return (
    <Menubar className="shrink-0">
      {/* 文件 */}
      <Menu>
        <Trigger>
          <File />
          <span className="hidden sm:inline">{t("file.title")}</span>
        </Trigger>
        <Content>
          <Item onClick={() => onNewDraft()}>
            <FilePlus />
            {t("file.new")}
          </Item>
          <Item
            disabled={!activeProject || activeProject.isDraft}
            onClick={() => {
              createFileAtCurrentProjectDir(activeProject!, refresh);
            }}
          >
            <FilePlus />
            在当前项目同一文件夹下新建prg文件
          </Item>
          <Item
            onClick={async () => {
              await onOpenFile(undefined, "GlobalMenu");
              await refresh();
            }}
          >
            <FolderOpen />
            {t("file.open")} （.prg / .json）
          </Item>
          <Item
            disabled={!activeProject || activeProject.isDraft}
            onClick={async () => {
              const path = await join(activeProject!.uri.fsPath, "..");
              await shellOpen(path);
            }}
          >
            <FolderOpen />
            打开当前工程文件所在文件夹
          </Item>
          <Sub>
            <SubTrigger
              onMouseEnter={() => {
                // 刷新最近打开的文件列表
                refresh();
              }}
            >
              <FileClock />
              {t("file.recentFiles")}
            </SubTrigger>
            <SubContent>
              {recentFiles.slice(0, 12).map((file) => (
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
          <Item
            onClick={() => {
              RecentFilesWindow.open();
            }}
          >
            <LayoutGrid />
            查看全部历史文件
          </Item>
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
              RecentFileManager.addRecentFileByUri(activeProject!.uri);
              await activeProject!.save();
            }}
          >
            <FileDown />
            {t("file.saveAs")}
          </Item>
          <Item
            onClick={async () => {
              activeProject!.autoSaveBackup.manualBackup();
            }}
          >
            <Archive />
            手动创建备份（防坏档）
          </Item>
          <Item
            onClick={async () => {
              if (Settings.autoBackupCustomPath && Settings.autoBackupCustomPath.trim()) {
                await shellOpen(Settings.autoBackupCustomPath.trim());
              } else {
                toast.error("未设置自定义备份路径");
              }
            }}
          >
            <FolderClock />
            打开自定义备份文件夹
          </Item>
          <Item
            onClick={async () => {
              const path = await appCacheDir();
              await shellOpen(path);
            }}
          >
            <FolderClock />
            打开默认备份文件夹
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
                    <VectorSquare />
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
                    <VectorSquare />
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
                    <Network />
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
                    <Network />
                    {t("file.plainTextType.exportSelectedNodeTreeMarkdown")}
                  </Item>
                  {/* 导出 选中 网状嵌套关系 （mermaid格式） */}
                  <Item
                    onClick={() => {
                      const selectedEntities = activeProject!.stageManager.getSelectedEntities();
                      const result = activeProject!.stageExport.getMermaidTextByEntites(selectedEntities);
                      Dialog.copy(t("file.exportSuccess"), "", result);
                    }}
                  >
                    <SquareSquare />
                    {t("file.plainTextType.exportSelectedNodeGraphMermaid")}
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

          {/* 引用管理器 */}
          <Item
            disabled={!activeProject || activeProject.isDraft}
            onClick={() => {
              ReferencesWindow.open(activeProject!.uri);
            }}
          >
            <Link />
            引用管理器
          </Item>
        </Content>
      </Menu>

      {/* 视野 */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <View />
          <span className="hidden sm:inline">{t("view.title")}</span>
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
          <Item
            onClick={async () => {
              if (!activeProject) return;
              let isValid = false;
              let scale = 1;

              while (!isValid) {
                const scaleStr = await Dialog.input("设置自定义视野大小", "请输入缩放比例（推荐范围：0.1-10）", {
                  defaultValue: scale.toString(),
                });

                if (!scaleStr) return; // 用户取消

                const parsedScale = parseFloat(scaleStr);
                if (isNaN(parsedScale)) {
                  toast.error("请输入有效的数字");
                } else if (parsedScale <= 0) {
                  toast.error("缩放比例必须大于0");
                } else if (parsedScale > 100) {
                  toast.error("缩放比例不能超过100");
                } else {
                  scale = parsedScale;
                  isValid = true;
                }
              }

              // 直接修改camera内部属性
              activeProject.camera.targetScale = scale;
              activeProject.camera.currentScale = scale;
            }}
          >
            <Scaling />
            自定义视野大小
          </Item>
          <Item
            onClick={async () => {
              if (!activeProject) return;

              // 获取并验证X坐标
              let x = 0;
              let xValid = false;
              while (!xValid) {
                const xStr = await Dialog.input("设置自定义视野位置", "请输入X坐标", {
                  defaultValue: x.toString(),
                });

                if (!xStr) return; // 用户取消

                const parsedX = parseFloat(xStr);
                if (isNaN(parsedX)) {
                  toast.error("请输入有效的数字");
                } else {
                  x = parsedX;
                  xValid = true;
                }
              }

              // 获取并验证Y坐标
              let y = 0;
              let yValid = false;
              while (!yValid) {
                const yStr = await Dialog.input("设置自定义视野位置", "请输入Y坐标", {
                  defaultValue: y.toString(),
                });

                if (!yStr) return; // 用户取消

                const parsedY = parseFloat(yStr);
                if (isNaN(parsedY)) {
                  toast.error("请输入有效的数字");
                } else {
                  y = parsedY;
                  yValid = true;
                }
              }

              // 直接修改camera内部位置属性
              activeProject.camera.location.x = x;
              activeProject.camera.location.y = y;
            }}
          >
            <MapPin />
            自定义视野位置
          </Item>
          <Item
            onClick={() => {
              if (!activeProject) return;
              activeProject.camera.clearMoveCommander();
              activeProject.camera.speed = Vector.getZero();
            }}
          >
            <OctagonX />
            停止漂移
          </Item>
          <Item
            onClick={() => {
              if (!activeProject) return;
              const entities = activeProject.stage.filter((entity) => entity instanceof Entity);
              if (entities.length === 0) return;
              const randomEntity = entities[Math.floor(Math.random() * entities.length)];
              activeProject.stageManager.clearSelectAll();
              randomEntity.isSelected = true;
              activeProject.camera.resetBySelected();
            }}
          >
            <Dices />
            聚焦到随机实体
          </Item>
        </Content>
      </Menu>

      {/* 操作 */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <Axe />
          <span className="hidden sm:inline">{t("actions.title")}</span>
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
                  GenerateNodeTreeByMarkdown.open();
                }}
              >
                <Network className="-rotate-90" />
                {t("actions.generate.generateNodeTreeByMarkdown")}
              </Item>
              <Item
                onClick={async () => {
                  GenerateNodeGraph.open();
                }}
              >
                <GitCompareArrows />
                {t("actions.generate.generateNodeGraphByText")}
              </Item>
              <Item
                onClick={async () => {
                  GenerateNodeMermaid.open();
                }}
              >
                <GitCompareArrows />
                {t("actions.generate.generateNodeMermaidByText")}
              </Item>
              <Item
                onClick={() => {
                  LogicNodePanel.open();
                }}
              >
                <Workflow />
                打开逻辑节点面板
              </Item>
              <Item
                onClick={async () => {
                  const result = await Dialog.confirm("详见官网文档：“自动计算引擎”部分", "即将打开网页，是否继续");
                  if (result) {
                    shellOpen("https://graphif.dev/docs/app/features/feature/compute-engine");
                  }
                }}
              >
                <BookOpen />
                逻辑节点详细文档
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
          <span className="hidden sm:inline">{t("settings.title")}</span>
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
          <Item
            onClick={async () => {
              const path = await join(await dataDir(), "liren.project-graph");
              await shellOpen(path);
            }}
          >
            <FolderCog />
            打开软件配置信息文件夹
          </Item>
        </Content>
      </Menu>

      {/* AI */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <Bot />
          <span className="hidden sm:inline">{t("ai.title")}</span>
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
          <span className="hidden sm:inline">{t("window.title")}</span>
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
          <Sub>
            <SubTrigger>
              <CircleDot />
              狙击镜设置
            </SubTrigger>
            <SubContent>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.isStealthModeEnabled = !Settings.isStealthModeEnabled;
                }}
              >
                <CircleDot />
                {activeProject ? <span>开启/关闭狙击镜</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  Settings.stealthModeReverseMask = !Settings.stealthModeReverseMask;
                }}
              >
                <CircleDot />
                {activeProject ? (
                  <span>{Settings.stealthModeReverseMask ? "关闭" : "开启"}反向遮罩</span>
                ) : (
                  "请先打开工程文件才能使用此功能"
                )}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  const newRadius = Math.max(10, Math.min(500, Settings.stealthModeScopeRadius + 50));
                  Settings.stealthModeScopeRadius = newRadius;
                }}
              >
                <CirclePlus />
                {activeProject ? <span>放大狙击镜</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item
                disabled={!activeProject}
                onClick={() => {
                  const newRadius = Math.max(10, Math.min(500, Settings.stealthModeScopeRadius - 50));
                  Settings.stealthModeScopeRadius = newRadius;
                }}
              >
                <CircleMinus />
                {activeProject ? <span>减小狙击镜</span> : "请先打开工程文件才能使用此功能"}
              </Item>
              <Item>提示：可以在设置界面中详细设置大小</Item>
            </SubContent>
          </Sub>
        </Content>
      </Menu>

      {/* 关于 */}
      <Menu>
        <Trigger>
          <CircleAlert />
          <span className="hidden sm:inline">{t("about.title")}</span>
        </Trigger>
        <Content>
          <Item onClick={() => SettingsWindow.open("about")}>
            <MessageCircleWarning />
            {t("about.title")}
          </Item>
          <Item
            onClick={async () => {
              toast.promise(
                async () => {
                  const u8a = await AssetsRepository.fetchFile("tutorials/tutorial-2.0.prg");
                  const dir = await tempDir();
                  const path = await join(dir, `tutorial-${crypto.randomUUID()}.prg`);
                  await writeFile(path, u8a);
                  await onOpenFile(URI.file(path), "功能说明书");
                },
                {
                  loading: "正在下载功能说明书文件",
                },
              );
            }}
          >
            <Map />
            {t("about.guide")}
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
              <Item
                onClick={() => {
                  shellOpen("https://www.bilibili.com/video/BV1y2xdzUEXa");
                }}
              >
                <Tv />
                2.0 版本使用教程
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
          <Trigger className={isDev ? "text-green-500" : "*:text-destructive! text-destructive!"}>
            {/* 增加辨识度，让开发者更容易分辨dev和nightly版本 */}
            {isDev ? <BugPlay /> : <MessageCircleWarning />}
            <span className="hidden sm:inline">{isDev ? "本地开发模式" : t("unstable.title")}</span>
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
              <SubTrigger>
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
                <Item onClick={() => OnboardingWindow.open()}>onboarding</Item>
                <Item
                  onClick={() => {
                    // 在原点100范围内随机创建100个节点
                    for (let i = 0; i < 100; i++) {
                      const x = Math.random() * 200 - 100;
                      const y = Math.random() * 200 - 100;
                      const node = new TextNode(activeProject!, { text: `节点${i + 1}` });
                      node.moveTo(new Vector(x, y));
                      activeProject!.stage.push(node);
                    }
                  }}
                >
                  创建100个节点
                </Item>
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

export async function onOpenFile(uri?: URI, source: string = "unknown"): Promise<Project | undefined> {
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
    const activeProject = store.get(activeProjectAtom);
    if (!activeProject) return;
    activeProject.loop();
    // 把其他项目pause
    store
      .get(projectsAtom)
      .filter((p) => p.uri.toString() !== uri.toString())
      .forEach((p) => p.pause());
    toast.success("切换到已打开的标签页");
    return activeProject;
  }
  const project = new Project(uri);
  const t = performance.now();
  loadAllServicesBeforeInit(project);
  const loadServiceTime = performance.now() - t;

  await toast
    .promise(
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
          RecentFileManager.addRecentFileByUri(uri);
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
    )
    .unwrap();
  return project;
}

/**
 * 在当前激活的工程文件的同一目录下创建prg文件
 */
export async function createFileAtCurrentProjectDir(activeProject: Project | undefined, refresh: () => Promise<void>) {
  if (!activeProject || activeProject.isDraft) return;

  setTimeout(() => {
    Dialog.input("请输入文件名（不需要输入后缀名）").then(async (userInput) => {
      if (userInput === undefined || userInput.trim() === "") return;

      // 检查文件名是否合法
      const invalidChars = /[\\/:*?"<>|]/;
      if (invalidChars.test(userInput)) {
        toast.error('文件名不能包含以下字符：\\ / : * ? " < > |');
        return;
      }

      // 移除可能存在的.prg后缀
      let fileName = userInput.trim();
      if (fileName.endsWith(".prg")) {
        fileName = fileName.slice(0, -4);
      }

      // 创建新文件路径
      const currentDir = PathString.dirPath(activeProject.uri.fsPath);
      const newFilePath = currentDir + "/" + fileName + ".prg";

      // 检查文件是否已存在
      const fileExists = await exists(newFilePath);
      if (fileExists) {
        toast.error(`文件 "${fileName}.prg" 已存在，请使用其他文件名`);
        return;
      }

      const newUri = URI.file(newFilePath);

      // 创建新项目
      const newProject = Project.newDraft();
      newProject.uri = newUri;

      // 初始化项目
      loadAllServicesBeforeInit(newProject);
      newProject
        .init()
        .then(() => {
          loadAllServicesAfterInit(newProject);
          // 在舞台上创建文本节点
          const newTextNode = new TextNode(newProject, {
            text: fileName,
          });
          newProject.stageManager.add(newTextNode);
          newTextNode.isSelected = true;

          // 保存文件
          newProject
            .save()
            .then(async () => {
              // 更新项目列表和活动项目
              store.set(projectsAtom, [...store.get(projectsAtom), newProject]);
              store.set(activeProjectAtom, newProject);
              await RecentFileManager.addRecentFileByUri(newUri);
              await refresh();
              toast.success(`成功创建新文件：${fileName}.prg`);
            })
            .catch((error) => {
              toast.error(`保存文件失败：${String(error)}`);
            });
        })
        .catch((error) => {
          toast.error(`初始化项目失败：${String(error)}`);
        });
    });
  }, 50); // 轻微延迟
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
