// @vitest-environment jsdom

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

let bridgeListener: ((event: { payload: unknown }) => Promise<void>) | undefined;
const openverseImageSearch = vi.hoisted(() => ({ findDownloadableOpenverseImage: vi.fn() }));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (_event: string, listener: (event: { payload: unknown }) => Promise<void>) => {
    bridgeListener = listener;
    return vi.fn();
  }),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => true), isTauri: vi.fn(() => false) }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("@/core/Tab", () => ({
  Tab: class Tab {
    private readonly services = new Map<string, unknown>();
    protected readonly fileSystemProviders = new Map<string, unknown>();

    loadService(service: { id?: string; new (project: unknown): unknown }) {
      if (!service.id) throw new Error("Test service requires an id");
      const instance = new service(this);
      this.services.set(service.id, instance);
      Object.assign(this, { [service.id]: instance });
    }

    emit() {}

    registerFileSystemProvider(scheme: string, provider: { new (project: unknown): unknown }) {
      this.fileSystemProviders.set(scheme, new provider(this));
    }

    get fs() {
      return this.fileSystemProviders.get((this as unknown as { uri: URI }).uri.scheme);
    }

    async dispose() {
      this.services.clear();
      this.fileSystemProviders.clear();
    }
  },
  isResourceTab: () => false,
}));
vi.mock("@/core/service/Settings", () => ({
  Settings: {
    aiApiBaseUrl: "",
    aiApiKey: "",
    aiModel: "",
    isEnableEntityCollision: false,
    isEnableSectionCollision: false,
    maxPastedImageSize: 0,
  },
}));
vi.mock("@/core/stage/ProjectUpgrader", () => ({ ProjectUpgrader: class ProjectUpgrader {} }));
vi.mock("@/core/stage/stageObject/association/Edge", () => ({ Edge: class Edge {} }));
vi.mock("@/core/stage/stageObject/entity/ImageNode", () => ({ ImageNode: class ImageNode {} }));
vi.mock("@/core/stage/stageObject/entity/LatexNode", () => ({ LatexNode: class LatexNode {} }));
vi.mock("@/core/stage/stageObject/entity/Section", () => ({ Section: class Section {} }));
vi.mock("@/core/stage/stageObject/entity/TextNode", () => ({ TextNode: class TextNode {} }));
vi.mock("@/core/stage/stageObject/tools/entityDetailsManager", () => ({
  DetailsManager: { markdownToDetails: () => [] },
}));
vi.mock("@/core/service/dataManageService/imageUtils", () => ({
  blobToCompressedDataUrl: async () => "",
  prepareImageBlobForImport: async () => ({ blob: new Blob(), width: 1, height: 1 }),
}));
vi.mock("@/core/service/dataManageService/imageNodeFactory", () => ({
  calculateImageDisplaySize: () => ({ width: 1, height: 1, scale: 1 }),
  createImageNodeFromBlob: async () => ({ node: {}, width: 1, height: 1 }),
}));
vi.mock("@/core/service/dataManageService/aiEngine/imageNodeFinder", () => ({
  findFirstImageInChildren: () => undefined,
}));
vi.mock("@/core/service/dataManageService/aiEngine/OpenverseImageSearch", () => ({
  findDownloadableOpenverseImage: openverseImageSearch.findDownloadableOpenverseImage,
}));
vi.mock("@/core/service/dataManageService/aiEngine/AIProjectReferenceStore", () => ({
  AIProjectReferenceStore: { load: vi.fn(async () => null), save: vi.fn(async () => undefined) },
}));

