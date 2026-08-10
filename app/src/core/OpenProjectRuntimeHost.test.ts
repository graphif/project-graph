// @vitest-environment jsdom

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let bridgeListener: ((event: { payload: unknown }) => Promise<void>) | undefined;

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (_event: string, listener: (event: { payload: unknown }) => Promise<void>) => {
    bridgeListener = listener;
    return vi.fn();
  }),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => true), isTauri: vi.fn(() => false) }));
vi.mock("@/core/Tab", () => ({
  Tab: class Tab {
    private readonly services = new Map<string, unknown>();

    loadService(service: { id?: string; new (project: unknown): unknown }) {
      if (!service.id) throw new Error("Test service requires an id");
      const instance = new service(this);
      this.services.set(service.id, instance);
      Object.assign(this, { [service.id]: instance });
    }

    async dispose() {
      this.services.clear();
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
  findDownloadableOpenverseImage: async () => undefined,
}));
vi.mock("@/core/service/dataManageService/aiEngine/AIProjectReferenceStore", () => ({
  AIProjectReferenceStore: { load: vi.fn(async () => null), save: vi.fn(async () => undefined) },
}));

import { invoke } from "@tauri-apps/api/core";
import { AIEngine } from "@/core/service/dataManageService/aiEngine/AIEngine";
import { ConnectableEntity } from "@/core/stage/stageObject/abstract/ConnectableEntity";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { AIProjectReferenceStore } from "@/core/service/dataManageService/aiEngine/AIProjectReferenceStore";
import { Project } from "@/core/Project";
import { activeTabAtom, store, tabsAtom } from "@/state";
import { Rectangle } from "@graphif/shapes";
import { Vector } from "@graphif/data-structures";
import { URI } from "vscode-uri";
import {
  ensureOpenProjectRuntimeBridgeListener,
  OpenProjectRuntimeHost,
  registerOpenProjectRuntimeHost,
} from "./OpenProjectRuntimeHost";

const repositoryRoot = process.cwd();

class LiveStageManager {
  static id = "stageManager";

  constructor(private readonly project: Project) {}

  get(uuid: string) {
    return this.project.stage.find((object) => object.uuid === uuid);
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
      env: { ...process.env, NO_COLOR: "1" },
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
  const server = createServer((socket) => {
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

  const ownershipLockPath = `${projectPath}.project-graph.lock`;
  const connectableLockPath = `${projectPath}.project-graph.connectable`;
  writeFileSync(
    connectableLockPath,
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
    vi.mocked(invoke).mockClear();
    vi.mocked(AIProjectReferenceStore.load).mockReset().mockResolvedValue(null);
    vi.mocked(AIProjectReferenceStore.save).mockReset().mockResolvedValue(undefined);
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

  it("serves an unsaved real Project to a CLI process without changing desktop state or ownership", async () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-desktop-host-"));
    const projectPath = join(directory, "graph.prg");
    const symlinkPath = join(directory, "graph-link.prg");
    writeFileSync(projectPath, "persisted fallback sentinel");
    symlinkSync(projectPath, symlinkPath);
    const canonicalPath = realpathSync.native(projectPath);
    const persistedBefore = readFileSync(projectPath);
    const fixture = createLiveProject(canonicalPath, false);
    const foregroundProject = new Project(URI.parse("draft:foreground"));
    store.set(tabsAtom, [foregroundProject, fixture.project]);
    store.set(activeTabAtom, foregroundProject);
    const focusedElement = document.createElement("input");
    document.body.append(focusedElement);
    focusedElement.focus();
    const tabsBefore = store.get(tabsAtom);
    const runtimeHost = new OpenProjectRuntimeHost(fixture.project);
    const bridge = await startDesktopRuntimeBridge(canonicalPath, runtimeHost);

    try {
      const result = await runCli("tool", "invoke", "get_all_nodes", "--project", symlinkPath, "--input", "{}");
      const value = JSON.parse(result.stdout) as { objects: Array<Record<string, unknown>> };

      expect(result).toMatchObject({ status: 0, stderr: "" });
      expect(value.objects).toEqual([
        expect.objectContaining({ ref: "n1", type: "ConnectableEntity", position: { x: 10, y: 20 } }),
      ]);
      expect(readFileSync(projectPath)).toEqual(persistedBefore);
      expect(fixture.project.save).not.toHaveBeenCalled();
      expect(store.get(tabsAtom)).toEqual(tabsBefore);
      expect(store.get(activeTabAtom)).toBe(foregroundProject);
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
