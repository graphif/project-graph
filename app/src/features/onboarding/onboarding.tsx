import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import i18next from "i18next";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, persistSettings, refreshSettings } from "@/core/service/settings";
import type { MigrationReport } from "@/generated/mygo";
import { Themes } from "@/core/service/themes";
import { cn } from "@/utils/cn";
import type { Store } from "@/platform/store";
import { getCurrentWindow } from "@/platform/window";
import { open } from "@/platform/shell";
import { completeOnboarding, saveOnboarding, type OnboardingDraft, type OnboardingState } from "./onboarding-state";
import { MigrationPanel, useOnboardingTranslation } from "./migration-panel";

const languages = {
  en: "English",
  zh_CN: "简体中文",
  zh_TW: "繁體中文",
  zh_TWC: "接地氣繁體中文",
  id: "Bahasa Indonesia",
};
const steps = ["welcome", "migration", "appearance", "ready"] as const;

export function Onboarding({
  storage,
  initial,
  onComplete,
}: {
  storage: Store;
  initial: OnboardingState;
  onComplete: () => void;
}) {
  const t = useOnboardingTranslation();
  const [state, setState] = useState(() => ({
    ...initial,
    draft: {
      ...initial.draft,
      theme: Themes.getThemeById(initial.draft.theme)?.metadata.type === "light" ? "light" : "dark",
    },
  }));
  const [busy, setBusy] = useState(false);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  const migrating = useRef(false);
  migrating.current = migrationBusy;
  const reducedMotion = useReducedMotion();
  const draft = state.draft;
  const themeChoices = [
    Themes.builtinThemes.find(({ metadata }) => metadata.id === "light"),
    Themes.builtinThemes.find(({ metadata }) => metadata.id === "dark"),
  ].filter((theme): theme is (typeof Themes.builtinThemes)[number] => theme !== undefined);

  useEffect(() => {
    const theme = state.step >= 2 ? draft.theme : Settings.theme;
    if (!Themes.applyThemeById(theme)) setError(`Unknown theme: ${theme}`);
    void i18next.changeLanguage(draft.language).catch((cause: unknown) => setError(String(cause)));
  }, [state.step, draft.theme, draft.language]);
  useEffect(() => {
    heading.current?.focus();
  }, [state.step]);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    getCurrentWindow()
      .onCloseRequested(async () => {
        if (!locked.current && !migrating.current) await getCurrentWindow().destroy();
      })
      .then((remove) => {
        if (active) unsubscribe = remove;
        else remove();
      })
      .catch((cause: unknown) => setError(String(cause)));
    void getCurrentWindow()
      .show()
      .catch((cause: unknown) => setError(String(cause)));
    return () => {
      active = false;
      unsubscribe?.();
      Themes.applyThemeById(Settings.theme);
    };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(String(cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function update(patch: Partial<OnboardingState>) {
    void perform(async () => {
      const next = { ...state, ...patch };
      await saveOnboarding(storage, next);
      setState(next);
    });
  }
  function updateDraft(patch: Partial<OnboardingDraft>) {
    update({ draft: { ...draft, ...patch } });
  }
  async function imported(report: MigrationReport) {
    await refreshSettings();
    const next = {
      ...state,
      migration: { imported: report.imported, completedAt: report.completedAt },
      draft: {
        language: Settings.language,
        theme: Themes.getThemeById(Settings.theme) ? Settings.theme : Settings.themeMode,
        uiScalePercent: Settings.uiScalePercent,
      },
    };
    await saveOnboarding(storage, next);
    setState(next);
  }
  function finish() {
    void perform(async () => {
      await completeOnboarding(storage, state, async (values) => {
        const theme = Themes.getThemeById(values.theme);
        if (!theme) throw new Error(`Unknown theme: ${values.theme}`);
        await persistSettings({
          language: values.language,
          theme: values.theme,
          themeMode: theme.metadata.type,
          ...(theme.metadata.type === "dark" ? { darkTheme: values.theme } : { lightTheme: values.theme }),
          uiScalePercent: values.uiScalePercent,
        });
      });
      onComplete();
    });
  }
  const disabled = busy || migrationBusy;
  return (
    <main
      className="bg-background text-foreground relative isolate flex min-h-svh flex-col overflow-x-clip"
      style={{
        fontFamily: '"Project Graph Canvas", sans-serif',
      }}
    >
      <header className="relative z-10 flex shrink-0 items-center gap-4 px-6 py-5 sm:px-10">
        <span data-pg-titlebar-drag className="text-muted-foreground flex-1 text-xs tracking-[0.2em] uppercase">
          Project Graph
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => void perform(() => getCurrentWindow().destroy())}
        >
          {t("close")}
        </Button>
      </header>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-2">
        <aside
          aria-hidden="true"
          className="bg-muted/40 relative flex min-h-56 items-center justify-center overflow-hidden md:row-span-1 md:min-h-[calc(100svh-5rem)]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 35% 35%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 65%)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--muted-foreground)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse,black,transparent_75%)] [background-size:24px_24px] opacity-[0.12]" />
          <SetupArtwork step={state.step} />
          <div className="text-muted-foreground absolute bottom-10 hidden items-center gap-3 text-[10px] tracking-[0.3em] uppercase md:flex">
            <span className="bg-primary/40 h-px w-8" />
            Project Graph
            <span className="bg-primary/40 h-px w-8" />
          </div>
        </aside>
        <div className="mx-auto flex w-full max-w-xl flex-col justify-center px-7 py-10 md:px-10 md:py-14 lg:px-16">
          <nav aria-label={t("progress")} className="mb-10 flex items-center gap-5">
            <span className="text-muted-foreground text-xs font-medium tabular-nums">
              {String(state.step + 1).padStart(2, "0")} / 04
            </span>
            <ol className="flex gap-2">
              {steps.map((step, index) => (
                <li key={step} aria-current={index === state.step ? "step" : undefined}>
                  <span className="sr-only">{t(`${step}.title`)}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1 rounded-full transition-all duration-300 motion-reduce:transition-none",
                      index <= state.step ? "bg-primary" : "bg-muted-foreground/20",
                      index === state.step ? "w-8" : "w-3",
                    )}
                  />
                </li>
              ))}
            </ol>
          </nav>
          <motion.section
            key={state.step}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
            aria-labelledby="onboarding-heading"
            className="flex flex-col gap-9"
          >
            <div className="flex flex-col items-start gap-6 text-left">
              <div className="flex flex-col gap-5">
                <h1
                  id="onboarding-heading"
                  tabIndex={-1}
                  ref={heading}
                  className="text-3xl leading-[1.2] font-semibold tracking-tight outline-none lg:text-4xl xl:text-5xl"
                >
                  {t(`${steps[state.step]}.title`)}
                </h1>
                <p className="text-muted-foreground max-w-sm text-sm leading-7 text-pretty lg:text-base lg:leading-8">
                  {t(`${steps[state.step]}.subtitle`)}
                </p>
              </div>
            </div>
            {state.step === 0 && (
              <div className="flex w-full flex-col gap-3">
                <Label htmlFor="onboarding-language">{t("welcome.language")}</Label>
                <Select
                  value={draft.language}
                  disabled={disabled}
                  onValueChange={(language) => updateDraft({ language: language as OnboardingDraft["language"] })}
                >
                  <SelectTrigger id="onboarding-language" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(languages).map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
            {state.step === 1 && (
              <MigrationPanel report={state.migration} onImported={imported} onBusyChange={setMigrationBusy} />
            )}
            {state.step === 2 && (
              <div className="flex flex-col gap-6">
                <fieldset disabled={disabled} className="flex flex-col gap-3">
                  <legend className="mb-3 text-sm font-medium">{t("appearance.theme")}</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {themeChoices.map(({ metadata }) => (
                      <label key={metadata.id} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="onboarding-theme"
                          value={metadata.id}
                          checked={Themes.getThemeById(draft.theme)?.metadata.type === metadata.type}
                          onChange={() => updateDraft({ theme: metadata.id })}
                          className="peer sr-only"
                        />
                        <span className="border-border bg-card peer-checked:border-primary peer-checked:bg-accent peer-focus-visible:ring-ring flex flex-col items-start gap-3 rounded-xl border px-5 py-5 text-sm transition-colors peer-focus-visible:ring-2">
                          <span aria-hidden="true" className="text-xl">
                            {metadata.type === "light" ? "☀" : "☾"}
                          </span>
                          {t(`appearance.${metadata.type}`)}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="onboarding-scale">{t("appearance.scale")}</Label>
                  <Select
                    value={String(draft.uiScalePercent)}
                    disabled={disabled}
                    onValueChange={(value) => updateDraft({ uiScalePercent: Number(value) })}
                  >
                    <SelectTrigger id="onboarding-scale">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {[...new Set([100, 125, 150, draft.uiScalePercent])]
                          .sort((a, b) => a - b)
                          .map((scale) => (
                            <SelectItem key={scale} value={String(scale)}>
                              {scale}%
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/40 overflow-auto rounded-xl border p-5 text-left">
                  <p style={{ zoom: draft.uiScalePercent / 100 }}>{t("appearance.preview")}</p>
                </div>
              </div>
            )}
            {state.step === 3 && (
              <div className="flex flex-col items-start gap-5">
                <p className="text-muted-foreground text-left text-sm leading-7">{t("ready.safety")}</p>
                <Button
                  variant="link"
                  disabled={disabled}
                  onClick={() => void perform(() => open("https://project-graph.top"))}
                >
                  {t("website")}
                </Button>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{t("failed")}</AlertTitle>
                <AlertDescription role="alert">{error}</AlertDescription>
              </Alert>
            )}
          </motion.section>
          <footer className="mt-12 flex flex-wrap items-center justify-between gap-4">
            <div>
              {state.step > 0 && (
                <Button variant="ghost" disabled={disabled} onClick={() => update({ step: state.step - 1 })}>
                  {t("back")}
                </Button>
              )}
            </div>
            <Button
              size="lg"
              className="min-w-36"
              disabled={disabled}
              onClick={() => (state.step === 3 ? finish() : update({ step: state.step + 1 }))}
            >
              {t(state.step === 3 ? "finish" : state.step === 1 && !state.migration ? "migration.skip" : "next")}
            </Button>
          </footer>
        </div>
      </div>
    </main>
  );
}

function SetupArtwork({ step }: { step: number }) {
  const reducedMotion = useReducedMotion();
  const nodes = [
    { x: 72, y: 125, width: 100, height: 64 },
    { x: 305, y: 88, width: 94, height: 64 },
    { x: 318, y: 290, width: 100, height: 64 },
    { x: 60, y: 310, width: 100, height: 64 },
  ];
  return (
    <motion.svg
      key={step}
      viewBox="0 0 480 480"
      className="text-primary relative w-full max-w-[560px] p-3 max-md:max-h-64 md:p-6"
      fill="none"
      aria-hidden="true"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.7 }}
    >
      <circle cx="240" cy="240" r="186" stroke="currentColor" opacity="0.06" />
      <circle cx="240" cy="240" r="136" stroke="currentColor" opacity="0.08" strokeDasharray="3 9" />
      <motion.circle
        cx="240"
        cy="240"
        r="86"
        fill="currentColor"
        opacity="0.04"
        animate={reducedMotion ? undefined : { scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "240px 240px" }}
      />
      {step < 2 &&
        nodes.map(({ x, y, width, height }, index) => (
          <g key={x}>
            <motion.path
              d={`M${x + width / 2} ${y + height / 2} Q240 ${y + height / 2} 240 240`}
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.2"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reducedMotion ? 0 : 1.2, delay: reducedMotion ? 0 : index * 0.12 }}
            />
            {step === 1 && (
              <motion.circle
                r="4"
                fill="currentColor"
                initial={false}
                animate={
                  reducedMotion
                    ? { cx: x + width / 2, cy: y + height / 2, opacity: 0.6 }
                    : {
                        cx: [x + width / 2, 240],
                        cy: [y + height / 2, 240],
                        opacity: [0, 0.8, 0],
                      }
                }
                transition={{ duration: 2.5, delay: index * 0.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <motion.g
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }}
              transition={{
                opacity: { duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : index * 0.12 },
                y: { duration: 5, delay: index * 0.3, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <rect x={x} y={y + 5} width={width} height={height} rx="15" fill="currentColor" opacity="0.03" />
              <rect x={x} y={y} width={width} height={height} rx="15" className="fill-background" />
              <rect x={x} y={y} width={width} height={height} rx="15" stroke="currentColor" strokeOpacity="0.15" />
              <rect x={x + 16} y={y + 19} width="20" height="5" rx="2.5" fill="currentColor" opacity="0.4" />
              <rect x={x + 16} y={y + 34} width={width - 32} height="4" rx="2" fill="currentColor" opacity="0.1" />
              <rect x={x + 16} y={y + 44} width={width - 48} height="4" rx="2" fill="currentColor" opacity="0.1" />
            </motion.g>
          </g>
        ))}
      {step === 2 ? (
        <motion.g
          initial={reducedMotion ? false : { y: 18 }}
          animate={{ y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.8 }}
        >
          <rect
            x="82"
            y="122"
            width="316"
            height="240"
            rx="22"
            fill="currentColor"
            opacity="0.05"
            transform="rotate(-6 240 240)"
          />
          <rect
            x="82"
            y="120"
            width="316"
            height="240"
            rx="22"
            className="fill-background"
            stroke="currentColor"
            strokeOpacity="0.18"
          />
          <path d="M82 161H398" stroke="currentColor" opacity="0.1" />
          {[103, 116, 129].map((cx) => (
            <circle key={cx} cx={cx} cy="141" r="3" fill="currentColor" opacity="0.25" />
          ))}
          <rect x="100" y="178" width="48" height="164" rx="8" fill="currentColor" opacity="0.04" />
          {[198, 222, 246].map((cy) => (
            <rect key={cy} x="112" y={cy} width="24" height="4" rx="2" fill="currentColor" opacity="0.16" />
          ))}
          <path d="M219 219L321 289M219 219L207 303" stroke="currentColor" opacity="0.25" strokeWidth="2" />
          {[
            [181, 197],
            [284, 266],
            [170, 286],
          ].map(([x, y], index) => (
            <motion.rect
              key={x}
              x={x}
              y={y}
              width="76"
              height="44"
              rx="10"
              fill="currentColor"
              stroke="currentColor"
              strokeOpacity="0.3"
              animate={reducedMotion ? { fillOpacity: 0.12 } : { fillOpacity: [0.06, 0.22, 0.06] }}
              transition={{ duration: 4, delay: index * 0.5, repeat: Infinity }}
            />
          ))}
        </motion.g>
      ) : (
        <>
          <rect x="188" y="196" width="104" height="104" rx="30" fill="currentColor" opacity="0.05" />
          <rect
            x="188"
            y="188"
            width="104"
            height="104"
            rx="30"
            className="fill-background"
            stroke="currentColor"
            strokeOpacity="0.2"
          />
          <rect x="196" y="196" width="88" height="88" rx="24" fill="currentColor" opacity="0.08" />
          {step === 3 ? (
            <motion.path
              d="m218 240 15 15 31-33"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 0.3 }}
            />
          ) : step === 1 ? (
            <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M240 219v30m-10-10 10 10 10-10M221 257h38" />
            </g>
          ) : (
            <g stroke="currentColor" strokeWidth="2.5">
              <path d="m225 226 31 9-23 24-8-33" opacity="0.5" />
              {[
                [225, 226],
                [256, 235],
                [233, 259],
              ].map(([cx, cy]) => (
                <circle key={cx} cx={cx} cy={cy} r="6" className="fill-background" />
              ))}
            </g>
          )}
        </>
      )}
      {step === 3 &&
        [0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <motion.g
            key={index}
            style={{ transformOrigin: "240px 240px", rotate: index * 45 }}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={reducedMotion ? { opacity: 0.4 } : { opacity: [0.2, 0.6, 0.2], scale: [0.9, 1.05, 0.9] }}
            transition={{
              duration: reducedMotion ? 0 : 4,
              delay: reducedMotion ? 0 : index * 0.1,
              repeat: reducedMotion ? 0 : Infinity,
            }}
          >
            <path d="M240 119v10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="240" cy="85" r="3" fill="currentColor" opacity="0.3" />
          </motion.g>
        ))}
    </motion.svg>
  );
}