import { invoke, isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { AIEngine } from "@/core/service/dataManageService/aiEngine/AIEngine";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { AIProjectReferenceStore } from "@/core/service/dataManageService/aiEngine/AIProjectReferenceStore";
import { Project, ProjectState } from "@/core/Project";
import { ProjectOwnershipLease } from "@/core/ProjectOwnership";
import { activeTabAtom, store, tabsAtom } from "@/state";
import { Rectangle } from "@graphif/shapes";
import { Vector } from "@graphif/data-structures";
import { URI } from "vscode-uri";
import {
  ensureOpenProjectRuntimeBridgeListener,
  OpenProjectRuntimeHost,
  registerOpenProjectRuntimeHost,
} from "./OpenProjectRuntimeHost";
import { resolveProjectOwnershipArtifactPaths } from "@/cli/ProjectGraphAppDataPath";

const repositoryRoot = process.cwd();
const ownershipHelperPath = join(
  repositoryRoot,
  `app/src-tauri/target/debug/project-graph-ownership-helper${process.platform === "win32" ? ".exe" : ""}`,
);
const ownershipDirectory = mkdtempSync(join(tmpdir(), "project-graph-runtime-host-ownership-"));

afterAll(() => rmSync(ownershipDirectory, { recursive: true, force: true }));

class LiveStageManager {
  static id = "stageManager";

  constructor(private readonly project: Project) {}

  get(uuid: string) {
    return this.project.stage.find((object) => object.uuid === uuid);
  }

  getEntities() {
    return this.project.stage.filter((object) => object instanceof ConnectableEntity) as ConnectableEntity[];
  }

  getAssociations() {
    return [];
  }

  getSelectedEntities() {
    return this.getEntities().filter((object) => object.isSelected);
  }

  getSelectedAssociations() {
    return [];
  }

  getConnectableEntityByUUID(uuid: string) {
    return this.getEntities().find((object) => object.uuid === uuid);
  }

  deleteEntities(entities: ConnectableEntity[]) {
    for (const entity of entities) {
      const index = this.project.stage.indexOf(entity);
      if (index !== -1) this.project.stage.splice(index, 1);
    }
    this.project.historyManager.recordStep();
  }

  generateNodeTreeByText() {
    return undefined;
  }
}

function createLiveProject(canonicalPath = "/projects/graph.prg", restoreReference = true) {
  const node = Object.assign(Object.create(ConnectableEntity.prototype), {
    uuid: "11111111-1111-4111-8111-111111111111",
    parentSection: null,
    collisionBox: new CollisionBox([new Rectangle(new Vector(10, 20), new Vector(100, 75))]),
  }) as ConnectableEntity;
  const project = new Project(URI.file(canonicalPath));
  Object.defineProperty(project, "canonicalProjectPath", { configurable: true, value: canonicalPath });
  project.loadService(LiveStageManager);
  project.loadService(AIEngine);
  Object.assign(project, {
    historyManager: {
      recordStep: vi.fn(() => {
        project.projectState = ProjectState.Unsaved;
      }),
    },
    renderer: {
      getCoverWorldRectangle: () => new Rectangle(new Vector(0, 0), new Vector(500, 500)),
    },
  });
  project.stage = [node];
  const references = project.aiEngine.getProjectReferences(project);
  if (restoreReference) {
    references.restoreSnapshot({
      entries: [{ ref: "n7", uuid: node.uuid }],
      nextNodeRef: 8,
      nextEdgeRef: 1,
    });
  }
  vi.spyOn(project, "save").mockResolvedValue();
  return { project, node };
}

function waitForProjectLock(lockPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 1000;
    const probe = () => {
      const result = spawnSync("/usr/bin/lockf", ["-k", "-s", "-t", "0", lockPath, "/usr/bin/true"]);
      if (result.status === 75) return resolve();
      if (Date.now() >= deadline) return reject(new Error(`Timed out waiting for Project lock: ${lockPath}`));
      setTimeout(probe, 10);
    };
    probe();
  });
}

function runCli(...args: string[]): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["cli", "--", ...args], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        NO_COLOR: "1",
        PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
        PROJECT_GRAPH_OWNERSHIP_DIRECTORY: ownershipDirectory,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

