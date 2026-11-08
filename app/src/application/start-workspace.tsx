import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/core/service/auth-client";
import { MouseLocation } from "@/core/service/control-service/mouse-location";
import { RecentFileManager } from "@/core/service/data-file-service/recent-file-manager";
import { StartFilesManager } from "@/core/service/data-file-service/start-files-manager";
import { ColorManager } from "@/core/service/feedback-service/color-manager";
import { QuickSettingsManager } from "@/core/service/quick-settings-manager";
import { Tutorials } from "@/core/service/tutorials";
import { UserState } from "@/core/service/user-state";
import { EdgeCollisionBoxGetter } from "@/core/stage/stage-object/association/edge-collision-box-getter";
import { type AuthUser, currentUserAtom, isAuthLoadingAtom, store, tabsAtom } from "@/state";
import { Host, Bridge, events } from "@/platform/desktop";
import { ensureOpenProjectRuntimeBridgeListener } from "@/core/open-project-runtime-host";
import { getCurrentWindow } from "@/platform/window";
import "driver.js/dist/driver.css";
import { Provider } from "jotai";
import type { Root } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import App from "@/app";
import { ExtensionManager } from "@/core/extension/extension-manager";
import { handleDeepLink } from "@/core/service/data-file-service/deep-link-handler";
import { onNewDraft, onOpenFile } from "@/core/service/global-menu";
import WelcomeWindow from "@/sub/welcome-window";
import Fallback from "@/fallback";

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

export async function startWorkspace(root: Root, fresh: boolean) {
  await Promise.all([
    RecentFileManager.init(),
    StartFilesManager.init(),
    ColorManager.init(),
    Tutorials.init(),
    UserState.init(),
    QuickSettingsManager.init(),
  ]);
  EdgeCollisionBoxGetter.init();
  MouseLocation.init();
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
  await ensureOpenProjectRuntimeBridgeListener();
  await Bridge.ready();
  await initAuth();
  events.openRequestsChanged.on(() => {
    void processOpenRequests();
  });
  await processOpenRequests();
  if (store.get(tabsAtom).length === 0) {
    await onNewDraft();
    if (!fresh) WelcomeWindow.open();
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
