import { runCli } from "@/cli";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/core/service/AuthClient";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { StartFilesManager } from "@/core/service/dataFileService/StartFilesManager";
import { ColorManager } from "@/core/service/feedbackService/ColorManager";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { Settings } from "@/core/service/Settings";
import { Tutorials } from "@/core/service/Tutorials";
import { UserState } from "@/core/service/UserState";
import { EdgeCollisionBoxGetter } from "@/core/stage/stageObject/association/EdgeCollisionBoxGetter";
import { type AuthUser, currentUserAtom, isAuthLoadingAtom, store, tabsAtom } from "@/state";
import { exit, writeStderr } from "@/utils/otherApi";
import { isDesktop, isMobile, isWeb } from "@/utils/platform";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getMatches } from "@tauri-apps/plugin-cli";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { exists } from "@tauri-apps/plugin-fs";
import "driver.js/dist/driver.css";
import i18next from "i18next";
import { Provider } from "jotai";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { initReactI18next } from "react-i18next";
import { toast } from "sonner";
import VConsole from "vconsole";
import { URI } from "vscode-uri";
import App from "./App";
import { ExtensionManager } from "./core/extension/ExtensionManager";
import { handleDeepLink, isProjectGraphDeepLink } from "./core/service/dataFileService/DeepLinkHandler";
import { onNewDraft, onOpenFile } from "./core/service/GlobalMenu";
import WelcomeWindow from "./sub/WelcomeWindow";
import "./css/index.css";
import Fallback from "./Fallback";

if (import.meta.env.DEV && isMobile) {
  new VConsole();
}

const el = document.getElementById("root")!;

let cliMode = false;
let appRendered = false;

// 建议挂载根节点前的一系列操作统一写成函数，
// 在这里看着清爽一些，像一个列表清单一样。也方便调整顺序

(async () => {
  const isCliDesktopAcceptance =
    import.meta.env.DEV && new URLSearchParams(window.location.search).has("cli-desktop-acceptance");
  try {
    if (isCliDesktopAcceptance) {
      await invoke("write_cli_desktop_acceptance_state", {
        state: { phase: "initializing", step: "application" },
      });
    }
    const matches = !isCliDesktopAcceptance && !isWeb && isDesktop ? await getMatches() : null;
    const isCliMode = isDesktop && matches?.args.output?.occurrences === 1;
    cliMode = isCliMode || isCliDesktopAcceptance;
    await Promise.all([
      RecentFileManager.init(),
      StartFilesManager.init(),
      ColorManager.init(),
      Tutorials.init(),
      UserState.init(),
      QuickSettingsManager.init(),
      // 扩展加载失败不应阻断主程序启动（否则 renderApp 不会执行，窗口为空白）
      ExtensionManager.init().catch((e) => {
        console.error("[ExtensionManager] 扩展初始化失败，已跳过：", e);
      }),
    ]);
    if (isCliDesktopAcceptance) {
      await invoke("write_cli_desktop_acceptance_state", {
        state: { phase: "initializing", step: "application-services" },
      });
    }
    // 这些东西依赖上面的东西，所以单独一个Promise.all
    await Promise.all([loadLanguageFiles(), loadSyncModules(), ...(isCliDesktopAcceptance ? [] : [initAuth()])]);
    await renderApp(isCliMode, isCliDesktopAcceptance);
    appRendered = true;
    if (isCliDesktopAcceptance) {
      await invoke("write_cli_desktop_acceptance_state", {
        state: { phase: "initializing", step: "application-rendered" },
      });
      const { runProjectGraphCliDesktopAcceptanceHost } = await import("./cli/ProjectGraphCliDesktopAcceptanceHost");
      await runProjectGraphCliDesktopAcceptanceHost();
      return;
    }
    await loadStartFile();
    if (!isCliMode) {
      await ensureStartupDraftAndWelcome();
    }
    if (isCliMode) {
      try {
        await runCli(matches);
        exit();
      } catch (e) {
        writeStderr(String(e));
        exit(1);
      }
    }
  } catch (error) {
    if (isCliDesktopAcceptance) {
      await invoke("write_cli_desktop_acceptance_state", {
        state: { phase: "error", message: error instanceof Error ? (error.stack ?? error.message) : String(error) },
      });
    }
    if (!appRendered && !cliMode && !isCliDesktopAcceptance) {
      await renderStartupError(error);
      return;
    }
    throw error;
  }
})();

/** 加载同步初始化的模块 */
async function loadSyncModules() {
  EdgeCollisionBoxGetter.init();
  // SoundService.init();
  MouseLocation.init();
}

