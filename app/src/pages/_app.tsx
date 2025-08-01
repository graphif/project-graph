/* eslint-disable @typescript-eslint/no-unused-vars */
// FIXME: 移除上面的disable注释
import { Dialog } from "@/components/dialog";
import { ProjectState } from "@/core/Project";
import { GlobalMenu } from "@/core/service/GlobalMenu";
import { Settings } from "@/core/service/Settings";
import { Telemetry } from "@/core/service/Telemetry";
import { Themes } from "@/core/service/Themes";
import RenderSubWindows from "@/pages/_render_sub_windows";
import Welcome from "@/pages/_welcome";
import { activeProjectAtom, projectsAtom } from "@/state";
import { cn } from "@/utils/cn";
import { getCurrentWindow, isDesktop } from "@/utils/platform";
import { getVersion } from "@tauri-apps/api/app";
import { arch, platform, version } from "@tauri-apps/plugin-os";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { useAtom } from "jotai";
import { Copy, HardDriveDownload, Minus, Pin, PinOff, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function App() {
  const [maximized, _setMaximized] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  // 面板状态
  // TODO: start file window

  const [projects, setProjects] = useAtom(projectsAtom);
  const [activeProject, setActiveProject] = useAtom(activeProjectAtom);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [isWindowCollapsing, setIsWindowCollapsing] = useState(false);
  const [isClassroomMode, setIsClassroomMode] = Settings.use("isClassroomMode");
  const [isWide, setIsWide] = useState(false);
  const [telemetryEventSent, setTelemetryEventSent] = useState(false);

  const { t } = useTranslation("app");

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

    /**
     * 关闭窗口时的事件监听
     */
    getCurrentWindow().onCloseRequested(async (e) => {
      e.preventDefault();
      // 保存窗口位置
      await saveWindowState(StateFlags.SIZE | StateFlags.POSITION | StateFlags.MAXIMIZED);
      // await Dialog.show({
      //   title: "是否保存更改？",
      //   buttons: [
      //     {
      //       text: "保存",
      //     },
      //     {
      //       text: "暂存",
      //     },
      //     {
      //       text: "放弃更改",
      //     },
      //     {
      //       text: "帮助",
      //       onClick: async () => {
      //         await Dialog.show({
      //           title: "暂存是什么东西？",
      //           content:
      //             "在 2.0 以后的版本中，应用会定时将文件内容暂存到缓存目录中，防止应用意外关闭造成的文件丢失。您可以在“最近打开”中找回暂存的文件。",
      //         });
      //       },
      //     },
      //   ],
      // });
      Telemetry.event("关闭应用");
      await getCurrentWindow().destroy();
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

  /**
   * 首次启动时显示欢迎页面
   */
  // const navigate = useNavigate();
  // useEffect(() => {
  //   if (LastLaunch.isFirstLaunch) {
  //     navigate("/welcome");
  //   }
  // }, []);

  const Tabs = () => (
    <div className="z-10 flex h-8 gap-2 overflow-x-auto">
      {projects.map((project) => (
        <div
          key={project.uri.toString()}
          className={cn("el-tab flex shrink-0 items-center gap-1 rounded-xl border p-2", {
            "el-tab-selected": activeProject?.uri.toString() === project.uri.toString(),
          })}
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
              if (project.state === ProjectState.Stashed) {
                toast("文件还没有保存，但已经暂存，在“最近打开的文件”中可恢复文件");
              } else if (project.state === ProjectState.Unsaved) {
                const response = await Dialog.show({
                  title: "是否保存更改？",
                  buttons: [{ text: "取消" }, { text: "不保存" }, { text: "保存" }],
                });
                if (response.button === "保存") {
                  try {
                    await project.save();
                  } catch {
                    return;
                  }
                } else if (response.button === "取消") {
                  return;
                }
              }
              await project.dispose();
              setProjects((projects) => {
                const result = projects.filter((p) => p.uri.toString() !== project.uri.toString());
                // 如果删除了当前标签页，就切换到下一个标签页
                if (activeProject?.uri.toString() === project.uri.toString() && result.length > 0) {
                  const activeProjectIndex = projects.findIndex(
                    (p) => p.uri.toString() === activeProject?.uri.toString(),
                  );
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
            }}
          >
            {project.state === ProjectState.Saved && <X size={16} strokeWidth={3} />}
            {project.state === ProjectState.Stashed && <HardDriveDownload size={16} />}
            {project.state === ProjectState.Unsaved && <div className="bg-tab-text mx-1 size-2 rounded-full" />}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="bg-stage-background relative flex h-full w-full flex-col gap-2 p-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 菜单 | 标签页 | ...移动窗口区域... | 窗口控制按钮 */}
      <div className="z-10 flex h-8 gap-2">
        {/* <div className="el-titlebar flex h-8 shrink-0 items-center overflow-hidden rounded-xl border"></div> */}
        <GlobalMenu />
        {isWide && <Tabs />}
        <div className="h-full flex-1 cursor-grab active:cursor-grabbing" data-tauri-drag-region></div>
        <div className="el-titlebar flex h-8 shrink-0 items-center overflow-hidden rounded-xl border">
          {isDesktop && (
            <div className="*:el-titlebar-control flex h-full *:flex *:h-full *:w-8 *:cursor-pointer *:items-center *:justify-center *:rounded-lg *:transition-all *:active:scale-90 *:active:rounded-2xl">
              {/* 要确保每一个图标在视觉上的大小和粗细都相同 */}
              {alwaysOnTop ? (
                <div
                  onClick={() => {
                    getCurrentWindow().setAlwaysOnTop(false);
                    setAlwaysOnTop(false);
                  }}
                >
                  <PinOff size={14} strokeWidth={2} />
                </div>
              ) : (
                <div
                  onClick={() => {
                    getCurrentWindow().setAlwaysOnTop(true);
                    setAlwaysOnTop(true);
                  }}
                >
                  <Pin size={14} strokeWidth={2} />
                </div>
              )}
              <div onClick={() => getCurrentWindow().minimize()}>
                <Minus size={14} strokeWidth={4} />
              </div>
              {maximized ? (
                <div onClick={() => getCurrentWindow().unmaximize()}>
                  <Copy size={12} strokeWidth={3} />
                </div>
              ) : (
                <div onClick={() => getCurrentWindow().maximize()}>
                  <Square size={10} strokeWidth={5} />
                </div>
              )}
              <div onClick={() => getCurrentWindow().close()}>
                <X size={14} strokeWidth={4} />
              </div>
            </div>
          )}
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

      {/* ======= */}
      {/* <ErrorHandler /> */}

      {/* <PGCanvas /> */}

      {/* <FloatingOutlet />
      <RenderSubWindows /> */}

      <RenderSubWindows />
    </div>
  );
}

export function Catch() {
  return <></>;
}
