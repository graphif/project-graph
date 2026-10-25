import MyContextMenuContent from "@/components/context-menu-content";
import FloatingTabs from "@/components/floating-tabs";
import PieMenu from "@/components/pie-menu";
import ThemeModeSwitch from "@/components/theme-mode-switch";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import { Project, ProjectState } from "@/core/Project";
import { isResourceTab, Tab } from "@/core/Tab";
import { TabWorkspace } from "@/core/TabWorkspace";
import { GlobalMenu, onNewDraft } from "@/core/service/GlobalMenu";
import { flushSettingsLoadErrors, Settings } from "@/core/service/Settings";
import { Telemetry } from "@/core/service/Telemetry";
import { Themes } from "@/core/service/Themes";
import { globalShortcutManager } from "@/core/service/controlService/shortcutKeysEngine/GlobalShortcutManager";
import {
  activeResourceTabAtom,
  activeTabAtom,
  isClassroomModeAtom,
  isClickThroughEnabledAtom,
  isWindowAlwaysOnTopAtom,
  isWindowMaxsizedAtom,
  tabsAtom,
} from "@/state";
import WelcomeWindow from "@/sub/WelcomeWindow";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { arch, platform, version } from "@tauri-apps/plugin-os";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { useAtom } from "jotai";
import { Copy, Minus, Pin, PinOff, Square, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cpuInfo } from "tauri-plugin-system-info-api";
import CommandPalette from "./CommandPalette";
import { DropWindowCover } from "./DropWindowCover";
import DockedArea from "./components/docked-area";
import RenderOverlays from "./components/overlay-host";
import { KeyBindsUI } from "./core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { checkAndFixShortcutStorage } from "./core/service/controlService/shortcutKeysEngine/ShortcutKeyFixer";
import { cn } from "./utils/cn";
import { isLinux, isMac, isWindows } from "./utils/platform";

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, _setMaximized] = useAtom(isWindowMaxsizedAtom);

  const [tabs, setTabs] = useAtom(tabsAtom);
  const [, setActiveTab] = useAtom(activeTabAtom);
  const [activeResourceTab] = useAtom(activeResourceTabAtom);
  // const [isWide, setIsWide] = useState(false);
  const [telemetryEventSent, setTelemetryEventSent] = useState(false);
  const [isClassroomMode, setIsClassroomMode] = useAtom(isClassroomModeAtom);
  const [uiScalePercent, setUiScalePercent] = useState(Settings.uiScalePercent);

  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  const handleTitleBarMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('[role="tablist"]')) return;
    if (event.buttons !== 1) return;

    if (event.detail === 2) {
      void getCurrentWindow().toggleMaximize();
      return;
    }

    void getCurrentWindow().startDragging();
  };

  // const { t } = useTranslation("app");

  useEffect(() => {
    // 设置兼容性提示依赖 Dialog UI，必须在应用挂载后再触发。
    void flushSettingsLoadErrors();

    // 先修复老用户的快捷键缓存问题（F11快捷键）
    (async () => {
      await checkAndFixShortcutStorage();
    })();
    // 注册UI级别快捷键
    KeyBindsUI.registerAllUIKeyBinds();
    KeyBindsUI.uiStartListen();

    // 在捕获阶段禁止浏览器/WebView 原生右键菜单，但允许 Radix ContextMenu 处理自己的触发区域。
    window.addEventListener(
      "contextmenu",
      (event) => {
        if (event.target instanceof Element && event.target.closest('[data-slot="context-menu-trigger"]')) return;
        event.preventDefault();
      },
      true,
    );

    // 全局错误处理
    window.addEventListener("error", (event) => {
      Telemetry.event("未知错误", String(event.error));
    });

    // 监听主题样式切换
    Settings.watch("theme", (value) => {
      const theme = Themes.applyThemeById(value);
      if (!theme) return;
      if (theme.metadata.type === "light") {
        Settings.lightTheme = value;
      } else if (theme.metadata.type === "dark") {
        Settings.darkTheme = value;
      }
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

    // 初始化 UI 缩放（只缩放 UI 组件层，不缩放 Canvas 画布）
    setUiScalePercent(Settings.uiScalePercent);
    const unwatchUiScale = Settings.watch("uiScalePercent", (value) => {
      setUiScalePercent(value);
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
          osVersion: isLinux ? `${await invoke("get_distribution")} ${version()}` : version(),
          cpu: cpu.cpus[0].brand,
          cpuCount: cpu.cpu_count,
        });
      })();
    }

    // 加载完成了，显示窗口
    if (!window.ipc_bridge) {
      getCurrentWindow().show();
    }

    // 初始化全局快捷键管理
    globalShortcutManager.init();

    return () => {
      unlisten1?.then((f) => f());
      KeyBindsUI.uiStopListen();
      // 清理全局快捷键资源
      unwatchUiScale();
      globalShortcutManager.dispose();
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
    const updateTabRenderLoops = () => {
      if (!activeResourceTab) return;
      if (Settings.pauseRenderWhenTabUnfocused) {
        activeResourceTab.loop();
        tabs.filter((tab) => tab !== activeResourceTab).forEach((tab) => tab.pause());
      } else {
        tabs.filter((tab) => isResourceTab(tab) && !tab.closing).forEach((tab) => tab.loop());
      }
    };
    return Settings.watch("pauseRenderWhenTabUnfocused", updateTabRenderLoops);
  }, [activeResourceTab, tabs]);

  useEffect(() => {
    TabWorkspace.synchronizeGroups();
  }, [tabs]);

  // 关掉最后一个 Project 后：再创建空草稿并弹出欢迎窗（启动时无 Project 由 main 处理，这里只响应 true→false）
  const previousHadProjectRef = useRef(tabs.some((tab) => tab instanceof Project && !tab.closing));
  useEffect(() => {
    const hasOpenProject = tabs.some((tab) => tab instanceof Project && !tab.closing);
    const previousHadProject = previousHadProjectRef.current;
    previousHadProjectRef.current = hasOpenProject;
    if (previousHadProject && !hasOpenProject) {
      void (async () => {
        await onNewDraft();
        WelcomeWindow.open();
      })();
    }
  }, [tabs]);

  useEffect(() => {
    let unlisten1: () => void;
    /**
     * 关闭窗口时的事件监听
     */
    getCurrentWindow()
      .onCloseRequested(async (e) => {
        e.preventDefault();

        // 检查是否有未保存的项目
        const unsavedTabs = tabs.filter(
          (tab): tab is Project =>
            tab instanceof Project &&
            (tab.projectState === ProjectState.Unsaved || tab.projectState === ProjectState.Stashed),
        );

        if (unsavedTabs.length > 0) {
          // 弹出警告对话框
          const response = await Dialog.buttons(
            "检测到未保存文件",
            `当前有 ${unsavedTabs.length} 个未保存的文件。直接关闭可能有文件被清空的风险，建议先手动保存文件。`,
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
          for (const tab of tabs) {
            console.log("尝试关闭", tab);
            await closeTab(tab);
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

    for (const tab of tabs) {
      tab.on("state-change", () => {
        // 强制重新渲染一次
        setTabs([...tabs]);
      });
      tab.on("contextmenu", ({ x, y }) => {
        contextMenuTriggerRef.current?.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            clientX: x,
            clientY: y,
          }),
        );
        setTabs([...tabs]);
      });
    }

    return () => {
      unlisten1?.();
      for (const tab of tabs) {
        tab.removeAllListeners("state-change");
        tab.removeAllListeners("contextmenu");
      }
    };
  }, [tabs.length]);

  const closeTab = async (tab: Tab) => {
    if (tab instanceof Project) {
      if (tab.projectState === ProjectState.Stashed) {
        toast("文件还没有保存，但已经暂存，在“最近打开的文件”中可恢复文件");
      } else if (tab.projectState === ProjectState.Unsaved) {
        // 切换到这个文件
        setActiveTab(tab);
        const response = await Dialog.buttons("是否保存更改？", decodeURI(tab.uri.toString()), [
          { id: "cancel", label: "取消", variant: "ghost" },
          { id: "discard", label: "不保存", variant: "destructive" },
          { id: "save", label: "保存" },
        ]);
        if (response === "save") {
          await tab.save();
        } else if (response === "cancel") {
          throw new Error("取消操作");
        }
      }
    }
    await TabWorkspace.close(tab.id);
  };

  const handleTabClick = useCallback((tab: Tab) => {
    TabWorkspace.focus(tab.id);
  }, []);

  const handleTabClose = useCallback(
    async (tab: Tab) => {
      await closeTab(tab);
    },
    [closeTab],
  );

  const zoomStyle = uiScalePercent !== 100 ? ({ zoom: `${uiScalePercent / 100}` } as React.CSSProperties) : undefined;

  return (
    <>
      <div
        className={cn(
          "has-[[data-pg-settings-view]]:bg-background/[0.9516] relative flex h-full w-full flex-col overflow-clip sm:gap-2",
          !isMac && "rounded-lg",
        )}
        style={{ "--pg-ui-scale": uiScalePercent / 100 } as React.CSSProperties}
        onMouseDownCapture={(event) => {
          if (!isMac || event.button !== 0) return;
          const navigation = event.currentTarget.querySelector("#pg-titlebar-navigation");
          if (!navigation?.childElementCount) return;
          const target = event.target as Element;
          if (
            target.closest(
              "button, a, input, select, textarea, [contenteditable=true], [role=tablist], [role=menu], [role=menubar], [data-pg-docked-tab-id]",
            )
          )
            return;
          const toolbar = event.currentTarget.querySelector("[data-pg-titlebar]");
          const tabBar = event.currentTarget.querySelector("[data-pg-tab-bar]");
          const top = event.currentTarget.getBoundingClientRect().top;
          const bottom = Math.max(
            toolbar?.getBoundingClientRect().bottom ?? top,
            tabBar?.getBoundingClientRect().bottom ?? top,
          );
          if (event.clientY < top || event.clientY >= bottom) return;
          event.preventDefault();
          event.stopPropagation();
          handleTitleBarMouseDown(event);
        }}
        onContextMenu={(event) => {
          if ((event.target as Element).closest('[data-slot="context-menu-trigger"]')) return;
          event.preventDefault();
        }}
      >
        {/* Canvas content - NOT zoomed */}
        <DockedArea onTabClick={handleTabClick} onTabClose={handleTabClose} isClassroomMode={isClassroomMode} />

        {isMac && (
          <>
            <div
              aria-hidden="true"
              className="absolute top-0 right-3 left-[100px] z-20 h-[calc(0.5rem*var(--pg-ui-scale))] sm:h-[calc(1rem*var(--pg-ui-scale))]"
              onMouseDown={handleTitleBarMouseDown}
            />
            {/* Native traffic lights do not follow the application's UI zoom. */}
            <div className="absolute top-[2px] left-[71px] z-20 h-7">
              <WindowButtons />
            </div>
          </>
        )}

        {/* Zoomed UI layer - 缩放所有 DOM UI 元素，不缩放 Canvas 画布 */}
        <div
          style={zoomStyle}
          className={cn(
            "pointer-events-none relative z-10 flex h-full w-full flex-col",
            !isMac && "*:pointer-events-auto",
          )}
        >
          {/* 菜单 | 标签页 | ...移动窗口区域... | 窗口控制按钮 */}
          <div
            data-pg-titlebar
            className={cn(
              "z-10 grid h-8 shrink-0 grid-cols-[minmax(0,max-content)_minmax(min(30%,18rem),1fr)_max-content] items-center gap-2 px-1 py-1 transition-opacity hover:opacity-100 has-[#pg-titlebar-navigation:empty]:grid-cols-[minmax(0,max-content)_minmax(0,1fr)_max-content] sm:h-14 sm:gap-4 sm:px-3 sm:py-2",
              isMac &&
                "pointer-events-none grid-cols-[35%_minmax(0,1fr)_max-content] has-[#pg-titlebar-navigation:empty]:grid-cols-[35%_minmax(0,1fr)_max-content] sm:h-14 sm:pt-4 sm:pb-0",
              isClassroomMode && "opacity-0",
            )}
          >
            <div
              className="scrollbar-hide flex h-full min-w-0 items-center overflow-x-auto rounded-full"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) handleTitleBarMouseDown(event);
              }}
            >
              <div
                className="pointer-events-none flex h-full w-max shrink-0 items-center gap-1 *:pointer-events-auto"
                style={isMac ? { paddingLeft: "calc(100px / var(--pg-ui-scale))" } : undefined}
              >
                <GlobalMenu />
              </div>
            </div>
            <div
              id="pg-titlebar-navigation"
              className={cn(
                "flex h-full min-w-0 items-center justify-center",
                isMac &&
                  "scrollbar-hide pointer-events-auto justify-end overflow-x-auto rounded-full empty:pointer-events-none",
              )}
              onMouseDown={handleTitleBarMouseDown}
            />
            <div
              className="flex h-full min-w-0 items-center justify-end"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) handleTitleBarMouseDown(event);
              }}
            >
              <div className="bg-background pointer-events-auto flex h-full shrink-0 items-center gap-2 rounded-full px-2 shadow-xs">
                <div className="hidden sm:block">
                  <ThemeModeSwitch />
                </div>
                {!isMac && <WindowButtons />}
              </div>
            </div>
          </div>

          {/* 右键菜单 */}
          <ContextMenu modal={false}>
            <ContextMenuTrigger>
              <div ref={contextMenuTriggerRef} />
            </ContextMenuTrigger>
            <MyContextMenuContent />
          </ContextMenu>
        </div>

        {/* NOT zoomed - 使用固定/全屏定位的组件，缩放会破坏它们的坐标计算 */}
        <FloatingTabs zoomStyle={zoomStyle} onTabClose={closeTab} />
        <PieMenu />

        {/* 右上角关闭的触发角 */}
        {isWindows && (
          <div
            className="absolute top-0 right-0 z-50 h-1 w-1 cursor-pointer rounded-bl-xl bg-red-600 transition-all hover:h-10 hover:w-10 hover:bg-yellow-500"
            onClick={() => getCurrentWindow().close()}
          ></div>
        )}
        {activeResourceTab instanceof Project ? <DropWindowCover project={activeResourceTab} /> : null}

        <CommandPalette zoomStyle={zoomStyle} />
        <RenderOverlays />
        {/* macOS uses native decorated-window resize regions; Tauri resize dragging is unsupported there. */}
        {!isMac && <WindowResizeHandles />}
      </div>
    </>
  );
}

