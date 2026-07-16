import MyContextMenuContent from "@/components/context-menu-content";
import FloatingTabs from "@/components/floating-tabs";
import PieMenu from "@/components/pie-menu";
import ThemeModeSwitch from "@/components/theme-mode-switch";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import { Project, ProjectState } from "@/core/Project";
import { Tab } from "@/core/Tab";
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
import { ChevronsLeftRight, Copy, Minus, Pin, PinOff, Square, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [windowBackgroundAlpha, setWindowBackgroundAlpha] = useState(Settings.windowBackgroundAlpha);
  const [uiScalePercent, setUiScalePercent] = useState(Settings.uiScalePercent);

  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

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
    Settings.watch("theme", async (value) => {
      const theme = await Themes.applyThemeById(value);
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

    // 监听窗口背景不透明度
    const unwatchWindowBackgroundAlpha = Settings.watch("windowBackgroundAlpha", (value) => {
      setWindowBackgroundAlpha(value);
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
      unwatchWindowBackgroundAlpha();
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
    if (!activeResourceTab) return;
    activeResourceTab.loop();
    tabs.filter((tab) => tab !== activeResourceTab).forEach((tab) => tab.pause());
  }, [activeResourceTab]);

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
      {/* 这是一个底层的 div，用于在拖拽改变窗口大小时填充背景，防止窗口出现透明闪烁 */}
      <div className="absolute inset-0 z-[-1] bg-(--stage-background)" style={{ opacity: windowBackgroundAlpha }} />
      <div
        className="relative flex h-full w-full flex-col overflow-clip rounded-lg sm:gap-2"
        onContextMenu={(event) => {
          if ((event.target as Element).closest('[data-slot="context-menu-trigger"]')) return;
          event.preventDefault();
        }}
      >
        {/* Canvas content - NOT zoomed */}
        <DockedArea onTabClick={handleTabClick} onTabClose={handleTabClose} isClassroomMode={isClassroomMode} />

        {/* Zoomed UI layer - 缩放所有 DOM UI 元素，不缩放 Canvas 画布 */}
        <div
          style={zoomStyle}
          className="pointer-events-none relative z-10 flex h-full w-full flex-col *:pointer-events-auto"
        >
          {/* 菜单 | 标签页 | ...移动窗口区域... | 窗口控制按钮 */}
          <div
            className={cn(
              "bg-background z-10 flex h-4 items-center border-b transition-all hover:opacity-100 sm:h-8 sm:gap-2",
              isClassroomMode && "opacity-0",
            )}
          >
            <div
              className="hover:bg-primary/25 h-full min-w-6 cursor-grab transition-colors active:cursor-grabbing sm:hidden"
              data-tauri-drag-region
            />
            {isMac && <WindowButtons />}
            <GlobalMenu />
            <div className="h-full flex-1" data-tauri-drag-region />
            <div className="hidden sm:block">
              <ThemeModeSwitch />
            </div>
            {!isMac && <WindowButtons />}
          </div>

          {/* 右键菜单 */}
          <ContextMenu>
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
      </div>
    </>
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
    <div className="bg-background flex h-full items-center">
      {isClickThroughEnabled && <span className="text-destructive font-bold">Alt + 2关闭窗口穿透点击</span>}
      {isMac ? (
        <span className="flex *:flex *:size-3 sm:px-2 sm:*:m-1">
          <div
            className="hidden cursor-pointer items-center justify-center rounded-full bg-red-400 text-red-800 hover:scale-110"
            onClick={() => getCurrentWindow().close()}
          >
            <X strokeWidth={3} size={10} />
          </div>
          <div
            className="hidden cursor-pointer items-center justify-center rounded-full bg-yellow-400 text-yellow-800 hover:scale-110"
            onClick={() => getCurrentWindow().minimize()}
          >
            <Minus strokeWidth={3} size={10} />
          </div>
          <div
            className="hidden cursor-pointer items-center justify-center rounded-full bg-green-400 text-green-800 hover:scale-110"
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
