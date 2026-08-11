import { Project, ProjectState } from "@/core/Project";
import { onNewDraft, onOpenFile } from "@/core/service/GlobalMenu";
import { enableCliDesktopAcceptanceAdapter } from "@/core/service/dataManageService/aiEngine/CliDesktopAcceptanceAdapter";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { activeTabAtom, store, tabsAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { URI } from "vscode-uri";
import type {
  CliDesktopAcceptanceCategory,
  CliDesktopAcceptanceManifest,
  CliDesktopAcceptanceState,
} from "./ProjectGraphCliDesktopAcceptanceProtocol";

async function writeState(state: CliDesktopAcceptanceState): Promise<void> {
  await invoke("write_cli_desktop_acceptance_state", { state });
}

async function renderSettled(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function runProjectGraphCliDesktopAcceptanceHost(): Promise<void> {
  try {
    const manifest = await invoke<CliDesktopAcceptanceManifest>("load_cli_desktop_acceptance_manifest");
    enableCliDesktopAcceptanceAdapter();
    const projects = new Map<string, Project>();
    for (const [index, invocation] of manifest.invocations.entries()) {
      const project = await onOpenFile(URI.file(invocation.projectPath), "CLI desktop acceptance");
      if (!project) throw new Error(`Could not open acceptance Project: ${invocation.projectPath}`);
      projects.set(invocation.projectPath, project);
      for (const object of project.stage) object.isSelected = true;
      if ((index + 1) % 5 === 0) {
        await writeState({ phase: "initializing", step: `opened-project-${index + 1}` });
      }
    }
    await renderSettled();

    const unsavedProject = projects.get(manifest.unsavedProjectPath);
    if (!unsavedProject) throw new Error("Unsaved acceptance Project was not opened");
    unsavedProject.stageManager.add(
      new TextNode(unsavedProject, {
        uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        text: "desktop-unsaved-sentinel",
        collisionBox: new CollisionBox([new Rectangle(new Vector(500, 200), new Vector(160, 60))]),
      }),
    );
    unsavedProject.projectState = ProjectState.Unsaved;

    const savedDraft = await onNewDraft();
    savedDraft.stageManager.add(
      new TextNode(savedDraft, {
        uuid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        text: "desktop-saved-draft-sentinel",
        collisionBox: new CollisionBox([new Rectangle(new Vector(300, 100), new Vector(160, 60))]),
      }),
    );
    await savedDraft.saveAs(URI.file(manifest.savedDraftProjectPath), { includeThumbnail: false });

    const foreground = await onNewDraft();
    await renderSettled();
    const focusTarget = document.createElement("input");
    focusTarget.id = "cli-desktop-acceptance-focus";
    document.body.append(focusTarget);
    const currentWindow = getCurrentWindow();
    await currentWindow.setFocus();
    await renderSettled();
    focusTarget.focus();

    const tabsBefore = store.get(tabsAtom);
    const activeTabBefore = store.get(activeTabAtom);
    const activeElementBefore = document.activeElement;
    const windowFocusedBefore = await currentWindow.isFocused();
    if (!windowFocusedBefore) throw new Error("Could not focus the desktop acceptance window");
    const categories = manifest.invocations.reduce<Record<CliDesktopAcceptanceCategory, number>>(
      (counts, invocation) => ({ ...counts, [invocation.category]: counts[invocation.category] + 1 }),
      { project: 0, selection: 0, viewport: 0 },
    );
    await writeState({
      phase: "ready",
      projectCount: projects.size,
      foregroundTabId: foreground.id,
      categories,
    });

    await invoke("wait_for_cli_desktop_acceptance_completion");
    await renderSettled();
    await writeState({
      phase: "verified",
      activeTabUnchanged: store.get(activeTabAtom) === activeTabBefore,
      tabListUnchanged:
        store.get(tabsAtom).length === tabsBefore.length &&
        store.get(tabsAtom).every((tab, index) => tab === tabsBefore[index]),
      domFocusUnchanged: document.activeElement === activeElementBefore,
      windowFocusUnchanged: (await currentWindow.isFocused()) === windowFocusedBefore,
    });
  } catch (error) {
    await writeState({
      phase: "error",
      message: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
  }
}
