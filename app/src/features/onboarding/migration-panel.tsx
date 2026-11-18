import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Migration, type LegacyDetection, type MigrationReport } from "@/generated/mygo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function useOnboardingTranslation() {
  const { i18n } = useTranslation();
  // Other locales do not have hand-maintained onboarding strings yet.
  return i18n.getFixedT(i18n.language === "zh_CN" ? "zh_CN" : "en", "onboarding");
}

export function MigrationPanel({
  report,
  onImported,
  onBusyChange,
}: {
  report?: Pick<MigrationReport, "imported" | "completedAt">;
  onImported: (report: MigrationReport) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useOnboardingTranslation();
  const [detection, setDetection] = useState<LegacyDetection>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  useEffect(() => {
    if (report) return;
    let active = true;
    Migration.detect()
      .then((result) => {
        if (active) setDetection(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(String(cause));
      });
    return () => {
      active = false;
    };
  }, [report]);

  async function perform(importData: boolean) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const result = await Migration.detect();
      setDetection(result);
      if (importData && !result.running && result.dataDirectories.length > 0) {
        await onImported(await Migration.importAll());
      }
    } catch (cause) {
      setError(String(cause));
    } finally {
      locked.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  const found = (detection?.dataDirectories.length ?? 0) > 0;
  const status = report
    ? "imported"
    : busy
      ? "importing"
      : detection?.running
        ? "running"
        : found
          ? "found"
          : error || detection?.errors.length
            ? "failed"
            : detection
              ? "not-detected"
              : "checking";

  return (
    <section className="flex flex-col gap-5" aria-busy={busy}>
      <div className="bg-muted/40 flex flex-col gap-2 rounded-xl border p-5 text-left" role="status" aria-live="polite">
        <p className="font-medium">{t(`migration.${status}`)}</p>
        <p className="text-muted-foreground text-sm leading-7">
          {report ? t("migration.report", { imported: report.imported }) : t("migration.contents")}
        </p>
      </div>
      {!report && (
        <>
          {found && !detection?.running && (
            <Button size="lg" disabled={busy} onClick={() => void perform(true)}>
              {t(busy ? "migration.importing" : "migration.import")}
            </Button>
          )}
          {!busy && (!found || detection?.running || error) && (detection || error) && (
            <Button variant="ghost" onClick={() => void perform(false)}>
              {t("retry")}
            </Button>
          )}
          <p className="text-muted-foreground text-left text-xs leading-6">{t("migration.safety")}</p>
        </>
      )}
      {!report && (error || !!detection?.errors.length) && (
        <Alert variant="destructive">
          <AlertTitle>{t("failed")}</AlertTitle>
          <AlertDescription role="alert">{error || detection?.errors.join("\n")}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
