import MyContextMenuContent from "@/components/context-menu-content";
import RenderSubWindows from "@/components/render-sub-windows";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import Welcome from "@/components/welcome-page";
import { Project, ProjectState } from "@/core/Project";
import { GlobalMenu } from "@/core/service/GlobalMenu";
import { Settings } from "@/core/service/Settings";
import { Telemetry } from "@/core/service/Telemetry";
import { Themes } from "@/core/service/Themes";
import {
  activeProjectAtom,
  isClassroomModeAtom,
  isClickThroughEnabledAtom,
  isWindowAlwaysOnTopAtom,
  isWindowMaxsizedAtom,
  projectsAtom,
} from "@/state";
import { getVersion } from "@tauri-apps/api/app";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { arch, platform, version } from "@tauri-apps/plugin-os";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { useAtom } from "jotai";
import { ChevronsLeftRight, Copy, Minus, Pin, PinOff, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cpuInfo } from "tauri-plugin-system-info-api";
import { DragFileIntoStageEngine } from "./core/service/dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";
import { cn } from "./utils/cn";
import { isMac, isWindows } from "./utils/platform";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { KeyBindsUI } from "./core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { ProjectTabs } from "./ProjectTabs";
import { DropWindowCover } from "./DropWindowCover";
import ToolbarContent from "./components/toolbar-content";

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, _setMaximized] = useAtom(isWindowMaxsizedAtom);

  const [projects, setProjects] = useAtom(projectsAtom);
  const [activeProject, setActiveProject] = useAtom(activeProjectAtom);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [___, setIsWindowAlwaysOnTop] = useAtom(isWindowAlwaysOnTopAtom);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  // const [isWide, setIsWide] = useState(false);
  const [telemetryEventSent, setTelemetryEventSent] = useState(false);
  const [dropMouseLocation, setDropMouseLocation] = useState<"top" | "middle" | "bottom" | "notInWindowZone">(
    "notInWindowZone",
  );
  const [ignoreMouseEvents, setIgnoreMouseEvents] = useState(false);
  const [isClassroomMode, setIsClassroomMode] = useAtom(isClassroomModeAtom);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [__, setIsClickThroughEnabled] = useAtom(isClickThroughEnabledAtom);

  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  // const { t } = useTranslation("app");

  useEffect(() => {
    window.addEventListener("keyup", async (event) => {
      // 这两个按键有待添加到自定义快捷键，但他们函数内部用到了useState，还不太清楚怎么改
      // ——littlefean（2024年12月27日）
      if (event.key === "F11") {
        // 如果当前已经是最大化的状态
        if (await getCurrentWindow().isMaximized()) {
          _setMaximized(false);
        }
        getCurrentWindow()
          .isFullscreen()
          .then((isFullscreen) => {
            getCurrentWindow().setFullscreen(!isFullscreen);
          });
      }
    });

    // 注册UI级别快捷键
    KeyBindsUI.registerAllUIKeyBinds();
    KeyBindsUI.uiStartListen();

    // 修复鼠标拖出窗口后触发上下文菜单的问题
    window.addEventListener("contextmenu", (event) => {
      if (
        event.clientX < 0 ||
        event.clientX > window.innerWidth ||
        event.clientY < 0 ||
        event.clientY > window.innerHeight
      )
        event.preventDefault();
    });

    // 全局错误处理
    window.addEventListener("error", (event) => {
      Telemetry.event("未知错误", String(event.error));
    });

    // 监听主题样式切换
    Settings.watch("theme", (value) => {
      Themes.applyThemeById(value);
    });

    // 恢复窗口位置大小
    restoreStateCurrent(StateFlags.SIZE | StateFlags.POSITION | StateFlags.MAXIMIZED);

    // setIsWide(window.innerWidth / window.innerHeight > 1.8);

    const unlisten1 = getCurrentWindow().onResized(() => {
      if (!isOnResizedDisabled.current) {
        isMaximizedWorkaround();
      }
      // setIsWide(window.innerWidth / window.innerHeight > 1.8);
    });

    if (!telemetryEventSent) {
      setTelemetryEventSent(true);
      (async () => {
        const cpu = await cpuInfo();
        await Telemetry.event("启动应用", {
          version: await getVersion(),
          os: platform(),
          arch: arch(),
          osVersion: version(),
          cpu: cpu.cpus[0].brand,
          cpuCount: cpu.cpu_count,
        });
      })();
    }

    // 加载完成了，显示窗口
    getCurrentWindow().show();
    // 关闭splash
    getAllWindows().then((windows) => {
      const splash = windows.find((w) => w.label === "splash");
      if (splash) {
        splash.close();
      }
    });

    // TODO: 以后整一个全局快捷键系统
    register("Alt+2", async (event) => {
      if (event.state === "Pressed") {
        setIsClickThroughEnabled((prev) => {
          if (!Settings.allowGlobalHotKeys) {
            toast.warning("已禁用全局快捷键");
            return prev;
          }
          if (!prev) {
            // 开启了穿透点击
            Settings.windowBackgroundAlpha = Settings.windowBackgroundOpacityAfterOpenClickThrough;
            setIsWindowAlwaysOnTop(true);
            getCurrentWindow().setAlwaysOnTop(true);
          } else {
            // 关闭了穿透点击
            Settings.windowBackgroundAlpha = Settings.windowBackgroundOpacityAfterCloseClickThrough;
            setIsWindowAlwaysOnTop(false);
            getCurrentWindow().setAlwaysOnTop(false);
          }
          getCurrentWindow().setIgnoreCursorEvents(!prev);
          return !prev;
        });
      }
    });

    register("Alt+1", async (event) => {
      if (event.state === "Pressed") {
        if (!Settings.allowGlobalHotKeys) {
          toast.warning("已禁用全局快捷键");
          return;
        }
        console.log("开始呼出窗口");
        // 呼出软件窗口
        const window = getCurrentWindow();
        await window.show();
        await window.setSkipTaskbar(false);
        await window.setFocus();
      }
    });

    return () => {
      unlisten1?.then((f) => f());
      KeyBindsUI.uiStopListen();
    };
  }, []);

  useEffect(() => {
    setIsClassroomMode(Settings.isClassroomMode);
  }, [Settings.isClassroomMode]);

  // https://github.com/tauri-apps/tauri/issues/5812
  const isOnResizedDisabled = useRef(false);
  function isMaximizedWorkaround() {
    isOnResizedDisabled.current = true;
    getCurrentWindow()
      .isMaximized()
      .then((isMaximized) => {
        isOnResizedDisabled.current = false;
        // your stuff
        _setMaximized(isMaximized);
      });
  }

  useEffect(() => {
    if (!canvasWrapperRef.current) return;
    if (!activeProject) return;
    activeProject.canvas.mount(canvasWrapperRef.current);
    activeProject.loop();
    projects.filter((p) => p.uri.toString() !== activeProject.uri.toString()).forEach((p) => p.pause());
    activeProject.canvas.element.addEventListener("pointerdown", () => {
      setIgnoreMouseEvents(true);
    });
    activeProject.canvas.element.addEventListener("pointerup", () => {
      setIgnoreMouseEvents(false);
    });
    const unlisten2 = getCurrentWindow().onDragDropEvent(async (event) => {
      const size = await getCurrentWindow().outerSize();
      if (event.payload.type === "over") {
        if (event.payload.position.y <= size.height / 3) {
          setDropMouseLocation("top");
        } else if (event.payload.position.y <= (size.height / 3) * 2) {
          setDropMouseLocation("middle");
        } else {
          setDropMouseLocation("bottom");
        }
      } else if (event.payload.type === "leave") {
        setDropMouseLocation("notInWindowZone");
      } else if (event.payload.type === "drop") {
        setDropMouseLocation("notInWindowZone");
        // 之所以最下面才是绝对路径，是因为mac里位置计算有问题，最下面的hover选不到。
        // 相对路径比绝对路径可能更实用，所以先把相对路径放在上面以临时解决使用需求。
        // 以后再研究为什么拿到的位置有错误
        if (event.payload.position.y <= size.height / 3) {
          DragFileIntoStageEngine.handleDrop(activeProject, event.payload.paths);
        } else if (event.payload.position.y <= (size.height / 3) * 2) {
          DragFileIntoStageEngine.handleDropFileRelativePath(activeProject, event.payload.paths);
        } else {
          DragFileIntoStageEngine.handleDropFileAbsolutePath(activeProject, event.payload.paths);
        }
      }
    });
    return () => {
      unlisten2?.then((f) => f());
    };
  }, [activeProject]);

  /**
   * 首次启动时显示欢迎页面
   */
  // const navigate = useNavigate();
  // useEffect(() => {
  //   if (LastLaunch.isFirstLaunch) {
  //     navigate("/welcome");
  //   }
  // }, []);

  useEffect(() => {
    let unlisten1: () => void;
    /**
     * 关闭窗口时的事件监听
     */
    getCurrentWindow()
      .onCloseRequested(async (e) => {
        e.preventDefault();

        // 检查是否有未保存的项目
        const unsavedProjects = projects.filter(
          (project) => project.state === ProjectState.Unsaved || project.state === ProjectState.Stashed,
        );

        if (unsavedProjects.length > 0) {
          // 弹出警告对话框
          const response = await Dialog.buttons(
            "检测到未保存文件",
            `当前有 ${unsavedProjects.length} 个未保存的文件。直接关闭可能有文件被清空的风险，建议先手动保存文件。`,
            [
              { id: "cancel", label: "取消", variant: "ghost" },
              { id: "continue", label: "继续关闭", variant: "destructive" },
            ],
          );

          if (response === "cancel") {
            // 用户选择取消关闭，返回
            return;
          }
          // 用户选择继续关闭，执行原有关闭流程
        }

        try {
          for (const project of projects) {
            console.log("尝试关闭", project);
            await closeProject(project);
          }
        } catch {
          Telemetry.event("关闭应用提示是否保存文件选择了取消");
          return;
        }
        Telemetry.event("关闭应用");
        // 保存窗口位置
        await saveWindowState(StateFlags.SIZE | StateFlags.POSITION | StateFlags.MAXIMIZED);
        await getCurrentWindow().destroy();
      })
      .then((it) => {
        unlisten1 = it;
      });

    for (const project of projects) {
      project.on("state-change", () => {
        // 强制重新渲染一次
        setProjects([...projects]);
      });
      project.on("contextmenu", ({ x, y }) => {
        contextMenuTriggerRef.current?.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            clientX: x,
            clientY: y,
          }),
        );
        setProjects([...projects]);
      });
    }

    return () => {
      unlisten1?.();
      for (const project of projects) {
        project.removeAllListeners("state-change");
        project.removeAllListeners("contextmenu");
      }
    };
  }, [projects.length]);

  const closeProject = async (project: Project) => {
    if (project.state === ProjectState.Stashed) {
      toast("文件还没有保存，但已经暂存，在“最近打开的文件”中可恢复文件");
    } else if (project.state === ProjectState.Unsaved) {
      // 切换到这个文件
      setActiveProject(project);
      const response = await Dialog.buttons("是否保存更改？", decodeURI(project.uri.toString()), [
        { id: "cancel", label: "取消", variant: "ghost" },
        { id: "discard", label: "不保存", variant: "destructive" },
        { id: "save", label: "保存" },
      ]);
      if (response === "save") {
        await project.save();
      } else if (response === "cancel") {
        throw new Error("取消操作");
      }
    }
    await project.dispose();
    setProjects((projects) => {
      const result = projects.filter((p) => p.uri.toString() !== project.uri.toString());
      // 如果删除了当前标签页，就切换到下一个标签页
      if (activeProject?.uri.toString() === project.uri.toString() && result.length > 0) {
        const activeProjectIndex = projects.findIndex((p) => p.uri.toString() === activeProject?.uri.toString());
        if (activeProjectIndex === projects.length - 1) {
          // 关闭了最后一个标签页
          setActiveProject(result[activeProjectIndex - 1]);
        } else {
          setActiveProject(result[activeProjectIndex]);
        }
      }
      // 如果删除了唯一一个标签页，就显示欢迎页面
      if (result.length === 0) {
        setActiveProject(undefined);
      }
      return result;
    });
  };

  const handleTabClick = useCallback((project: Project) => {
    setActiveProject(project);
  }, []);

  const handleTabClose = useCallback(
    async (project: Project) => {
      await closeProject(project);
    },
    [closeProject],
  );

  return (
    <div
      className="bg-stage-background relative flex h-full w-full flex-col overflow-clip sm:gap-2 sm:p-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 菜单 | 标签页 | ...移动窗口区域... | 窗口控制按钮 */}
      <div
        className={cn(
          "z-10 flex h-4 transition-all hover:opacity-100 sm:h-9 sm:gap-2",
          isClassroomMode && "opacity-0",
          ignoreMouseEvents && "pointer-events-none",
        )}
      >
        <div
          className="hover:bg-primary/25 h-full min-w-6 cursor-grab transition-colors active:cursor-grabbing sm:hidden"
          data-tauri-drag-region
        />
        {isMac && <WindowButtons />}
        <GlobalMenu />
        <div
          className="hover:bg-primary/25 h-full flex-1 cursor-grab transition-colors hover:*:opacity-100 active:cursor-grabbing sm:rounded-sm sm:hover:border"
          data-tauri-drag-region
        />
        {!isMac && <WindowButtons />}
      </div>

      <ProjectTabs
        projects={projects}
        activeProject={activeProject}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        isClassroomMode={isClassroomMode}
        ignoreMouseEvents={ignoreMouseEvents}
      />

      {/* canvas */}
      <div className="absolute inset-0 overflow-hidden" ref={canvasWrapperRef}></div>

      {/* 没有项目处于打开状态时，显示欢迎页面 */}
      {projects.length === 0 && (
        <div className="absolute inset-0 overflow-hidden *:h-full *:w-full">
          <Welcome />
        </div>
      )}

      {/* 右键菜单 */}
      <ContextMenu>
        <ContextMenuTrigger>
          <div ref={contextMenuTriggerRef} />
        </ContextMenuTrigger>
        <MyContextMenuContent />
      </ContextMenu>

      {/* ======= */}
      {/* <ErrorHandler /> */}

      {/* <PGCanvas /> */}

      {/* <FloatingOutlet />
      <RenderSubWindows /> */}

      <RenderSubWindows />

      {/* 底部工具栏 */}
      {activeProject && <ToolbarContent />}

      {/* 右上角关闭的触发角 */}
      {isWindows && (
        <div
          className="absolute right-0 top-0 z-50 h-1 w-1 cursor-pointer rounded-bl-xl bg-red-600 transition-all hover:h-10 hover:w-10 hover:bg-yellow-500"
          onClick={() => getCurrentWindow().close()}
        ></div>
      )}
      {dropMouseLocation !== "notInWindowZone" && <DropWindowCover dropMouseLocation={dropMouseLocation} />}
    </div>
  );
}

