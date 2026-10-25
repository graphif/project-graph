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
import { Acceptance, Host, events } from "@/platform/desktop";
import { getCurrentWindow } from "@/platform/window";
import "driver.js/dist/driver.css";
import i18next from "i18next";
import { Provider } from "jotai";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { initReactI18next } from "react-i18next";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import App from "./App";
import { ExtensionManager } from "./core/extension/ExtensionManager";
import { handleDeepLink } from "./core/service/dataFileService/DeepLinkHandler";
import { onNewDraft, onOpenFile } from "./core/service/GlobalMenu";
import WelcomeWindow from "./sub/WelcomeWindow";
import "./css/index.css";
import Fallback from "./Fallback";

const root = createRoot(document.getElementById("root")!);
const acceptance = import.meta.env.DEV && new URLSearchParams(location.search).has("cli-desktop-acceptance");
let opening = Promise.resolve();

function processOpenRequests() {
  opening = opening
    .then(async () => {
      const pending = await Host.pendingOpenRequests();
      if (pending.rejected) toast.error(`Too many open requests: ${pending.rejected} rejected.`);
      for (const request of pending.items ?? []) {
        try {
          if (request.kind === "url") await handleDeepLink([request.target]);
          else await onOpenFile(URI.file(request.target), "MyGo");
        } catch (error) {
          toast.error(String(error));
        }
        await Host.acknowledgeOpenRequests([request.id]);
      }
    })
    .catch((error: unknown) => {
      toast.error(`Cannot process open requests: ${String(error)}`);
    });
  return opening;
}

async function start() {
  await Host.bootstrap();
  await Promise.all([
    RecentFileManager.init(),
    StartFilesManager.init(),
    ColorManager.init(),
    Tutorials.init(),
    UserState.init(),
    QuickSettingsManager.init(),
  ]);
  await i18next.use(initReactI18next).init({
    lng: Settings.language,
    debug: false,
    defaultNS: "",
    fallbackLng: false,
    saveMissing: false,
    resources: {
      en: (await import("./locales/en.yml")).default,
      zh_CN: (await import("./locales/zh_CN.yml")).default,
      zh_TW: (await import("./locales/zh_TW.yml")).default,
      zh_TWC: (await import("./locales/zh_TWC.yml")).default,
      id: (await import("./locales/id.yml")).default,
    },
  });
  EdgeCollisionBoxGetter.init();
  MouseLocation.init();
  if (acceptance) {
    const { runProjectGraphCliDesktopAcceptanceHost } = await import("./cli/ProjectGraphCliDesktopAcceptanceHost");
    await runProjectGraphCliDesktopAcceptanceHost();
    return;
  }
  root.render(
    <Provider store={store}>
      <Toaster richColors visibleToasts={5} expand />
      <ErrorBoundary FallbackComponent={Fallback}>
        <App />
      </ErrorBoundary>
    </Provider>,
  );
  await getCurrentWindow().show();
  await ExtensionManager.init();
  await initAuth();
  events.openRequestsChanged.on(() => {
    void processOpenRequests();
  });
  await processOpenRequests();
  if (store.get(tabsAtom).length === 0) {
    await onNewDraft();
    WelcomeWindow.open();
  }
}

async function initAuth() {
  try {
    if (!authClient) return;
    const session = await UserState.getSession();
    if (session?.token) {
      const { data } = await authClient.getSession();
      if (data?.user) store.set(currentUserAtom, data.user as AuthUser);
      else await UserState.clearSession();
    }
  } catch (error) {
    toast.error(`Authentication failed: ${String(error)}`);
  } finally {
    store.set(isAuthLoadingAtom, false);
  }
}

void start().catch(async (error: unknown) => {
  if (acceptance)
    await Acceptance.writeState({
      phase: "error",
      message: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
  root.render(<Fallback error={error} resetErrorBoundary={() => location.reload()} />);
  void getCurrentWindow().show();
});
