import { Toaster } from "@/components/ui/sonner";
import { UserScriptsManager } from "@/core/plugin/UserScriptsManager";
import { MouseLocation } from "@/core/service/controlService/MouseLocation";
import { RecentFileManager } from "@/core/service/dataFileService/RecentFileManager";
import { StartFilesManager } from "@/core/service/dataFileService/StartFilesManager";
import { QuickSettingsManager } from "@/core/service/QuickSettingsManager";
import { Settings } from "@/core/service/Settings";
import { Tutorials } from "@/core/service/Tourials";
import { UserState } from "@/core/service/UserState";
import { EdgeCollisionBoxGetter } from "@/core/stage/stageObject/association/EdgeCollisionBoxGetter";
import { store } from "@/state";
import "driver.js/dist/driver.css";
import i18next from "i18next";
import { Provider } from "jotai";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import App from "./App";
import "./css/index.css";

const el = document.getElementById("root")!;

// 建议挂载根节点前的一系列操作统一写成函数，
// 在这里看着清爽一些，像一个列表清单一样。也方便调整顺序

(async () => {
  await Promise.all([
    RecentFileManager.init(),
    StartFilesManager.init(),
    Tutorials.init(),
    UserScriptsManager.init(),
    UserState.init(),
    QuickSettingsManager.init(),
  ]);
  // 这些东西依赖上面的东西，所以单独一个Promise.all
  await Promise.all([loadLanguageFiles(), loadSyncModules()]);
  await renderApp();
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
async function renderApp() {
  const root = createRoot(el);
  root.render(
    <Provider store={store}>
      <Toaster richColors visibleToasts={5} expand />
      <App />
    </Provider>,
  );
}
