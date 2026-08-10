import { Dialog } from "@/components/ui/dialog";
import { ensureOpenProjectRuntimeBridgeListener } from "@/core/OpenProjectRuntimeHost";
import { invoke, isTauri } from "@tauri-apps/api/core";
import i18next from "i18next";

type ProjectOwner = { kind: "connectable"; endpoint: string } | { kind: "unconnectable_holder" };

type DesktopOwnershipAcquisition = {
  status: "acquired" | "already_owned";
  ownershipId: string;
  canonicalPath: string;
};

export class ProjectOwnershipError extends Error {
  readonly name = "ProjectOwnershipError";

  constructor(
    readonly code: "PROJECT_NOT_FOUND" | "PROJECT_LOAD_FAILED" | "PROJECT_BUSY",
    readonly owner?: ProjectOwner,
  ) {
    super(
      code === "PROJECT_NOT_FOUND"
        ? i18next.t("projectOwnership.notFound")
        : code === "PROJECT_BUSY"
          ? i18next.t("projectOwnership.busy")
          : i18next.t("projectOwnership.loadFailed"),
    );
  }
}

export class ProjectOwnershipLease {
  private disposePromise?: Promise<void>;
  private disposed = false;

  constructor(
    readonly ownershipId: string,
    readonly canonicalPath: string,
  ) {}

  dispose(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.disposePromise ??= invoke<void>("release_desktop_project_ownership", {
      ownershipId: this.ownershipId,
    })
      .then(() => {
        this.disposed = true;
      })
      .catch((error) => {
        this.disposePromise = undefined;
        throw toProjectOwnershipError(error);
      });
    return this.disposePromise;
  }
}

export async function releaseProjectOwnershipWithRetry(ownership: ProjectOwnershipLease): Promise<void> {
  for (;;) {
    try {
      await ownership.dispose();
      return;
    } catch (error) {
      await Dialog.buttons(
        i18next.t("projectOwnership.releaseFailedTitle"),
        i18next.t("projectOwnership.releaseFailedMessage", { error: String(error) }),
        [{ id: "retry", label: i18next.t("projectOwnership.retry") }],
      );
    }
  }
}

export type ProjectOwnershipLoadResult<T> =
  | { status: "opened"; value: T }
  | { status: "already_open"; ownershipId: string; canonicalPath: string };

export async function loadWithProjectOwnership<T>(
  projectPath: string,
  load: (ownership: ProjectOwnershipLease | undefined) => Promise<T>,
): Promise<ProjectOwnershipLoadResult<T>> {
  if (!isTauri()) {
    return { status: "opened", value: await load(undefined) };
  }

  let acquisition: DesktopOwnershipAcquisition;
  try {
    await ensureOpenProjectRuntimeBridgeListener();
    acquisition = await invoke<DesktopOwnershipAcquisition>("acquire_desktop_project_ownership", {
      projectPath,
    });
  } catch (error) {
    throw toProjectOwnershipError(error);
  }
  if (acquisition.status === "already_owned") {
    return {
      status: "already_open",
      ownershipId: acquisition.ownershipId,
      canonicalPath: acquisition.canonicalPath,
    };
  }

  const ownership = new ProjectOwnershipLease(acquisition.ownershipId, acquisition.canonicalPath);
  try {
    return { status: "opened", value: await load(ownership) };
  } catch (error) {
    await releaseProjectOwnershipWithRetry(ownership);
    throw error;
  }
}

function toProjectOwnershipError(error: unknown): ProjectOwnershipError {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    if (code === "PROJECT_NOT_FOUND" || code === "PROJECT_LOAD_FAILED" || code === "PROJECT_BUSY") {
      const owner = "owner" in error ? (error.owner as ProjectOwner | undefined) : undefined;
      return new ProjectOwnershipError(code, owner);
    }
  }
  return new ProjectOwnershipError("PROJECT_LOAD_FAILED");
}
