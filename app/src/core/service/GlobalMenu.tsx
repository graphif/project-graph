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
import { loadAllServices } from "@/core/loadAllServices";
import { Project } from "@/core/Project";
import { activeProjectAtom, isClassroomModeAtom, projectsAtom, store } from "@/state";
import AIWindow from "@/sub/AIWindow";
import SettingsWindow from "@/sub/SettingsWindow";
import { deserialize, serialize } from "@graphif/serializer";
import { getVersion } from "@tauri-apps/api/app";
import { appCacheDir, dataDir, join } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open as openFilePath, open as shellOpen } from "@tauri-apps/plugin-shell";
import { useAtom } from "jotai";
import {
  Airplay,
  AppWindow,
  Axe,
  Bot,
  Bug,
  CircleAlert,
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
  FileType,
  Folder,
  FolderClock,
  FolderCog,
  FolderOpen,
  FolderTree,
  Fullscreen,
  Keyboard,
  MapPin,
  MessageCircleWarning,
  MousePointer2,
  Palette,
  PersonStanding,
  Radiation,
  Redo,
  RefreshCcwDot,
  Save,
  Scaling,
  SettingsIcon,
  SquareDashedMousePointer,
  TestTube2,
  TextQuote,
  Trash,
  Undo,
  View,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { ProjectUpgrader } from "../stage/ProjectUpgrader";
import { LineEdge } from "../stage/stageObject/association/LineEdge";
import { TextNode } from "../stage/stageObject/entity/TextNode";
import { RecentFileManager } from "./dataFileService/RecentFileManager";
import { Telemetry } from "./Telemetry";

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

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setRecentFiles(await RecentFileManager.getRecentFiles());
    const ver = await getVersion();
    setVersion(ver);
    setIsUnstableVersion(ver.includes("alpha") || ver.includes("beta") || ver.includes("rc") || ver.includes("dev"));
  }

  return (
    <Menubar className="shrink-0">
      {/* 文件 */}
      <Menu>
        <Trigger>
          <File />
          文件
        </Trigger>
        <Content>
          <Item onClick={() => onNewDraft()}>
            <FilePlus />
            新建
          </Item>
          <Item
            onClick={async () => {
              await onOpenFile(undefined, "GlobalMenu");
              await refresh();
            }}
          >
            <FolderOpen />
            打开
          </Item>
          <Sub>
            <SubTrigger>
              <FileClock />
              最近打开的文件
            </SubTrigger>
            <SubContent>
              {recentFiles.map((file) => (
                <Item
                  key={file.uri.toString()}
                  onClick={async () => {
                    await onOpenFile(file.uri, "GlobalMenu最近打开的文件");
                    await refresh();
                  }}
                >
                  <File />
                  {file.uri.toString()}
                </Item>
              ))}
              <Separator />
              <Item
                variant="destructive"
                onClick={async () => {
                  await RecentFileManager.clearAllRecentFiles();
                  await refresh();
                }}
              >
                <Trash />
                清空
              </Item>
            </SubContent>
          </Sub>
          <Separator />
          <Item
            disabled={!activeProject}
            onClick={() => {
              activeProject?.save();
            }}
          >
            <Save />
            保存
          </Item>
          <Item
            disabled={!activeProject}
            onClick={async () => {
              const path = await open({
                title: "另存为",
                directory: false,
                multiple: false,
                filters: [{ name: "Project Graph", extensions: ["prg"] }],
              });
              if (!path) return;
              activeProject!.uri = URI.file(path);
              await activeProject!.save();
            }}
          >
            <FileDown />
            另存为
          </Item>
          <Separator />
          <Sub>
            <SubTrigger>
              <FileInput />
              导入
            </SubTrigger>
            <SubContent>
              <Item>
                <FolderTree />
                根据文件夹生成嵌套图
              </Item>
            </SubContent>
          </Sub>
          <Sub>
            <SubTrigger disabled={!activeProject}>
              <FileOutput />
              导出
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
                        title: "导出为 SVG",
                        filters: [{ name: "Scalable Vector Graphics", extensions: ["svg"] }],
                      });
                      if (!path) return;
                      await writeTextFile(path, svg);
                    }}
                  >
                    <FileDigit />
                    导出全部内容
                  </Item>
                  <Item
                    onClick={async () => {
                      const svg = activeProject!.stageExportSvg.dumpSelectedToSVGString();
                      const path = await save({
                        title: "导出为 SVG",
                        filters: [{ name: "Scalable Vector Graphics", extensions: ["svg"] }],
                      });
                      if (!path) return;
                      await writeTextFile(path, svg);
                    }}
                  >
                    <MousePointer2 />
                    导出选中内容
                  </Item>
                </SubContent>
              </Sub>
              <Item>
                <FileImage />
                PNG
              </Item>
              <Item>
                <FileType />
                Markdown
              </Item>
              <Sub>
                <SubTrigger>
                  <TextQuote />
                  纯文本
                </SubTrigger>
                <SubContent>
                  <Item
                    onClick={() => {
                      const entities = activeProject!.stageManager.getEntities();
                      const result = activeProject!.stageExport.getPlainTextByEntities(entities);
                      Dialog.copy("导出成功", "", result);
                    }}
                  >
                    <FileDigit />
                    导出全部内容
                  </Item>
                  <Item>
                    <MousePointer2 />
                    导出选中内容
                  </Item>
                </SubContent>
              </Sub>
            </SubContent>
          </Sub>
        </Content>
      </Menu>

      {/* 位置 */}
      <Menu>
        <Trigger>
          <Folder />
          位置
        </Trigger>
        <Content>
          <Item
            onClick={async () => {
              const path = await join(await dataDir(), "liren.project-graph");
              openFilePath(path);
            }}
          >
            <FolderCog />
            打开软件配置文件夹
          </Item>
          <Item
            onClick={async () => {
              const path = await appCacheDir();
              openFilePath(path);
            }}
          >
            <FolderClock />
            打开软件缓存文件夹
          </Item>
          <Item
            disabled={!activeProject || activeProject.isDraft}
            onClick={async () => {
              const absPath = activeProject!.uri.fsPath;
              openFilePath(absPath);
            }}
          >
            <FolderOpen />
            打开当前项目文件夹
          </Item>
        </Content>
      </Menu>

      {/* 视野 */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <View />
          视野
        </Trigger>
        <Content>
          <Item
            onClick={() => {
              activeProject?.camera.reset();
            }}
          >
            <Fullscreen />
            根据全部内容重置视野
          </Item>
          <Item
            onClick={() => {
              activeProject?.camera.resetBySelected();
            }}
          >
            <SquareDashedMousePointer />
            根据选中内容重置视野
          </Item>
          <Item
            onClick={() => {
              activeProject?.camera.resetScale();
            }}
          >
            <Scaling />
            重置视野缩放到标准大小
          </Item>
          <Item
            onClick={() => {
              activeProject?.camera.resetLocationToZero();
            }}
          >
            <MapPin />
            移动视野到坐标轴原点
          </Item>
        </Content>
      </Menu>

      {/* 操作 */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <Axe />
          操作
        </Trigger>
        <Content>
          <Item>
            <RefreshCcwDot />
            刷新
          </Item>
          <Item
            onClick={() => {
              activeProject?.historyManager.undo();
            }}
          >
            <Undo />
            撤销
          </Item>
          <Item
            onClick={() => {
              activeProject?.historyManager.redo();
            }}
          >
            <Redo />
            重做
          </Item>
          <Item
            onClick={() => {
              activeProject?.controller.pressingKeySet.clear();
            }}
          >
            <Keyboard />
            松开按键
          </Item>
          <Item
            onClick={async () => {
              if (await Dialog.confirm("确认清空舞台？", "此操作无法撤销！", { destructive: true })) {
                activeProject!.stage = [];
              }
            }}
          >
            <Radiation />
            清空舞台
          </Item>
        </Content>
      </Menu>

      {/* 设置 */}
      <Menu>
        <Trigger>
          <SettingsIcon />
          设置
        </Trigger>
        <Content>
          <Item onClick={() => SettingsWindow.open("settings")}>
            <SettingsIcon />
            设置
          </Item>
          <Item onClick={() => SettingsWindow.open("appearance")}>
            <Palette />
            个性化
          </Item>
          <Sub>
            <SubTrigger disabled={!activeProject}>
              <TestTube2 />
              测试功能
            </SubTrigger>
            <SubContent>
              <Item variant="destructive">仅供测试使用！</Item>
              <Item
                onClick={() => {
                  const tn1 = new TextNode(activeProject!, { text: "tn1" });
                  const tn2 = new TextNode(activeProject!, { text: "tn2" });
                  const le = LineEdge.fromTwoEntity(activeProject!, tn1, tn2);
                  console.log(serialize([tn1, tn2, le]));
                }}
              >
                序列化引用机制
              </Item>
              <Item
                onClick={() => {
                  activeProject!.renderer.tick = function () {
                    throw new Error("test");
                  };
                }}
              >
                连带bug
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
                编辑文本节点
              </Item>
              <Item
                onClick={() => {
                  window.location.reload();
                }}
              >
                refresh
              </Item>
            </SubContent>
          </Sub>
        </Content>
      </Menu>

      {/* AI */}
      <Menu>
        <Trigger disabled={!activeProject}>
          <Bot />
          AI
        </Trigger>
        <Content>
          <Item onClick={() => AIWindow.open()}>
            <ExternalLink />
            打开 AI 面板
          </Item>
        </Content>
      </Menu>

      {/* 视图 */}
      <Menu>
        <Trigger>
          <AppWindow />
          视图
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
            全屏
          </Item>
          <Item
            onClick={async () => {
              if (!isClassroomMode) {
                toast.info("左上角菜单按钮仅仅是透明了，并没有消失");
              }
              const newValue = !isClassroomMode;
              setIsClassroomMode(newValue);
            }}
          >
            <Airplay />
            专注模式
          </Item>
          {/* TODO: 隐私模式 */}
          {/* <Item>
            <VenetianMask />
            隐私模式
          </Item> */}
        </Content>
      </Menu>

      {/* 关于 */}
      <Menu>
        <Trigger>
          <CircleAlert />
          关于
        </Trigger>
        <Content>
          <Item onClick={() => SettingsWindow.open()}>
            <MessageCircleWarning />
            关于
          </Item>
          <Item>
            <PersonStanding />
            新手引导
          </Item>
        </Content>
      </Menu>

      {isUnstableVersion && (
        <Menu>
          <Trigger className="*:text-destructive! text-destructive!">
            <MessageCircleWarning />
            测试版
          </Trigger>
          <Content>
            <Item variant="destructive">v{version}</Item>
            <Item variant="destructive">此版本并非正式版</Item>
            <Item variant="destructive">可能包含 Bug 和未完善的功能</Item>
            <Separator />
            <Item onClick={() => shellOpen("https://github.com/graphif/project-graph/issues/487")}>
              <Bug />
              报告 Bug: 在 Issue #487 中评论
            </Item>
          </Content>
        </Menu>
      )}
    </Menubar>
  );
}

export async function onNewDraft() {
  const project = Project.newDraft();
  loadAllServices(project);
  await project.init();
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
  let stage: Record<string, any>[];
  if (uri.fsPath.endsWith(".json")) {
    const content = await readTextFile(uri.fsPath);
    const json = JSON.parse(content);
    const t = performance.now();
    stage = await toast
      .promise(ProjectUpgrader.convertVAnyToN1(json), {
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
  loadAllServices(project);
  const loadServiceTime = performance.now() - t;
  await RecentFileManager.addRecentFileByUri(uri);
  toast.promise(project.init(), {
    loading: "正在打开文件...",
    success: () => {
      if (stage) {
        project.stage = deserialize(stage, project);
      }
      const readFileTime = performance.now() - t;
      store.set(projectsAtom, [...store.get(projectsAtom), project]);
      store.set(activeProjectAtom, project);
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
  });
}
