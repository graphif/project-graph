import { runCli } from "@/cli";
import { Toaster } from "@/components/ui/sonner";
import { UserScriptsManager } from "@/core/plugin/UserScriptsManager";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { StartFilesManager } from "@/core/service/dataFileService/StartFilesManager";
import { ColorManager } from "@/core/service/feedbackService/ColorManager";
import { Settings } from "@/core/service/Settings";
import { Tutorials } from "@/core/service/Tourials";
import { UserState } from "@/core/service/UserState";
import { EdgeCollisionBoxGetter } from "@/core/stage/stageObject/association/EdgeCollisionBoxGetter";
import { store } from "@/state";
import { exit, writeStderr } from "@/utils/otherApi";
import { isDesktop, isMobile, isWeb } from "@/utils/platform";
import { serializableFallback } from "@graphif/serializer";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getMatches } from "@tauri-apps/plugin-cli";
import { exists } from "@tauri-apps/plugin-fs";
import "driver.js/dist/driver.css";
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import i18next from "i18next";
import { Provider } from "jotai";
import { Color, Container, ObservablePoint, Point } from "pixi.js";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import { toast } from "sonner";
import VConsole from "vconsole";
import { URI } from "vscode-uri";
import App from "./App";
import { KeyBinds } from "./core/service/controlService/shortcutKeysEngine/KeyBinds";
import { onOpenFile } from "./core/service/GlobalMenu";
import "./css/index.css";

gsap.registerPlugin(PixiPlugin);

serializableFallback(Color, "value");
serializableFallback(Container, "position");
serializableFallback(Point, "x");
serializableFallback(Point, "y");
serializableFallback(ObservablePoint, "x");
serializableFallback(ObservablePoint, "y");

if (import.meta.env.DEV && isMobile) {
  new VConsole();
}

const el = document.getElementById("root")!;

// 建议挂载根节点前的一系列操作统一写成函数，
// 在这里看着清爽一些，像一个列表清单一样。也方便调整顺序

(async () => {
  const matches = !isWeb && isDesktop ? await getMatches() : null;
  const isCliMode = isDesktop && matches?.args.output?.occurrences === 1;
  await Promise.all([
    RecentFileManager.init(),
    StartFilesManager.init(),
    ColorManager.init(),
    Tutorials.init(),
    UserScriptsManager.init(),
    UserState.init(),
    KeyBinds.init(),
  ]);
  // 这些东西依赖上面的东西，所以单独一个Promise.all
  await Promise.all([loadLanguageFiles(), loadSyncModules()]);
  await renderApp(isCliMode);
  await loadStartFile();
  if (isCliMode) {
    try {
      await runCli(matches);
      exit();
    } catch (e) {
      writeStderr(String(e));
      exit(1);
    }
  }
})();

/** 加载同步初始化的模块 */
async function loadSyncModules() {
  EdgeCollisionBoxGetter.init();
  // SoundService.init();
  MouseLocation.init();
}

/** 加载语言文件 */
async function loadLanguageFiles() {
  i18next.use(initReactI18next).init({
    lng: Settings.language,
    // debug会影响性能，并且没什么用，所以关掉
    // debug: import.meta.env.DEV,
    debug: false,
    defaultNS: "",
    fallbackLng: false,
    saveMissing: false,
    supportedLngs: ["en", "zh_CN", "zh_TW"],
    resources: {
      en: await import("./locales/en.yml").then((m) => m.default),
      zh_CN: await import("./locales/zh_CN.yml").then((m) => m.default),
      zh_TW: await import("./locales/zh_TW.yml").then((m) => m.default),
    },
  });
}

/** 渲染应用 */
async function renderApp(cli: boolean = false) {
  const root = createRoot(el);
  if (cli) {
    await getCurrentWindow().hide();
    await getCurrentWindow().setSkipTaskbar(true);
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
        <App />
      </Provider>,
    );
  }
}

async function loadStartFile() {
  const cliMatches = await getMatches();
  if (cliMatches.args.path.value) {
    const path = cliMatches.args.path.value as string;
    const isExists = await exists(path);
    if (isExists) {
      onOpenFile(URI.file(path), "CLI或双击文件");
    } else {
      toast.error("文件不存在");
    }
  }
}
