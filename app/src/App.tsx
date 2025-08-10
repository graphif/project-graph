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
import { activeProjectAtom, projectsAtom } from "@/state";
import { getCurrentWindow } from "@/utils/platform";
import { getVersion } from "@tauri-apps/api/app";
import { arch, platform, version } from "@tauri-apps/plugin-os";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { useAtom } from "jotai";
import { CloudUpload, Copy, Dot, Minus, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function App() {
  const [maximized, _setMaximized] = useState(false);

  // 面板状态
  // TODO: start file window

  const [projects, setProjects] = useAtom(projectsAtom);
  const [activeProject, setActiveProject] = useAtom(activeProjectAtom);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(false);
  const [telemetryEventSent, setTelemetryEventSent] = useState(false);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0); // 用于保存滚动位置的 ref，防止切换标签页时滚动位置丢失
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  // const { t } = useTranslation("app");

  useEffect(() => {
    window.addEventListener("keyup", async (event) => {
      // TODO: 自定义快捷键
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

    // 监听主题样式切换
    Settings.watch("theme", (value) => {
      let styleEl = document.querySelector("#pg-theme");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "pg-theme";
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        :root {
          ${Themes.convertThemeToCSS(Themes.getThemeById(value)?.content)}
        }
      `;
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

    return () => {
      unlisten1?.then((f) => f());
    };
  }, []);

  // https://github.com/tauri-apps/tauri/issues/5812
  const isOnResizedDisabled = useRef(true);
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
    let unlisten1: () => void;
    /**
     * 关闭窗口时的事件监听
     */
    getCurrentWindow()
      .onCloseRequested(async (e) => {
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
      const response = await Dialog.buttons("是否保存更改？", project.uri.toString(), [
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

  const Tabs = () => (
    <div ref={tabsContainerRef} className="hide-scrollbar z-10 flex h-9 gap-2 overflow-x-auto whitespace-nowrap">
      {projects.map((project) => (
        <Button
          key={project.uri.toString()}
          variant={activeProject?.uri.toString() === project.uri.toString() ? "secondary" : "outline"}
          onClick={() => {
            setActiveProject(project);
          }}
        >
          <span className="text-sm">
            {project.uri.scheme === "draft"
              ? `草稿 (${project.uri.path})`
              : project.uri.scheme === "file"
                ? project.uri.path.split("/").pop()
                : project.uri.toString()}
          </span>
          <div
            className="overflow-hidden hover:opacity-75"
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
    </div>
  );

  return (
    <div
      className="bg-stage-background relative flex h-full w-full flex-col gap-2 p-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 菜单 | 标签页 | ...移动窗口区域... | 窗口控制按钮 */}
      <div className="z-10 flex h-9 gap-2">
        {/* <div className=" flex h-8 shrink-0 items-center overflow-hidden rounded-xl border"></div> */}
        <GlobalMenu />
        {isWide && <Tabs />}
        <div className="h-full flex-1 cursor-grab active:cursor-grabbing" data-tauri-drag-region></div>
        <div className="bg-background shadow-xs flex h-full items-center rounded-md border">
          <Button variant="ghost" size="icon" onClick={() => getCurrentWindow().minimize()}>
            <Minus strokeWidth={3} />
          </Button>
          {maximized ? (
            <Button variant="ghost" size="icon" className="text-xs" onClick={() => getCurrentWindow().unmaximize()}>
              <Copy className="size-3" strokeWidth={3} />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => getCurrentWindow().maximize()}>
              <Square className="size-3" strokeWidth={4} />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => getCurrentWindow().close()}>
            <X strokeWidth={3} />
          </Button>
        </div>
      </div>

      {!isWide && <Tabs />}

      {/* canvas */}
      <div className="absolute inset-0 overflow-hidden" ref={canvasWrapperRef}></div>
      {projects.length === 0 && (
        <div className="absolute inset-0 overflow-hidden *:h-full *:w-full">
          <Welcome />
        </div>
      )}
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
    </div>
  );
}
