import logoUrl from "@/assets/icon.png";
import { Dialog } from "@/components/ui/dialog";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function AboutTab() {
  const [appVersion, setAppVersion] = useState("unknown");
  const [logoClickCount, setLogoClickCount] = useState(0);
  const { t } = useTranslation("welcome");

  useEffect(() => {
    (async () => {
      setAppVersion(await getVersion());
    })();
  }, []);
  useEffect(() => {
    (async () => {
      if (logoClickCount >= 10) {
        const url = await Dialog.input("navigate", navigator.userAgent, { destructive: true });
        if (url && url.length > 5) {
          window.location.href = url;
        }
        setLogoClickCount(0);
      }
    })();
  }, [logoClickCount]);

  return (
    <div className="text-foreground h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-16">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <button
            type="button"
            aria-label="Project Graph"
            className="focus-visible:ring-ring focus-visible:ring-offset-background size-24 shrink-0 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-offset-4 sm:size-28"
            onClick={() => setLogoClickCount((it) => it + 1)}
          >
            <img src={logoUrl} alt="" className="size-full" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Project Graph</h1>
              <a
                href="https://graphif.dev/docs/app/misc/history"
                onClick={(event) => {
                  event.preventDefault();
                  void open("https://graphif.dev/docs/app/misc/history");
                }}
                className="border-border bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-lg font-medium transition-colors [corner-shape:round] focus-visible:outline-2"
              >
                v{appVersion}
              </a>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">{t("slogan")}</p>
          </div>
        </header>

        <section className="text-muted-foreground max-w-2xl text-base leading-8">
          <p>{t("aboutDescription")}</p>
        </section>

        <section className="border-border grid grid-cols-1 gap-8 border-t pt-8 text-sm sm:grid-cols-2 sm:gap-12">
          <div className="flex flex-col gap-4">
            <h2 className="text-muted-foreground text-xs font-medium">开发者</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-3">
              <Author name="Littlefean(阿岳)" url="https://github.com/Littlefean" />
              <Author name="zty012" url="https://github.com/zty012" />
              <Author name="Rutubet(小劫)" url="https://github.com/Rutubet" />
              <Author name="Waya" url="https://github.com/Wang-Yang-source?tab=repositories" />
            </div>
            <p className="text-muted-foreground">以及所有贡献者</p>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-muted-foreground text-xs font-medium">官网与仓库</h2>
            <div className="flex flex-col items-start gap-3">
              <Author name="graphif.dev ↗" url="https://graphif.dev/" />
              <Author name="graphif/project-graph ↗" url="https://github.com/graphif/project-graph" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const Author: React.FC<{ name: string; url: string }> = ({ name, url }: { name: string; url: string }) => {
  return (
    <a
      href={url}
      className="hover:text-primary focus-visible:outline-ring cursor-pointer rounded-sm font-medium decoration-current/40 underline-offset-4 transition-colors hover:underline focus-visible:outline-2"
      onClick={(event) => {
        event.preventDefault();
        void open(url);
      }}
    >
      {name}
    </a>
  );
};
