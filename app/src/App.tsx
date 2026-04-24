import MyContextMenuContent from "@/components/context-menu-content";
import RenderSubWindows from "@/components/render-sub-windows";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import Welcome from "@/components/welcome-page";
import { Project, ProjectState } from "@/core/Project";
import { Tab } from "@/core/Tab";
import { GlobalMenu } from "@/core/service/GlobalMenu";
import { Settings } from "@/core/service/Settings";
import { Telemetry } from "@/core/service/Telemetry";
import { Themes } from "@/core/service/Themes";
import { globalShortcutManager } from "@/core/service/controlService/shortcutKeysEngine/GlobalShortcutManager";
import {
  activeTabAtom,
  isClassroomModeAtom,
  isClickThroughEnabledAtom,
  isWindowAlwaysOnTopAtom,
  isWindowMaxsizedAtom,
  tabsAtom,
} from "@/state";
import { getVersion } from "@tauri-apps/api/app";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { arch, platform, version } from "@tauri-apps/plugin-os";
import { restoreStateCurrent, saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { useAtom } from "jotai";
import { ChevronsLeftRight, Copy, Minus, Pin, PinOff, Square, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cpuInfo } from "tauri-plugin-system-info-api";
import { cn } from "./utils/cn";
import { isMac, isWindows } from "./utils/platform";
import { KeyBindsUI } from "./core/service/controlService/shortcutKeysEngine/KeyBindsUI";
import { checkAndFixShortcutStorage } from "./core/service/controlService/shortcutKeysEngine/ShortcutKeyFixer";
import { ProjectTabs } from "./ProjectTabs";
import { DropWindowCover } from "./DropWindowCover";
import ToolbarContent from "./components/toolbar-content";
import RightToolbar from "./components/right-toolbar";
import ThemeModeSwitch from "@/components/theme-mode-switch";

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, _setMaximized] = useAtom(isWindowMaxsizedAtom);

  const [tabs, setTabs] = useAtom(tabsAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  // const [isWide, setIsWide] = useState(false);
  const [telemetryEventSent, setTelemetryEventSent] = useState(false);
  const [isClassroomMode, setIsClassroomMode] = useAtom(isClassroomModeAtom);
  const [showQuickSettingsToolbar, setShowQuickSettingsToolbar] = useState(Settings.showQuickSettingsToolbar);
  const [windowBackgroundAlpha, setWindowBackgroundAlpha] = useState(Settings.windowBackgroundAlpha);

  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  // const { t } = useTranslation("app");

  useEffect(() => {
    // 先修复老用户的快捷键缓存问题（F11快捷键）
    (async () => {
      await checkAndFixShortcutStorage();
    })();
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

    // 初始化全局快捷键管理
    globalShortcutManager.init();

    return () => {
      unlisten1?.then((f) => f());
      KeyBindsUI.uiStopListen();
      // 清理全局快捷键资源
      unwatchShowQuickSettingsToolbar();
      unwatchWindowBackgroundAlpha();
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
    if (!activeTab) return;
    activeTab.loop();
    tabs.filter((p) => p !== activeTab).forEach((p) => p.pause());
  }, [activeTab]);

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
    await tab.dispose();
    setTabs((tabs) => {
      const result = tabs.filter((p) => p !== tab);
      // 如果删除了当前标签页，就切换到下一个标签页
      if (activeTab === tab && result.length > 0) {
        const activeTabIndex = tabs.findIndex((p) => p === activeTab);
        if (activeTabIndex === tabs.length - 1) {
          // 关闭了最后一个标签页
          setActiveTab(result[activeTabIndex - 1]);
        } else {
          setActiveTab(result[activeTabIndex]);
        }
      }
      // 如果删除了唯一一个标签页，就显示欢迎页面
      if (result.length === 0) {
        setActiveTab(undefined);
      }
      return result;
    });
  };

  const handleTabClick = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const handleTabClose = useCallback(
    async (tab: Tab) => {
      await closeTab(tab);
    },
    [closeTab],
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
          <ThemeModeSwitch />
          {!isMac && <WindowButtons />}
        </div>

        <ProjectTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
          isClassroomMode={isClassroomMode}
        />

        {/* content */}
        {tabs.map((p) => (
          <div
            key={p instanceof Project ? p.uri.toString() : p.constructor.name}
            className={cn("absolute inset-0 overflow-hidden", activeTab === p ? "block" : "hidden")}
          >
            {React.createElement(p.getComponent())}
          </div>
        ))}

        {/* 没有项目处于打开状态时，显示欢迎页面 */}
        {tabs.length === 0 && (
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
        {activeTab && <ToolbarContent />}

        {/* 右侧工具栏 */}
        {activeTab && showQuickSettingsToolbar && <RightToolbar />}

        {/* 右上角关闭的触发角 */}
        {isWindows && (
          <div
            className="absolute right-0 top-0 z-50 h-1 w-1 cursor-pointer rounded-bl-xl bg-red-600 transition-all hover:h-10 hover:w-10 hover:bg-yellow-500"
            onClick={() => getCurrentWindow().close()}
          ></div>
        )}
        {activeTab instanceof Project ? <DropWindowCover project={activeTab} /> : null}
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
    <div className="bg-background shadow-xs flex h-full items-center sm:rounded-md sm:border">
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
            className="hidden cursor-pointer items-center justify-center rounded-full bg-yellow-400 text-yellow-800 hover:scale-110 sm:block"
            onClick={() => getCurrentWindow().minimize()}
          >
            <Minus strokeWidth={3} size={10} />
          </div>
          <div
            className="hidden cursor-pointer items-center justify-center rounded-full bg-green-400 text-green-800 hover:scale-110 sm:block"
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