/** 初始化认证状态：从持久化存储中恢复 session */
async function initAuth() {
  if (!authClient) {
    store.set(isAuthLoadingAtom, false);
    return;
  }
  try {
    const session = await UserState.getSession();
    if (session?.token) {
      // 验证 session 是否仍然有效
      const { data } = await authClient.getSession();
      if (data?.user) {
        store.set(currentUserAtom, data.user as AuthUser);
      } else {
        // token 失效，清理本地存储
        await UserState.clearSession();
      }
    }
  } catch {
    // 网络错误等不影响启动，清理本地 session 即可
    await UserState.clearSession();
  } finally {
    store.set(isAuthLoadingAtom, false);
  }
}

/** 加载语言文件 */
async function loadLanguageFiles() {
  await i18next.use(initReactI18next).init({
    lng: Settings.language,
    // debug会影响性能，并且没什么用，所以关掉
    // debug: import.meta.env.DEV,
    debug: false,
    defaultNS: "",
    fallbackLng: false,
    saveMissing: false,
    resources: {
      en: await import("./locales/en.yml").then((m) => m.default),
      zh_CN: await import("./locales/zh_CN.yml").then((m) => m.default),
      zh_TW: await import("./locales/zh_TW.yml").then((m) => m.default),
      zh_TWC: await import("./locales/zh_TWC.yml").then((m) => m.default),
      id: await import("./locales/id.yml").then((m) => m.default),
    },
  });
}

/** 渲染应用 */
async function renderApp(cli: boolean = false, cliDesktopAcceptance: boolean = false) {
  const root = createRoot(el);
  if (cli) {
    await getCurrentWindow().hide();
    await getCurrentWindow().setSkipTaskbar(true);
    root.render(<></>);
  } else if (cliDesktopAcceptance) {
    root.render(<></>);
  } else {
    // if (isMobile) {
    //   document.querySelector<HTMLMetaElement>("meta[name=viewport]")!.content =
    //     "width=device-width, initial-scale=0.5, maximum-scale=0.5, user-scalable=yes, interactive-widget=overlays-content";
    //   document.documentElement.style.transform = "scale(0.5)";
    //   document.documentElement.style.transformOrigin = "top left";
    //   document.documentElement.style.overflow = "hidden";
    // }
    root.render(
      <Provider store={store}>
        <Toaster richColors visibleToasts={5} expand />
        <ErrorBoundary FallbackComponent={Fallback}>
          <App />
        </ErrorBoundary>
      </Provider>,
    );
  }
}

async function renderStartupError(error: unknown) {
  flushSync(() => createRoot(el).render(<Fallback error={error} resetErrorBoundary={() => location.reload()} />));
  if (!isWeb) await getCurrentWindow().show();
}

async function loadStartFile() {
  if (isWeb || !isDesktop) return;

  const cliMatches = await getMatches();
  const argPath = cliMatches.args.path.value as string | undefined;
  if (argPath) {
    if (isProjectGraphDeepLink(argPath)) {
      try {
        await handleDeepLink([argPath]);
      } catch (e) {
        toast.error("处理 Deep Link 失败: " + String(e));
      }
    } else {
      try {
        const isExists = await exists(argPath);
        if (isExists) {
          await onOpenFile(URI.file(argPath), "CLI或双击文件");
        } else {
          toast.error("文件不存在");
        }
      } catch (e) {
        toast.error("打开文件失败: " + String(e));
      }
    }
  }

  const pending = await invoke<string[]>("take_pending_open_files");
  for (const path of pending) {
    if (!path.toLowerCase().endsWith(".prg")) continue;
    const isExists = await exists(path);
    if (isExists) {
      await onOpenFile(URI.file(path), "macOS双击文件(启动)");
    } else {
      toast.error("文件不存在");
    }
  }

  listen<string>("open-file-from-os", async (event) => {
    const path = event.payload;
    const isExists = await exists(path);
    if (isExists) {
      await onOpenFile(URI.file(path), "macOS双击文件");
    } else {
      toast.error("文件不存在");
    }
  });

  // Deep link: 冷启动（应用通过 URL 唤起）
  try {
    const urls = await getCurrent();
    if (urls && urls.length > 0) {
      await handleDeepLink(urls);
    }
  } catch (e) {
    toast.error("处理 Deep Link 失败: " + String(e));
  }

  // Deep link: 热启动（应用已运行时收到 URL）
  onOpenUrl((urls) => {
    if (urls.length > 0) {
      void handleDeepLink(urls);
    }
  });
}

/** 无外部文件时创建空草稿并弹出欢迎窗（类 Blender splash） */
async function ensureStartupDraftAndWelcome() {
  if (store.get(tabsAtom).length > 0) return;
  await onNewDraft();
  WelcomeWindow.open();
}