/**
 * 窗口右上角的最小化，最大化，关闭等按钮
 */
function WindowButtons() {
  const [maximized] = useAtom(isWindowMaxsizedAtom);
  const [isClickThroughEnabled] = useAtom(isClickThroughEnabledAtom);
  const [isWindowAlwaysOnTop, setIsWindowAlwaysOnTop] = useAtom(isWindowAlwaysOnTopAtom);
  const checkoutWindowsAlwaysTop = async () => {
    const tauriWindow = getCurrentWindow();
    if (isWindowAlwaysOnTop) {
      setIsWindowAlwaysOnTop(false);
      await tauriWindow.setAlwaysOnTop(false);
    } else {
      setIsWindowAlwaysOnTop(true);
      await tauriWindow.setAlwaysOnTop(true);
    }
  };

  return (
    <div className="bg-background shadow-xs flex h-full items-center sm:rounded-md sm:border">
      {isClickThroughEnabled && <span className="text-destructive!">Alt + 2关闭窗口穿透点击</span>}
      {isMac ? (
        <span className="flex *:flex *:size-3 sm:px-2 sm:*:m-1">
          <div
            className="hidden cursor-pointer items-center justify-center rounded-full bg-red-400 text-transparent hover:scale-110 hover:text-red-800"
            onClick={() => getCurrentWindow().close()}
          >
            <X strokeWidth={3} size={10} />
          </div>
          <div
            className="hidden cursor-pointer items-center justify-center rounded-full bg-yellow-400 text-transparent hover:scale-110 hover:text-yellow-800 sm:block"
            onClick={() => getCurrentWindow().minimize()}
          >
            <Minus strokeWidth={3} size={10} />
          </div>
          <div
            className="hidden cursor-pointer items-center justify-center rounded-full bg-green-400 text-transparent hover:scale-110 hover:text-green-800 sm:block"
            onClick={() => {
              getCurrentWindow()
                .isFullscreen()
                .then((res) => getCurrentWindow().setFullscreen(!res));
            }}
          >
            <ChevronsLeftRight strokeWidth={3} size={10} className="rotate-45" />
          </div>
          <div
            className="cursor-pointer items-center justify-center rounded-full bg-blue-400 text-blue-800 hover:scale-110"
            onClick={async (e) => {
              e.stopPropagation();
              checkoutWindowsAlwaysTop();
            }}
          >
            {isWindowAlwaysOnTop ? <Pin size={10} /> : <PinOff size={10} />}
          </div>
        </span>
      ) : (
        <span className="flex h-full flex-row sm:gap-1">
          {/* 钉住 */}
          <Button
            className="size-4 sm:size-9"
            variant="ghost"
            size="icon"
            onClick={async (e) => {
              e.stopPropagation();
              checkoutWindowsAlwaysTop();
            }}
          >
            {isWindowAlwaysOnTop ? <Pin strokeWidth={3} /> : <PinOff strokeWidth={3} className="opacity-50" />}
          </Button>
          {/* 最小化 */}
          <Button
            className="size-4 sm:size-9"
            variant="ghost"
            size="icon"
            onClick={() => getCurrentWindow().minimize()}
          >
            <Minus strokeWidth={3} />
          </Button>
          {/* 最大化/还原 */}
          {maximized ? (
            <Button
              className="size-4 text-xs sm:size-9"
              variant="ghost"
              size="icon"
              onClick={() => getCurrentWindow().unmaximize()}
            >
              <Copy className="size-3" strokeWidth={3} />
            </Button>
          ) : (
            <Button
              className="size-4 text-xs sm:size-9"
              variant="ghost"
              size="icon"
              onClick={() => getCurrentWindow().maximize()}
            >
              <Square className="size-3" strokeWidth={4} />
            </Button>
          )}
          {/* 关闭 */}
          <Button
            className="size-4 text-xs sm:size-9"
            variant="ghost"
            size="icon"
            onClick={() => getCurrentWindow().close()}
          >
            <X strokeWidth={3} />
          </Button>
        </span>
      )}
    </div>
  );
}

export function Catch() {
  return <></>;
}
