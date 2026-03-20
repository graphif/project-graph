import MyContextMenuContent from "@/components/context-menu-content";
import RenderSubWindows from "@/components/render-sub-windows";
import ThemeModeSwitch from "@/components/theme-mode-switch";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import Welcome from "@/components/welcome-page";
import { Project, ProjectState } from "@/core/Project";
import { GlobalMenu } from "@/core/service/GlobalMenu";
import { Settings } from "@/core/service/Settings";
import { Telemetry } from "@/core/service/Telemetry";
import { Themes } from "@/core/service/Themes";
import { activeProjectAtom, isClassroomModeAtom, isWindowMaxsizedAtom, projectsAtom } from "@/state";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DropWindowCover } from "./DropWindowCover";
import { ProjectTabs } from "./ProjectTabs";
import ToolbarContent from "./components/toolbar-content";
import { KeyBindsUI } from "./core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { cn } from "./utils/cn";

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, _setMaximized] = useAtom(isWindowMaxsizedAtom);

  const [projects, setProjects] = useAtom(projectsAtom);
  const [activeProject, setActiveProject] = useAtom(activeProjectAtom);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  // const [isWide, setIsWide] = useState(false);
  const [telemetryEventSent, setTelemetryEventSent] = useState(false);
  const [dropMouseLocation] = useState<"top" | "middle" | "bottom" | "notInWindowZone">("notInWindowZone");
  const [ignoreMouseEvents, setIgnoreMouseEvents] = useState(false);
  const [isClassroomMode, setIsClassroomMode] = useAtom(isClassroomModeAtom);
  const [windowBackgroundAlpha, setWindowBackgroundAlpha] = useState(Settings.windowBackgroundAlpha);

  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  // const { t } = useTranslation("app");

  useEffect(() => {
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

    // 监听主题模式切换
    Settings.watch("themeMode", (value) => {
      const targetTheme = value === "light" ? Settings.lightTheme : Settings.darkTheme;
      if (Settings.theme !== targetTheme) {
        Settings.theme = targetTheme;
      }
    });
    Settings.watch("lightTheme", (value) => {
      if (Settings.themeMode === "light" && Settings.theme !== value) {
        Settings.theme = value;
      }
    });
    Settings.watch("darkTheme", (value) => {
      if (Settings.themeMode === "dark" && Settings.theme !== value) {
        Settings.theme = value;
      }
    });

    // 监听快捷设置工具栏显示设置
    const unwatchShowQuickSettingsToolbar = Settings.watch("showQuickSettingsToolbar", (value) => {
      setShowQuickSettingsToolbar(value);
    });

    // 监听窗口背景不透明度
    const unwatchWindowBackgroundAlpha = Settings.watch("windowBackgroundAlpha", (value) => {
      setWindowBackgroundAlpha(value);
    });

    if (!telemetryEventSent) {
      setTelemetryEventSent(true);
      (async () => {
        // const cpu = await cpuInfo();
        // await Telemetry.event("启动应用", {
        //   version: await getVersion(),
        //   os: platform(),
        //   arch: arch(),
        //   osVersion: version(),
        //   cpu: cpu.cpus[0].brand,
        //   cpuCount: cpu.cpu_count,
        // });
      })();
    }

    return () => {
      KeyBindsUI.uiStopListen();
      // 清理全局快捷键资源
      unwatchShowQuickSettingsToolbar();
      unwatchWindowBackgroundAlpha();
    };
  }, []);

  useEffect(() => {
    setIsClassroomMode(Settings.isClassroomMode);
  }, [Settings.isClassroomMode]);

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
    <>
      {/* 这是一个底层的 div，用于在拖拽改变窗口大小时填充背景，防止窗口出现透明闪烁 */}
      <div className="fixed inset-0 z-[-1] bg-[var(--stage-background)]" style={{ opacity: windowBackgroundAlpha }} />
      <div
        className="relative flex h-full w-full flex-col overflow-clip rounded-lg sm:gap-2 sm:p-2"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 菜单 | 标签页 | ...移动窗口区域... | 窗口控制按钮 */}
        <div
          className={cn(
            "z-10 flex h-4 items-center transition-all hover:opacity-100 sm:h-9 sm:gap-2",
            isClassroomMode && "opacity-0",
            ignoreMouseEvents && "pointer-events-none",
          )}
        >
          <div
            className="hover:bg-primary/25 h-full min-w-6 cursor-grab transition-colors active:cursor-grabbing sm:hidden"
            data-tauri-drag-region
          />
          <GlobalMenu />
          <div
            className="hover:bg-primary/25 h-full flex-1 cursor-grab transition-colors hover:*:opacity-100 active:cursor-grabbing sm:rounded-sm sm:hover:border"
            data-tauri-drag-region
          />
          <ThemeModeSwitch />
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

        {/* 右侧工具栏 */}
        {dropMouseLocation !== "notInWindowZone" && <DropWindowCover dropMouseLocation={dropMouseLocation} />}
      </div>
    </>
  );
}
