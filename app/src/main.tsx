import { Acceptance, Host } from "@/platform/desktop";
import { LazyStore } from "@/platform/store";
import { getCurrentWindow } from "@/platform/window";
import { loadOnboarding } from "@/features/onboarding/onboarding-state";
import i18next from "i18next";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import "./css/index.css";

const root = createRoot(document.getElementById("root")!);
const acceptance = import.meta.env.DEV && new URLSearchParams(location.search).has("cli-desktop-acceptance");

async function start() {
  await Host.bootstrap();
  const { Settings } = await import("@/core/service/settings");
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
  const storage = new LazyStore("onboarding.json");
  const state = acceptance
    ? undefined
    : await loadOnboarding(storage, {
        language: Settings.language,
        theme: Settings.theme,
        uiScalePercent: Settings.uiScalePercent,
      });
  if (state && !state.completedAt) {
    const { Onboarding } = await import("@/features/onboarding/onboarding");
    await new Promise<void>((resolve) =>
      root.render(<Onboarding storage={storage} initial={state} onComplete={resolve} />),
    );
  }
  // Workspace imports register background services; keep them behind the durable completion marker.
  const { startWorkspace } = await import("@/application/start-workspace");
  await startWorkspace(root, !!state && !state.completedAt, acceptance);
}

void start().catch(async (error: unknown) => {
  root.render(
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1>Project Graph could not start</h1>
      <pre className="max-w-full overflow-auto whitespace-pre-wrap" role="alert">
        {String(error)}
      </pre>
      <button type="button" onClick={() => location.reload()}>
        Retry / 重试
      </button>
    </main>,
  );
  await getCurrentWindow().show();
  if (acceptance)
    await Acceptance.writeState({
      phase: "error",
      message: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
});
