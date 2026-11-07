export type CliDesktopAcceptanceCategory = "project" | "selection" | "viewport";

export type CliDesktopAcceptanceInvocation = {
  name: string;
  category: CliDesktopAcceptanceCategory;
  projectPath: string;
  invocationPath: string;
  input: unknown;
};

export type CliDesktopAcceptanceManifest = {
  invocations: CliDesktopAcceptanceInvocation[];
  unsavedProjectPath: string;
  savedDraftProjectPath: string;
};

export type CliDesktopAcceptanceState =
  | { phase: "initializing"; step: string }
  | {
      phase: "ready";
      projectCount: number;
      foregroundTabId: string;
      categories: Record<CliDesktopAcceptanceCategory, number>;
    }
  | {
      phase: "verified";
      activeTabUnchanged: boolean;
      tabListUnchanged: boolean;
      domFocusUnchanged: boolean;
      windowFocusUnchanged: boolean;
    }
  | { phase: "error"; message: string };