function WindowResizeHandles() {
  const [enabled, setEnabled] = useState(false);
  const [hoveredDirection, setHoveredDirection] = useState<string | null>(null);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let disposed = false;
    const update = async () => {
      const [maximized, fullscreen, resizable] = await Promise.all([
        appWindow.isMaximized(),
        appWindow.isFullscreen(),
        appWindow.isResizable(),
      ]);
      if (!disposed) setEnabled(resizable && !maximized && !fullscreen);
    };
    const unlisten = appWindow.onResized(() => void update());
    void update();
    return () => {
      disposed = true;
      void unlisten.then((stop) => stop());
    };
  }, []);

  if (!enabled) return null;

  const handles = [
    ["North", "top-0 right-3 left-3 h-1.5 cursor-ns-resize", "h-0.5 w-10 rounded-full"],
    ["South", "bottom-0 right-3 left-3 h-1.5 cursor-ns-resize", "h-0.5 w-10 rounded-full"],
    ["West", "top-3 bottom-3 left-0 w-1.5 cursor-ew-resize", "h-10 w-0.5 rounded-full"],
    ["East", "top-3 bottom-3 right-0 w-1.5 cursor-ew-resize", "h-10 w-0.5 rounded-full"],
    ["NorthWest", "top-0 left-0 size-3 cursor-nwse-resize", "size-2 rounded-tl border-t-2 border-l-2"],
    ["NorthEast", "top-0 right-0 size-3 cursor-nesw-resize", "size-2 rounded-tr border-t-2 border-r-2"],
    ["SouthWest", "bottom-0 left-0 size-3 cursor-nesw-resize", "size-2 rounded-bl border-b-2 border-l-2"],
    ["SouthEast", "bottom-0 right-0 size-3 cursor-nwse-resize", "size-2 rounded-br border-b-2 border-r-2"],
  ] as const;

  return handles.map(([direction, area, grip]) => (
    <div
      key={direction}
      aria-hidden="true"
      className={cn("absolute z-50 flex touch-none items-center justify-center", area)}
      onPointerEnter={() => setHoveredDirection(direction)}
      onPointerMove={() => setHoveredDirection(direction)}
      onPointerLeave={() => setHoveredDirection((current) => (current === direction ? null : current))}
      onPointerCancel={() => setHoveredDirection(null)}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        void getCurrentWindow().startResizeDragging(direction);
      }}
    >
      <span
        className={cn(
          "border-foreground/50 cursor-inherit pointer-events-none transition-opacity",
          hoveredDirection === direction ? "opacity-100" : "opacity-0",
          direction.length <= 5 && "bg-foreground/50",
          grip,
        )}
      />
    </div>
  ));
}