async function startDesktopRuntimeBridge(projectPath: string, host: OpenProjectRuntimeHost) {
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    socket.setEncoding("utf8");
    let request = "";
    socket.on("data", (chunk) => {
      request += chunk;
      const newline = request.indexOf("\n");
      if (newline === -1) return;
      const invocation = JSON.parse(request.slice(0, newline)) as {
        projectPath: string;
        toolName: string;
        input: unknown;
      };
      void host.invoke(invocation.toolName, invocation.input).then((response) => {
        socket.end(`${JSON.stringify(response)}\n`);
      });
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP Runtime Host address");

  const {
    ownershipLock: ownershipLockPath,
    connectableOwnerLock: connectableLockPath,
    connectableOwnerRecord: connectableRecordPath,
  } = resolveProjectOwnershipArtifactPaths(projectPath, ownershipDirectory);
  writeFileSync(
    connectableRecordPath,
    JSON.stringify({ kind: "connectable", endpoint: `tcp://127.0.0.1:${address.port}` }),
  );
  const lockHolder = spawn("/usr/bin/lockf", [
    "-k",
    "-s",
    ownershipLockPath,
    "/usr/bin/lockf",
    "-k",
    "-s",
    connectableLockPath,
    "/bin/sleep",
    "20",
  ]);
  await Promise.all([waitForProjectLock(ownershipLockPath), waitForProjectLock(connectableLockPath)]);

  return {
    ownershipLockPath,
    close() {
      lockHolder.kill("SIGTERM");
      server.close();
    },
  };
}

describe("Open Project Runtime Host", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset().mockResolvedValue(true);
    vi.mocked(isTauri).mockReturnValue(false);
    vi.mocked(save).mockReset();
    vi.mocked(AIProjectReferenceStore.load).mockReset().mockResolvedValue(null);
    vi.mocked(AIProjectReferenceStore.save).mockReset().mockResolvedValue(undefined);
    openverseImageSearch.findDownloadableOpenverseImage.mockReset();
  });

  it("serves the live unsaved graph with stable Project Object References until the Project closes", async () => {
    await ensureOpenProjectRuntimeBridgeListener();
    const fixture = createLiveProject();
    const registration = registerOpenProjectRuntimeHost(fixture.project as never);
    if (!bridgeListener) throw new Error("Runtime bridge listener was not registered");

    await bridgeListener({
      payload: {
        requestId: "request-1",
        projectPath: "/projects/graph.prg",
        toolName: "get_all_nodes",
        input: {},
      },
    });
    await bridgeListener({
      payload: {
        requestId: "request-2",
        projectPath: "/projects/graph.prg",
        toolName: "get_all_nodes",
        input: {},
      },
    });

    expect(vi.mocked(invoke).mock.calls.slice(0, 2)).toEqual([
      [
        "respond_project_runtime_bridge",
        {
          requestId: "request-1",
          response: {
            ok: true,
            value: {
              objects: [
                expect.objectContaining({
                  ref: "n7",
                  type: "ConnectableEntity",
                  position: { x: 10, y: 20 },
                }),
              ],
            },
          },
        },
      ],
      [
        "respond_project_runtime_bridge",
        {
          requestId: "request-2",
          response: { ok: true, value: { objects: [expect.objectContaining({ ref: "n7" })] } },
        },
      ],
    ]);
    expect(fixture.project.save).not.toHaveBeenCalled();

    await registration.dispose();
    await bridgeListener({
      payload: {
        requestId: "request-3",
        projectPath: "/projects/graph.prg",
        toolName: "get_all_nodes",
        input: {},
      },
    });

    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "request-3",
      response: {
        ok: false,
        error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
      },
    });
  });

  it("cancels one live Registry invocation through the bridge without rolling back existing Project state", async () => {
    await ensureOpenProjectRuntimeBridgeListener();
    const fixture = createLiveProject();
    const registration = registerOpenProjectRuntimeHost(fixture.project as never);
    let receivedSignal: AbortSignal | undefined;
    openverseImageSearch.findDownloadableOpenverseImage.mockImplementation(
      async (_query: string, options: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          receivedSignal = options.abortSignal;
          options.abortSignal?.addEventListener(
            "abort",
            () => reject(new DOMException("The operation was aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    if (!bridgeListener) throw new Error("Runtime bridge listener was not registered");

    const invocation = bridgeListener({
      payload: {
        kind: "invoke",
        requestId: "request-cancel",
        projectPath: "/projects/graph.prg",
        toolName: "search_and_add_image_node",
        input: { query: "diagram" },
      },
    });
    await vi.waitFor(() => expect(receivedSignal).toBeInstanceOf(AbortSignal));
    fixture.project.projectState = ProjectState.Unsaved;
    await bridgeListener({ payload: { kind: "cancel", requestId: "request-cancel" } });
    await invocation;

    expect(receivedSignal?.aborted).toBe(true);
    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "request-cancel",
      response: {
        ok: false,
        error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." },
      },
    });
    expect(fixture.project.projectState).toBe(ProjectState.Unsaved);
    expect(fixture.project.save).not.toHaveBeenCalled();
    await registration.dispose();
  });

  it("does not retain an unmatched bridge cancellation", async () => {
    await ensureOpenProjectRuntimeBridgeListener();
    const fixture = createLiveProject();
    const registration = registerOpenProjectRuntimeHost(fixture.project as never);
    if (!bridgeListener) throw new Error("Runtime bridge listener was not registered");

    await bridgeListener({ payload: { kind: "cancel", requestId: "request-cancel-first" } });
    await bridgeListener({
      payload: {
        kind: "invoke",
        requestId: "request-cancel-first",
        projectPath: "/projects/graph.prg",
        toolName: "get_all_nodes",
        input: {},
      },
    });

    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "request-cancel-first",
      response: { ok: true, value: { objects: [expect.objectContaining({ ref: "n7" })] } },
    });
    await registration.dispose();
  });

  it("does not execute a queued destructive invocation cancelled before dequeue", async () => {
    const fixture = createLiveProject();
    const references = fixture.project.aiEngine.getProjectReferences(fixture.project);
    let releasePreparation: ((value: typeof references) => void) | undefined;
    vi.spyOn(fixture.project.aiEngine, "prepareProjectReferences")
      .mockReturnValueOnce(
        new Promise((resolve) => {
          releasePreparation = resolve;
        }),
      )
      .mockResolvedValue(references);
    const host = new OpenProjectRuntimeHost(fixture.project);

    const firstInvocation = host.invoke("get_all_nodes", {});
    const controller = new AbortController();
    const cancelledInvocation = host.invoke("delete_node", { ref: "n7" }, controller.signal);
    controller.abort();
    releasePreparation?.(references);

    await expect(firstInvocation).resolves.toMatchObject({ ok: true });
    await expect(cancelledInvocation).resolves.toEqual({
      ok: false,
      error: { code: "CANCELLED", message: "Project Graph CLI invocation was cancelled." },
    });
    expect(fixture.project.stage).toContain(fixture.node);
    await host.dispose();
  });

  it("preserves structured Project Object Reference errors", async () => {
    const fixture = createLiveProject();
    const host = new OpenProjectRuntimeHost(fixture.project);

    await expect(host.invoke("delete_node", { ref: "n7" })).resolves.toMatchObject({ ok: true });
    await expect(host.invoke("edit_text_node", { ref: "n7", data: { text: "updated" } })).resolves.toEqual({
      ok: false,
      error: {
        code: "stale_ref",
        message: "Project Object Reference points to a deleted object.",
        details: { ref: "n7" },
      },
    });
    await host.dispose();
  });

  it("normalizes an undefined handler result before crossing the Tauri bridge", async () => {
    const fixture = createLiveProject();
    const host = new OpenProjectRuntimeHost(fixture.project);

    await expect(host.invoke("generate_node_tree_by_text", { text: "Root" })).resolves.toEqual({
      ok: true,
      value: null,
    });
    await host.dispose();
  });

  it("classifies live subscription release failure as Runtime Host cleanup failure", async () => {
    const fixture = createLiveProject();
    const references = fixture.project.aiEngine.getProjectReferences(fixture.project);
    vi.spyOn(references, "subscribe").mockReturnValue(() => {
      throw new Error("unsubscribe failed");
    });
    const host = new OpenProjectRuntimeHost(fixture.project);

    await expect(host.invoke("get_all_nodes", {})).resolves.toEqual({
      ok: false,
      error: {
        code: "RUNTIME_CLEANUP_FAILED",
        message: "Project Runtime Host cleanup failed.",
      },
    });
    await host.dispose();
  });

  it("preserves the execution diagnostic when live subscription release also fails", async () => {
    const fixture = createLiveProject("/projects/cleanup-and-execution.prg", false);
    fixture.project.stage.push({
      uuid: "33333333-3333-4333-8333-333333333333",
      collisionBox: {
        getRectangle() {
          throw new Error("broken live object");
        },
      },
    } as never);
    const references = fixture.project.aiEngine.getProjectReferences(fixture.project);
    vi.spyOn(references, "subscribe").mockReturnValue(() => {
      throw new Error("unsubscribe failed");
    });
    const host = new OpenProjectRuntimeHost(fixture.project);

    await expect(host.invoke("get_all_nodes", {})).resolves.toEqual({
      ok: false,
      error: {
        code: "RUNTIME_CLEANUP_FAILED",
        message: "Project Runtime Host cleanup failed.",
        details: {
          executionError: {
            code: "TOOL_EXECUTION_FAILED",
            message: "Built-in tool execution failed.",
          },
        },
      },
    });
    await host.dispose();
  });

  it("releases stage-owned resources when the Project closes", async () => {
    const project = new Project(URI.parse("draft:cleanup"));
    const disposeFirst = vi.fn(async () => undefined);
    const disposeSecond = vi.fn(async () => undefined);
    project.stage = [{ dispose: disposeFirst }, { dispose: disposeSecond }] as never;

    await project.dispose();

    expect(disposeFirst).toHaveBeenCalledOnce();
    expect(disposeSecond).toHaveBeenCalledOnce();
    expect(project.stage).toEqual([]);
  });

  it("attempts every stage cleanup before reporting synchronous and asynchronous failures", async () => {
    const project = new Project(URI.parse("draft:cleanup-failures"));
    const synchronousFailure = new Error("synchronous stage cleanup failed");
    const asynchronousFailure = new Error("asynchronous stage cleanup failed");
    const successfulCleanup = vi.fn();
    project.stage = [
      {
        dispose() {
          throw synchronousFailure;
        },
      },
      {
        async dispose() {
          throw asynchronousFailure;
        },
      },
      { dispose: successfulCleanup },
    ] as never;

    await expect(project.dispose()).rejects.toMatchObject({
      name: "AggregateError",
      errors: [synchronousFailure, asynchronousFailure],
    });

    expect(successfulCleanup).toHaveBeenCalledOnce();
    expect(project.stage).toEqual([]);
  });

  it("keeps Project.save on the original two-argument FileSystemProvider.write contract", async () => {
    const write = vi.fn<(uri: URI, content: Uint8Array) => Promise<void>>().mockResolvedValue(undefined);
    class TestFileSystemProvider {
      async read() {
        return new Uint8Array();
      }
      async readDir() {
        return [];
      }
      async write(uri: URI, content: Uint8Array) {
        await write(uri, content);
      }
      async remove() {}
      async exists() {
        return true;
      }
      async mkdir() {}
      async rename() {
        return undefined;
      }
    }
    const project = new Project(URI.parse("test:save-contract"));
    project.registerFileSystemProvider("test", TestFileSystemProvider);
    const content = new Uint8Array([1, 2, 3]);
    const getFileContent = vi.spyOn(project, "getFileContent").mockResolvedValue(content);

    await project.save({ includeThumbnail: false });

    expect(getFileContent).toHaveBeenCalledWith({ includeThumbnail: false });
    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(project.uri, content);
    expect(write.mock.calls[0]).toHaveLength(2);
  });

  it("moves a draft to a CLI-connectable file ownership when it is saved", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(save).mockResolvedValue("/projects/saved-draft.prg");
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "acquire_desktop_project_ownership_for_save") {
        return {
          status: "acquired",
          ownershipId: "saved-draft-owner",
          canonicalPath: "/projects/saved-draft.prg",
        };
      }
      return true;
    });
    const write = vi.fn<(uri: URI, content: Uint8Array) => Promise<void>>().mockResolvedValue(undefined);
    class FileProvider {
      async read() {
        return new Uint8Array();
      }
      async readDir() {
        return [];
      }
      async write(uri: URI, content: Uint8Array) {
        await write(uri, content);
      }
      async remove() {}
      async exists() {
        return true;
      }
      async mkdir() {}
      async rename() {}
    }
    const project = new Project(URI.parse("draft:saved-draft"));
    project.registerFileSystemProvider("file", FileProvider);
    vi.spyOn(project, "getFileContent").mockResolvedValue(new Uint8Array([1, 2, 3]));

    await project.save({ includeThumbnail: false });

    expect(project.uri.toString()).toBe("file:///projects/saved-draft.prg");
    expect(project.canonicalProjectPath).toBe("/projects/saved-draft.prg");
    expect(write).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({
      title: "保存草稿",
      filters: [{ name: "Project Graph", extensions: ["prg"] }],
    });
    expect(invoke).toHaveBeenCalledWith("make_desktop_project_ownership_connectable", {
      ownershipId: "saved-draft-owner",
    });
    if (!bridgeListener) throw new Error("Runtime bridge listener was not registered");
    await bridgeListener({
      payload: {
        requestId: "saved-draft-route",
        projectPath: "/projects/saved-draft.prg",
        toolName: "not_a_tool",
        input: {},
      },
    });
    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "saved-draft-route",
      response: expect.not.objectContaining({
        error: expect.objectContaining({ code: "RUNTIME_HOST_UNAVAILABLE" }),
      }),
    });
    await project.dispose();
  });

  it("rebinds the runtime host and releases the old ownership after Save As", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "acquire_desktop_project_ownership_for_save") {
        return {
          status: "acquired",
          ownershipId: "new-owner",
          canonicalPath: "/projects/new.prg",
        };
      }
      return true;
    });
    class FileProvider {
      async read() {
        return new Uint8Array();
      }
      async readDir() {
        return [];
      }
      async write() {}
      async remove() {}
      async exists() {
        return true;
      }
      async mkdir() {}
      async rename() {}
    }
    const project = new Project(URI.file("/projects/old.prg"));
    project.registerFileSystemProvider("file", FileProvider);
    project.attachProjectOwnership(new ProjectOwnershipLease("old-owner", "/projects/old.prg"));
    project.activateOpenRuntimeHost();
    vi.spyOn(project, "getFileContent").mockResolvedValue(new Uint8Array([1, 2, 3]));

    await project.saveAs(URI.file("/projects/new.prg"));

    const promoteOrder =
      vi.mocked(invoke).mock.invocationCallOrder[
        vi.mocked(invoke).mock.calls.findIndex(([command]) => command === "make_desktop_project_ownership_connectable")
      ];
    const releaseOldOrder =
      vi.mocked(invoke).mock.invocationCallOrder[
        vi
          .mocked(invoke)
          .mock.calls.findIndex(
            ([command, payload]) =>
              command === "release_desktop_project_ownership" &&
              (payload as { ownershipId?: string }).ownershipId === "old-owner",
          )
      ];
    expect(releaseOldOrder).toBeGreaterThan(promoteOrder);
    if (!bridgeListener) throw new Error("Runtime bridge listener was not registered");
    await bridgeListener({
      payload: { requestId: "old-route", projectPath: "/projects/old.prg", toolName: "not_a_tool", input: {} },
    });
    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "old-route",
      response: {
        ok: false,
        error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
      },
    });
    await project.dispose();
  });

  it("rolls back the Project identity and runtime route when ownership promotion fails", async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(invoke).mockImplementation(async (command, payload) => {
      if (command === "acquire_desktop_project_ownership_for_save") {
        return {
          status: "acquired",
          ownershipId: "failed-owner",
          canonicalPath: "/projects/failed.prg",
        };
      }
      if (command === "make_desktop_project_ownership_connectable") {
        throw { code: "PROJECT_LOAD_FAILED" };
      }
      if (command === "release_desktop_project_ownership") return true;
      return { command, payload };
    });
    class FileProvider {
      async read() {
        return new Uint8Array();
      }
      async readDir() {
        return [];
      }
      async write() {}
      async remove() {}
      async exists() {
        return true;
      }
      async mkdir() {}
      async rename() {}
    }
    const project = new Project(URI.file("/projects/rollback-old.prg"));
    project.registerFileSystemProvider("file", FileProvider);
    project.attachProjectOwnership(new ProjectOwnershipLease("rollback-old-owner", "/projects/rollback-old.prg"));
    project.activateOpenRuntimeHost();
    vi.spyOn(project, "getFileContent").mockResolvedValue(new Uint8Array([1, 2, 3]));

    await expect(project.saveAs(URI.file("/projects/failed.prg"))).rejects.toMatchObject({
      code: "PROJECT_LOAD_FAILED",
    });

    expect(project.uri.toString()).toBe("file:///projects/rollback-old.prg");
    expect(project.canonicalProjectPath).toBe("/projects/rollback-old.prg");
    expect(invoke).toHaveBeenCalledWith("release_desktop_project_ownership", { ownershipId: "failed-owner" });
    expect(invoke).not.toHaveBeenCalledWith("release_desktop_project_ownership", {
      ownershipId: "rollback-old-owner",
    });
    if (!bridgeListener) throw new Error("Runtime bridge listener was not registered");
    await bridgeListener({
      payload: {
        requestId: "rollback-old-route",
        projectPath: "/projects/rollback-old.prg",
        toolName: "not_a_tool",
        input: {},
      },
    });
    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "rollback-old-route",
      response: expect.not.objectContaining({
        error: expect.objectContaining({ code: "RUNTIME_HOST_UNAVAILABLE" }),
      }),
    });
    await bridgeListener({
      payload: {
        requestId: "rollback-failed-route",
        projectPath: "/projects/failed.prg",
        toolName: "not_a_tool",
        input: {},
      },
    });
    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "rollback-failed-route",
      response: {
        ok: false,
        error: { code: "RUNTIME_HOST_UNAVAILABLE", message: "Open Project Runtime Host is unavailable." },
      },
    });
    await project.dispose();
  });

  it("returns a structured reference persistence error without saving the Project", async () => {
    await ensureOpenProjectRuntimeBridgeListener();
    const fixture = createLiveProject();
    const unsavedNode = Object.assign(Object.create(ConnectableEntity.prototype), {
      uuid: "22222222-2222-4222-8222-222222222222",
      parentSection: null,
      collisionBox: new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(100, 75))]),
    }) as ConnectableEntity;
    fixture.project.stage.push(unsavedNode);
    vi.mocked(AIProjectReferenceStore.save).mockRejectedValueOnce(new Error("store unavailable"));
    const registration = registerOpenProjectRuntimeHost(fixture.project as never);
    if (!bridgeListener) throw new Error("Runtime bridge listener was not registered");

    await bridgeListener({
      payload: {
        requestId: "request-save-failure",
        projectPath: "/projects/graph.prg",
        toolName: "get_all_nodes",
        input: {},
      },
    });

    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "request-save-failure",
      response: {
        ok: false,
        error: {
          code: "PROJECT_REFERENCE_SAVE_FAILED",
          message: "Project Object References could not be saved.",
        },
      },
    });
    await bridgeListener({
      payload: {
        requestId: "request-save-retry",
        projectPath: "/projects/graph.prg",
        toolName: "get_all_nodes",
        input: {},
      },
    });
    expect(AIProjectReferenceStore.save).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenLastCalledWith("respond_project_runtime_bridge", {
      requestId: "request-save-retry",
      response: { ok: true, value: { objects: expect.any(Array) } },
    });
    expect(fixture.project.save).not.toHaveBeenCalled();
    await registration.dispose();
  });

  it("persists live references allocated before a handler failure without rolling back the Project", async () => {
    const fixture = createLiveProject("/projects/partial.prg", false);
    fixture.project.stage.push({
      uuid: "33333333-3333-4333-8333-333333333333",
      collisionBox: {
        getRectangle() {
          throw new Error("broken live object");
        },
      },
    } as never);
    const host = new OpenProjectRuntimeHost(fixture.project);

    const response = await host.invoke("get_all_nodes", {});

    expect(response).toEqual({
      ok: false,
      error: { code: "TOOL_EXECUTION_FAILED", message: "Built-in tool execution failed." },
    });
    expect(AIProjectReferenceStore.save).toHaveBeenCalledWith(fixture.project, {
      entries: [{ ref: "n1", uuid: fixture.node.uuid }],
      nextNodeRef: 2,
      nextEdgeRef: 1,
    });
    expect(fixture.project.save).not.toHaveBeenCalled();
    await host.dispose();
  });

  it("serves live mutation, selection, and viewport tools without saving or changing desktop context", async () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-desktop-host-"));
    const projectPath = join(directory, "graph.prg");
    const symlinkPath = join(directory, "graph-link.prg");
    writeFileSync(projectPath, "persisted fallback sentinel");
    symlinkSync(projectPath, symlinkPath);
    const canonicalPath = realpathSync.native(projectPath);
    const persistedBefore = readFileSync(projectPath);
    const fixture = createLiveProject(canonicalPath, false);
    fixture.project.projectState = ProjectState.Saved;
    const foregroundProject = new Project(URI.parse("draft:foreground"));
    Object.assign(foregroundProject, { camera: { location: new Vector(900, 700) } });
    store.set(tabsAtom, [foregroundProject, fixture.project]);
    store.set(activeTabAtom, foregroundProject);
    const focusedElement = document.createElement("input");
    document.body.append(focusedElement);
    focusedElement.focus();
    const tabsBefore = store.get(tabsAtom);
    const foregroundCameraBefore = foregroundProject.camera.location.clone();
    const runtimeHost = new OpenProjectRuntimeHost(fixture.project);
    const bridge = await startDesktopRuntimeBridge(canonicalPath, runtimeHost);

    try {
      const result = await runCli("tool", "invoke", "get_all_nodes", "--project", symlinkPath, "--input", "{}");
      expect(result).toMatchObject({ status: 0, stderr: "" });
      const value = JSON.parse(result.stdout) as { objects: Array<Record<string, unknown>> };

      const selection = await runCli(
        "tool",
        "invoke",
        "select_objects",
        "--project",
        symlinkPath,
        "--input",
        '{"refs":["n1"],"clearOthers":true}',
      );
      const selectedRefs = await runCli(
        "tool",
        "invoke",
        "get_selected_refs",
        "--project",
        symlinkPath,
        "--input",
        "{}",
      );
      const viewport = await runCli(
        "tool",
        "invoke",
        "get_nodes_in_viewport",
        "--project",
        symlinkPath,
        "--input",
        "{}",
      );

      fixture.node.isSelected = false;
      fixture.project.projectState = ProjectState.Saved;
      const partialFailure = await runCli(
        "tool",
        "invoke",
        "select_objects",
        "--project",
        symlinkPath,
        "--input",
        '{"refs":["n1","n99"]}',
      );
      const mutation = await runCli(
        "tool",
        "invoke",
        "delete_node",
        "--project",
        symlinkPath,
        "--input",
        '{"ref":"n1"}',
      );

      expect(value.objects).toEqual([
        expect.objectContaining({ ref: "n1", type: "ConnectableEntity", position: { x: 10, y: 20 } }),
      ]);
      expect(selection).toMatchObject({ status: 0, stdout: '{"selectedCount":1}\n', stderr: "" });
      expect(selectedRefs).toMatchObject({ status: 0, stdout: '{"refs":["n1"]}\n', stderr: "" });
      expect(JSON.parse(viewport.stdout)).toEqual({
        nodes: [expect.objectContaining({ ref: "n1", position: { x: 10, y: 20 } })],
      });
      expect(partialFailure).toMatchObject({
        status: 1,
        stdout: "",
        stderr: '{"code":"unknown_ref","message":"Project Object Reference does not exist.","details":{"ref":"n99"}}\n',
      });
      expect(mutation).toMatchObject({
        status: 0,
        stdout: '{"deletedNodeCount":1,"deletedAssociationCount":0}\n',
        stderr: "",
      });
      expect(fixture.node.isSelected).toBe(true);
      expect(fixture.project.stage).toEqual([]);
      expect(fixture.project.projectState).toBe(ProjectState.Unsaved);
      expect(readFileSync(projectPath)).toEqual(persistedBefore);
      expect(fixture.project.save).not.toHaveBeenCalled();
      expect(store.get(tabsAtom)).toEqual(tabsBefore);
      expect(store.get(activeTabAtom)).toBe(foregroundProject);
      expect(foregroundProject.camera.location).toEqual(foregroundCameraBefore);
      expect(document.activeElement).toBe(focusedElement);
      expect(
        spawnSync("/usr/bin/lockf", ["-k", "-s", "-t", "0", bridge.ownershipLockPath, "/usr/bin/true"]).status,
      ).toBe(75);
    } finally {
      bridge.close();
      await runtimeHost.dispose();
      store.set(activeTabAtom, undefined);
      store.set(tabsAtom, []);
      focusedElement.remove();
      rmSync(directory, { recursive: true, force: true });
    }
  }, 15_000);
});
