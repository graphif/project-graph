import { Dialog } from "@/components/ui/dialog";
import type { Project } from "@/core/Project";
import {
  ensureOpenProjectRuntimeBridgeListener,
  type OpenProjectRuntimeHostRegistration,
  registerOpenProjectRuntimeHost,
} from "@/core/OpenProjectRuntimeHost";
import { invoke, isTauri } from "@tauri-apps/api/core";
import i18next from "i18next";
import type { URI } from "vscode-uri";

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

  async makeConnectable(): Promise<void> {
    try {
      await invoke<void>("make_desktop_project_ownership_connectable", {
        ownershipId: this.ownershipId,
      });
    } catch (error) {
      throw toProjectOwnershipError(error);
    }
  }

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

export class ProjectOwnershipLifecycle {
  private ownership?: ProjectOwnershipLease;
  private runtimeHost?: OpenProjectRuntimeHostRegistration;

  constructor(private readonly project: Project) {}

  get ownershipId() {
    return this.ownership?.ownershipId;
  }

  get canonicalPath() {
    return this.ownership?.canonicalPath;
  }

  attach(ownership: ProjectOwnershipLease): void {
    if (this.ownership && this.ownership !== ownership) {
      throw new Error("Project ownership is already attached");
    }
    this.ownership = ownership;
  }

  activate(): void {
    if (this.ownership) this.runtimeHost ??= registerOpenProjectRuntimeHost(this.project);
  }

  async saveAs(targetUri: URI, write: () => Promise<void>): Promise<void> {
    const reservation = await reserveProjectOwnershipForSave(targetUri.fsPath);
    if (reservation.status === "already_open") {
      if (reservation.ownershipId !== this.ownershipId) throw new ProjectOwnershipError("PROJECT_BUSY");
      await write();
      this.project.uri = targetUri;
      return;
    }

    const nextOwnership = reservation.ownership;
    try {
      await write();
    } catch (error) {
      if (nextOwnership) await releaseProjectOwnershipWithRetry(nextOwnership);
      throw error;
    }
    if (!nextOwnership) {
      this.project.uri = targetUri;
      return;
    }

    const previousUri = this.project.uri;
    const previousOwnership = this.ownership;
    const previousRuntimeHost = this.runtimeHost;
    let createdRuntimeHost = false;
    this.project.uri = targetUri;
    this.ownership = nextOwnership;
    try {
      if (previousRuntimeHost) {
        previousRuntimeHost.rebind(nextOwnership.canonicalPath);
      } else {
        this.runtimeHost = registerOpenProjectRuntimeHost(this.project);
        createdRuntimeHost = true;
      }
      await nextOwnership.makeConnectable();
    } catch (error) {
      this.project.uri = previousUri;
      this.ownership = previousOwnership;
      const rollbackErrors: unknown[] = [];
      if (createdRuntimeHost) {
        const runtimeHost = this.runtimeHost;
        this.runtimeHost = undefined;
        try {
          await runtimeHost?.dispose();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      } else if (previousRuntimeHost && previousOwnership) {
        try {
          previousRuntimeHost.rebind(previousOwnership.canonicalPath);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      try {
        await releaseProjectOwnershipWithRetry(nextOwnership);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (rollbackErrors.length > 0) {
        throw new AggregateError([error, ...rollbackErrors], "Project ownership transition failed", { cause: error });
      }
      throw error;
    }
    if (previousOwnership) await releaseProjectOwnershipWithRetry(previousOwnership);
  }

  async dispose(disposeProject: () => Promise<void>): Promise<void> {
    const ownership = this.ownership;
    const cleanupErrors: unknown[] = [];
    try {
      try {
        await this.runtimeHost?.dispose();
      } catch (error) {
        cleanupErrors.push(error);
      } finally {
        this.runtimeHost = undefined;
      }
      try {
        await disposeProject();
      } catch (error) {
        if (error instanceof AggregateError) cleanupErrors.push(...error.errors);
        else cleanupErrors.push(error);
      }
    } finally {
      if (ownership) {
        await releaseProjectOwnershipWithRetry(ownership);
        if (this.ownership === ownership) this.ownership = undefined;
      }
    }
    if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, "Project cleanup failed");
  }
}

async function releaseProjectOwnershipWithRetry(ownership: ProjectOwnershipLease): Promise<void> {
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

type ProjectOwnershipSaveReservation =
  | { status: "reserved"; ownership: ProjectOwnershipLease | undefined }
  | { status: "already_open"; ownershipId: string; canonicalPath: string };

async function reserveProjectOwnershipForSave(projectPath: string): Promise<ProjectOwnershipSaveReservation> {
  if (!isTauri()) return { status: "reserved", ownership: undefined };

  let acquisition: DesktopOwnershipAcquisition;
  try {
    await ensureOpenProjectRuntimeBridgeListener();
    acquisition = await invoke<DesktopOwnershipAcquisition>("acquire_desktop_project_ownership_for_save", {
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
  return {
    status: "reserved",
    ownership: new ProjectOwnershipLease(acquisition.ownershipId, acquisition.canonicalPath),
  };
}

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
