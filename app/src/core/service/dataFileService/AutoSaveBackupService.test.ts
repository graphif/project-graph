import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/utils/platform", () => ({ family: () => "unix" }));

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => () => {}, ProjectState: { Unsaved: "unsaved" } }));
vi.mock("@/core/service/Settings", () => ({
  Settings: {
    autoSave: true,
    autoBackup: false,
    autoSaveInterval: 1,
    autoBackupInterval: 1,
    autoBackupStrategy: "sideBySide",
  },
}));
vi.mock("@tauri-apps/api/path", () => ({
  appCacheDir: vi.fn(),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn(),
  writeFile: vi.fn(),
  readDir: vi.fn(async () => []),
  stat: vi.fn(),
  remove: vi.fn(),
  mkdir: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AutoSaveBackupService } from "./AutoSaveBackupService";
import { Settings } from "@/core/service/Settings";
import type { Project } from "@/core/Project";

afterEach(() => {
  vi.restoreAllMocks();
  Settings.autoBackup = false;
});

describe("automatic project persistence", () => {
  it("skips an active manual save and collaborative documents", () => {
    vi.spyOn(Date, "now").mockReturnValue(10000);
    const project = { uri: {}, isSaving: true, projectState: "unsaved", save: vi.fn() };
    const service = new AutoSaveBackupService(project as unknown as Project);
    service.tick();
    expect(project.save).not.toHaveBeenCalled();
    project.isSaving = false;
    Object.assign(project, { isCollab: true });
    service.tick();
    expect(project.save).not.toHaveBeenCalled();
  });

  it("does not start another snapshot or autosave while a backup is pending", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    Settings.autoBackup = true;
    let finish!: (value: Uint8Array) => void;
    const project = {
      uri: { toString: () => "file:///tmp/test.prg" },
      projectState: "unsaved",
      stageHash: "changed",
      getFileContent: vi.fn(
        () =>
          new Promise<Uint8Array>((resolve) => {
            finish = resolve;
          }),
      ),
      save: vi.fn(),
    };
    const service = new AutoSaveBackupService(project as unknown as Project);
    now.mockReturnValue(2000);
    service.tick();
    await vi.waitFor(() => expect(project.getFileContent).toHaveBeenCalledOnce());
    now.mockReturnValue(5000);
    service.tick();
    expect(project.getFileContent).toHaveBeenCalledOnce();
    expect(project.save).not.toHaveBeenCalled();
    finish(new Uint8Array());
    await vi.waitFor(() => expect((service as unknown as { isBackingUp: boolean }).isBackingUp).toBe(false));
    now.mockReturnValue(8000);
    service.tick();
    await Promise.resolve();
    service.tick();
    expect(project.save).toHaveBeenCalledOnce();
  });
});
