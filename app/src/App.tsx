import RenderSubWindows from "@/components/render-sub-windows";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import Welcome from "@/components/welcome-page";
import { Project, ProjectState } from "@/core/Project";
import { GlobalMenu, onOpenFile } from "@/core/service/GlobalMenu";
import { Settings } from "@/core/service/Settings";
import { Telemetry } from "@/core/service/Telemetry";
import { Themes } from "@/core/service/Themes";
import { activeProjectAtom, isClassroomModeAtom, isWindowAlwaysOnTopAtom, projectsAtom } from "@/state";
import { getVersion } from "@tauri-apps/api/app";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { arch, platform, version } from "@tauri-apps/plugin-os";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { useAtom } from "jotai";
import { CloudUpload, Copy, Dot, Layers2, Minus, Pin, PinOff, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { DragFileIntoStageEngine } from "./core/service/dataManageService/dragFileIntoStageEngine/dragFileIntoStageEngine";
import { cn } from "./utils/cn";
import { isWindows } from "./utils/platform";

export default function App() {
  const [maximized, _setMaximized] = useState(false);

  const [projects, setProjects] = useAtom(projectsAtom);
  const [activeProject, setActiveProject] = useAtom(activeProjectAtom);
  const [isWindowAlwaysOnTop, setIsWindowAlwaysOnTop] = useAtom(isWindowAlwaysOnTopAtom);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(false);
  const [telemetryEventSent, setTelemetryEventSent] = useState(false);
  const [dropState, setDropState] = useState<"none" | "open" | "append">("none");
  const [isClassroomMode, setIsClassroomMode] = useAtom(isClassroomModeAtom);
  const [isClickThroughEnabled, setIsClickThroughEnabled] = useState(false);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0); // 用于保存滚动位置的 ref，防止切换标签页时滚动位置丢失
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
      console.error("捕获到全局错误：", event.error);
      Telemetry.event("未知错误", String(event.error));
    });

    // 监听主题样式切换
    Settings.watch("theme", (value) => {
      Themes.applyThemeById(value);
    });

    // 恢复窗口位置大小
    restoreStateCurrent(StateFlags.SIZE | StateFlags.POSITION | StateFlags.MAXIMIZED);

    setIsWide(window.innerWidth / window.innerHeight > 1.8);

    const unlisten1 = getCurrentWindow().onResized(() => {
      if (!isOnResizedDisabled.current) {
        isMaximizedWorkaround();
      }
      setIsWide(window.innerWidth / window.innerHeight > 1.8);
    });

    if (!telemetryEventSent) {
      setTelemetryEventSent(true);
      (async () => {
        await Telemetry.event("启动应用", {
          version: await getVersion(),
          os: platform(),
          arch: arch(),
          osVersion: version(),
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
        console.log(isClickThroughEnabled, "isClickThroughEnabled");
        setIsClickThroughEnabled((prev) => {
          console.log("prev", prev);
          if (!prev) {
            // 开启了穿透点击
            Settings.windowBackgroundAlpha = 0.2;
            setIsWindowAlwaysOnTop(true);
            getCurrentWindow().setAlwaysOnTop(true);
            toast.warning("您开启了穿透点击，已自动为您打开窗口透明与始终至于顶层");
          }
          getCurrentWindow().setIgnoreCursorEvents(!prev);
          return !prev;
        });
      }
    });

    return () => {
      unlisten1?.then((f) => f());
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
    activeProject.mount(canvasWrapperRef.current);
    const unlisten2 = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        if (event.payload.position.y <= 96) {
          // 拖拽到标签页栏区域
          setDropState("open");
        } else {
          // 拖拽到画布区域
          setDropState("append");
        }
      } else if (event.payload.type === "leave") {
        setDropState("none");
      } else if (event.payload.type === "drop") {
        setDropState("none");
        if (event.payload.position.y <= 96) {
          // 拖拽到标签页栏区域
          for (const path of event.payload.paths) {
            if (path.endsWith(".prg") || path.endsWith(".json")) {
              onOpenFile(URI.file(path), "拖入窗口");
            } else {
              toast.error("不支持打开此文件");
            }
          }
        } else {
          // 拖拽到画布区域
          toast("追加到画布……待完善");
          // console.log(activeProject, event.payload.paths);
          DragFileIntoStageEngine.handleDrop(activeProject, event.payload.paths);
        }
      }
    });
    return () => {
      unlisten2?.then((f) => f());
    };
  }, [activeProject]);

  useEffect(() => {
    const el = tabsContainerRef.current; // tabs

    const onWheel = (e: WheelEvent) => {
      if (!el) return; // 再次检查 el 是否为 null
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollTo({
        left: el.scrollLeft + e.deltaY,
        behavior: "smooth",
      });
      // 在滚轮事件中更新保存的滚动位置
      scrollPositionRef.current = el.scrollLeft;
    };

    // 检查元素是否满足水平滚动条件
    const isHorizontallyScrollable = el && el.scrollWidth > el.clientWidth;

    if (el) {
      // 先移除旧监听器
      el.removeEventListener("wheel", onWheel);
    }

    if (el && isHorizontallyScrollable) {
      el.addEventListener("wheel", onWheel, { passive: false });
      // App重载后恢复滚动位置
      el.scrollLeft = scrollPositionRef.current;
    } else {
      console.log("Element for wheel listener is null or not scrollable."); // 调试：如果 el 为 null 或 不满足水平滚动条件 时不可滚动
    }

    return () => {
      if (el) {
        el.removeEventListener("wheel", onWheel);
      }
    };
  }, [projects.length, isWide, activeProject?.uri]);
  // 根据标签页数量、是否宽屏、当前活动项目uri 设置滚动tabs
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
    const unlisten1 = getCurrentWindow().onCloseRequested(async (e) => {
      e.preventDefault();
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
      unlisten1?.then((f) => f());
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

  /**
   * 多标签页
   */
  const ProjectTabs = () => (
    <div
      ref={tabsContainerRef}
      className={cn(
        "scrollbar-hide z-10 flex h-9 gap-2 overflow-x-auto whitespace-nowrap hover:opacity-100",
        isClassroomMode && "opacity-0",
      )}
    >
      {projects.map((project) => (
        <Button
          key={project.uri.toString()}
          variant={activeProject?.uri.toString() === project.uri.toString() ? "secondary" : "outline"}
          className={activeProject?.uri.toString() === project.uri.toString() ? "border-primary border-t-2" : ""}
          onClick={() => {
            setActiveProject(project);
          }}
          onMouseDown={async (e) => {
            if (e.button === 1) {
              e.preventDefault();
              await closeProject(project);
            }
          }}
        >
          <span className="text-sm">
            {project.uri.scheme === "draft"
              ? `临时草稿 (${project.uri.path})`
              : project.uri.scheme === "file"
                ? project.uri.path.split("/").pop()
                : project.uri.toString()}
          </span>
          <div
            className="cursor-pointer overflow-hidden hover:opacity-75"
            onClick={async (e) => {
              e.stopPropagation();
              await closeProject(project);
            }}
          >
            {project.state === ProjectState.Saved && <X />}
            {project.state === ProjectState.Stashed && <CloudUpload />}
            {project.state === ProjectState.Unsaved && <Dot className="scale-300" />}
          </div>
        </Button>
      ))}
      {dropState !== "none" && (
        <Button variant={dropState === "open" ? "default" : "outline"}>拖拽到此处打开文件</Button>
      )}
    </div>
  );

  return (
    <div
      className="bg-stage-background relative flex h-full w-full flex-col gap-2 p-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 菜单 | 标签页 | ...移动窗口区域... | 窗口控制按钮 */}
      <div className={cn("z-10 flex h-9 gap-2 transition-all hover:opacity-100", isClassroomMode && "opacity-0")}>
        {/* <div className=" flex h-8 shrink-0 items-center overflow-hidden rounded-xl border"></div> */}
        <GlobalMenu />
        {isWide && <ProjectTabs />}
        <div className="h-full flex-1 cursor-grab active:cursor-grabbing" data-tauri-drag-region></div>
        <div className="bg-background shadow-xs flex h-full items-center rounded-md border">
          {/* 开启穿透点击 */}
          <Button
            variant="ghost"
            // size="icon"
            className={isClickThroughEnabled ? "" : "opacity-50"}
            onClick={async (e) => {
              //
              e.stopPropagation();
              const newState = !isClickThroughEnabled;
              setIsClickThroughEnabled(newState);
              await getCurrentWindow().setIgnoreCursorEvents(newState);
              if (newState) {
                // 开启了穿透点击
                Settings.windowBackgroundAlpha = 0.2;
                setIsWindowAlwaysOnTop(true);
                await getCurrentWindow().setAlwaysOnTop(true);
                toast.warning(
                  "您开启了穿透点击，已自动为您打开窗口透明与始终至于顶层，用全局快捷键Alt+2可以切换穿透点击状态",
                );
              }
            }}
          >
            {isClickThroughEnabled ? (
              <span className="text-destructive!">Alt + 2关闭窗口穿透</span>
            ) : (
              <Layers2 strokeWidth={3} />
            )}
          </Button>
          {/* 钉住 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={async (e) => {
              e.stopPropagation();
              const tauriWindow = getCurrentWindow();
              if (isWindowAlwaysOnTop) {
                setIsWindowAlwaysOnTop(false);
                await tauriWindow.setAlwaysOnTop(false);
              } else {
                setIsWindowAlwaysOnTop(true);
                await tauriWindow.setAlwaysOnTop(true);
              }
            }}
          >
            {isWindowAlwaysOnTop ? <Pin strokeWidth={3} /> : <PinOff strokeWidth={3} className="opacity-50" />}
          </Button>
          {/* 最小化 */}
          <Button variant="ghost" size="icon" onClick={() => getCurrentWindow().minimize()}>
            <Minus strokeWidth={3} />
          </Button>
          {/* 最大化/还原 */}
          {maximized ? (
            <Button variant="ghost" size="icon" className="text-xs" onClick={() => getCurrentWindow().unmaximize()}>
              <Copy className="size-3" strokeWidth={3} />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => getCurrentWindow().maximize()}>
              <Square className="size-3" strokeWidth={4} />
            </Button>
          )}
          {/* 关闭 */}
          <Button variant="ghost" size="icon" onClick={() => getCurrentWindow().close()}>
            <X strokeWidth={3} />
          </Button>
        </div>
      </div>

      {!isWide && <ProjectTabs />}

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
        {/*<MyContextMenuContent />*/}
      </ContextMenu>

      {/* ======= */}
      {/* <ErrorHandler /> */}

      {/* <PGCanvas /> */}

      {/* <FloatingOutlet />
      <RenderSubWindows /> */}

      <RenderSubWindows />

      {/* 右上角关闭的触发角 */}
      {isWindows && (
        <div
          className="absolute right-0 top-0 z-50 h-1 w-1 cursor-pointer rounded-bl-xl bg-red-600 transition-all hover:h-10 hover:w-10 hover:bg-yellow-500"
          onClick={() => getCurrentWindow().close()}
        ></div>
      )}
    </div>
  );
}

export function Catch() {
  return <></>;
}