/**
 * 窗口右上角的最小化，最大化，关闭等按钮
 */
function WindowButtons() {
  const { t } = useTranslation("windowControls");
  const [isWindowFocused, setIsWindowFocused] = useState(false);
  const [isNativeDark, setIsNativeDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [maximized] = useAtom(isWindowMaxsizedAtom);
  const [isClickThroughEnabled] = useAtom(isClickThroughEnabledAtom);
  const [isWindowAlwaysOnTop, setIsWindowAlwaysOnTop] = useAtom(isWindowAlwaysOnTopAtom);
  useEffect(() => {
    if (!isMac) return;
    const appWindow = getCurrentWindow();
    let disposed = false;
    let focusChanged = false;
    let themeChanged = false;
    const unlistenTheme = appWindow.onThemeChanged(({ payload }) => {
      themeChanged = true;
      if (!disposed) setIsNativeDark(payload === "dark");
    });
    void appWindow.theme().then((theme) => {
      if (!disposed && !themeChanged && theme !== null) setIsNativeDark(theme === "dark");
    });
    const unlisten = appWindow.onFocusChanged(({ payload }) => {
      focusChanged = true;
      if (!disposed) setIsWindowFocused(payload);
    });
    void appWindow.isFocused().then((focused) => {
      if (!disposed && !focusChanged) setIsWindowFocused(focused);
    });
    return () => {
      disposed = true;
      void unlisten.then((stop) => stop());
      void unlistenTheme.then((stop) => stop());
    };
  }, []);
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
    <div className={cn("flex h-full items-center", !isMac && "rounded-full [&_button]:rounded-full")}>
      {isClickThroughEnabled && <span className="text-destructive font-bold">Alt + 2关闭窗口穿透点击</span>}
      {isMac ? (
        <span className="flex items-center pr-1">
          <Button
            variant="ghost"
            size="icon"
            className="group size-7 rounded-full hover:bg-transparent dark:hover:bg-transparent"
            aria-label={t("alwaysOnTop")}
            aria-pressed={isWindowAlwaysOnTop}
            title={t("alwaysOnTop")}
            onClick={async (e) => {
              e.stopPropagation();
              await checkoutWindowsAlwaysTop();
            }}
          >
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-full border [corner-shape:round]",
                isWindowFocused
                  ? "border-blue-600/30 bg-blue-400 text-blue-950 group-hover:bg-blue-300"
                  : isNativeDark
                    ? "border-white/10 bg-[#3b3c41] text-neutral-500"
                    : "border-black/10 bg-[#cdced0] text-neutral-500",
                isWindowFocused && isWindowAlwaysOnTop && "bg-blue-500 group-hover:bg-blue-400",
              )}
            >
              {isWindowFocused &&
                (isWindowAlwaysOnTop ? (
                  <Pin className="size-2.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                ) : (
                  <PinOff className="size-2.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                ))}
            </span>
          </Button>
        </span>
      ) : (
        <span className="flex h-full flex-row sm:gap-1">
          {/* 钉住 */}
          <Button
            className="size-4 sm:h-full sm:w-6"
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
            className="size-4 sm:h-full sm:w-6"
            variant="ghost"
            size="icon"
            onClick={() => getCurrentWindow().minimize()}
          >
            <Minus strokeWidth={3} />
          </Button>
          {/* 最大化/还原 */}
          {maximized ? (
            <Button
              className="size-4 sm:h-full sm:w-6"
              variant="ghost"
              size="icon"
              onClick={() => getCurrentWindow().unmaximize()}
            >
              <Copy className="size-3" strokeWidth={3} />
            </Button>
          ) : (
            <Button
              className="size-4 sm:h-full sm:w-6"
              variant="ghost"
              size="icon"
              onClick={() => getCurrentWindow().maximize()}
            >
              <Square className="size-3" strokeWidth={4} />
            </Button>
          )}
          {/* 关闭 */}
          <Button
            className="size-4 sm:h-full sm:w-6"
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
