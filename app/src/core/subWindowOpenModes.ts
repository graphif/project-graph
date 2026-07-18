import z from "zod";

export const SUB_WINDOW_OPEN_MODES = ["floating", "docked", "dockedLeft", "dockedRight"] as const;
export type SubWindowOpenMode = (typeof SUB_WINDOW_OPEN_MODES)[number];

export const SUB_WINDOW_IDS = [
  "AIToolsWindow",
  "AIWindow",
  "AttachmentsWindow",
  "AutoCompleteWindow",
  "LogicNodePanel",
  "BackgroundManagerWindow",
  "ColorPaletteWindow",
  "ColorWindow",
  "ColorManagerPanel",
  "EditUrlNodeLinkWindow",
  "ExportPngWindow",
  "FindWindow",
  "FormWindow",
  "GenerateNodeTree",
  "GenerateNodeTreeByMarkdown",
  "GenerateNodeGraph",
  "GenerateNodeMermaid",
  "KeyboardRecentFilesWindow",
  "LatexEditWindow",
  "NewExportPngWindow",
  "NodeDetailsWindow",
  "OnboardingWindow",
  "OutlineWindow",
  "RecentFilesWindow",
  "ReferencesWindow",
  "SectionReferencePanel",
  "TagWindow",
  "LittleTagWindow",
  "TestWindow",
  "TextImportWindow",
  "WelcomeWindow",
  "SettingsWindow",
] as const;

export type SubWindowId = (typeof SUB_WINDOW_IDS)[number];

export type SubWindowOpenModes = Record<SubWindowId, SubWindowOpenMode>;

export const subWindowOpenModeSchema = z.enum(SUB_WINDOW_OPEN_MODES);

/** Defaults from product decisions; users can override in customization settings. */
export const DEFAULT_SUB_WINDOW_OPEN_MODES = {
  AIToolsWindow: "floating",
  AIWindow: "dockedRight",
  AttachmentsWindow: "dockedRight",
  AutoCompleteWindow: "floating",
  LogicNodePanel: "floating",
  BackgroundManagerWindow: "dockedRight",
  ColorPaletteWindow: "dockedRight",
  ColorWindow: "floating",
  ColorManagerPanel: "dockedRight",
  EditUrlNodeLinkWindow: "floating",
  ExportPngWindow: "floating",
  FindWindow: "dockedLeft",
  FormWindow: "floating",
  GenerateNodeTree: "floating",
  GenerateNodeTreeByMarkdown: "floating",
  GenerateNodeGraph: "floating",
  GenerateNodeMermaid: "floating",
  KeyboardRecentFilesWindow: "floating",
  LatexEditWindow: "floating",
  NewExportPngWindow: "floating",
  NodeDetailsWindow: "dockedRight",
  OnboardingWindow: "floating",
  OutlineWindow: "dockedLeft",
  RecentFilesWindow: "docked",
  ReferencesWindow: "dockedRight",
  SectionReferencePanel: "floating",
  TagWindow: "dockedLeft",
  LittleTagWindow: "floating",
  TestWindow: "floating",
  TextImportWindow: "floating",
  WelcomeWindow: "floating",
  SettingsWindow: "docked",
} as const satisfies SubWindowOpenModes;

export const subWindowOpenModesSchema = z.preprocess(
  (value) => {
    const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const merged: Record<string, string> = { ...DEFAULT_SUB_WINDOW_OPEN_MODES };
    for (const id of SUB_WINDOW_IDS) {
      const mode = input[id];
      if (typeof mode === "string" && (SUB_WINDOW_OPEN_MODES as readonly string[]).includes(mode)) {
        merged[id] = mode;
      }
    }
    return merged;
  },
  z.record(z.string(), subWindowOpenModeSchema),
);
