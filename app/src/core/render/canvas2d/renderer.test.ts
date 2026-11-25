// @vitest-environment jsdom

import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("katex/dist/katex.min.css", () => ({}));
vi.mock("@/core/stage/stage-object/abstract/stage-object", () => ({ StageObject: class {} }));
vi.mock("@/core/stage/stage-object/association/arc-edge", () => ({ ArcEdge: class {} }));
vi.mock("@/core/stage/stage-object/association/cubic-catmull-rom-spline-edge", () => ({
  CubicCatmullRomSplineEdge: class {},
}));
vi.mock("@/core/stage/stage-object/association/line-edge", () => ({ LineEdge: class {} }));
vi.mock("@/core/stage/stage-object/association/muti-target-undirected-edge", () => ({
  MultiTargetUndirectedEdge: class {},
}));
vi.mock("@/utils/font", () => ({ getTextSize: () => new Vector(10, 10) }));
vi.mock("@/utils/platform", () => ({ isMac: false }));
vi.mock("@/core/service/control-service/shortcut-keys-engine/key-binds-ui", () => ({
  KeyBindsUI: { getCurrentKeySequence: () => "" },
}));
vi.mock("@/core/project", () => ({
  service: () => (cls: any) => cls,
  Project: class {},
}));

vi.mock("@/state", () => ({
  activeTabAtom: Symbol("activeTabAtom"),
  store: { get: () => null },
}));

vi.mock("@/core/service/settings", () => ({
  Settings: {
    antialiasing: "high",
    isPauseRenderWhenManipulateOvertime: false,
    windowBackgroundAlpha: 1,
    showBackgroundDots: false,
    showBackgroundHorizontalLines: false,
    showBackgroundVerticalLines: false,
    showBackgroundCartesian: false,
    showDebug: false,
    stealthModeReverseMask: false,
    isRenderCenterPointer: false,
  },
}));

vi.mock("@/core/service/control-service/mouse-location", () => ({
  MouseLocation: {
    vector: () => new Vector(0, 0),
  },
}));

vi.mock("./utils-renderer/global-mask-renderer", () => ({
  GlobalMaskRenderer: {
    renderMask: vi.fn(),
  },
}));

import { DirtyLayer } from "./dirty-layer";
import { Renderer } from "./renderer";
import { Canvas } from "@/core/stage/canvas";

function createMockCtx() {
  return {
    clearRect: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  } as unknown as CanvasRenderingContext2D;
}

function createMockCanvasElement(ctx: CanvasRenderingContext2D) {
  const el = document.createElement("canvas");
  vi.spyOn(el, "getContext").mockReturnValue(ctx);
  return el;
}

function createTestHarness() {
  const bgCtx = createMockCtx();
  const stageCtx = createMockCtx();
  const overlayCtx = createMockCtx();
  const overlayEl = createMockCanvasElement(overlayCtx);

  const origCreateElement = document.createElement.bind(document);
  let canvasIdx = 0;
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
    const el = origCreateElement(tag);
    if (tag === "canvas") {
      const ctx = canvasIdx === 0 ? bgCtx : stageCtx;
      canvasIdx++;
      vi.spyOn(el as HTMLCanvasElement, "getContext").mockReturnValue(ctx);
    }
    return el;
  }) as typeof document.createElement);
  const project: any = {
    isRunning: true,
    stageHash: "hash-1",
    stage: [],
    loop: vi.fn(),
    camera: {
      location: new Vector(0, 0),
      shakeLocation: new Vector(0, 0),
      currentScale: 1,
    },
    tags: [],
    controller: {
      pressingKeySet: new Set(),
      isManipulateOverTime: () => false,
      cutting: { isUsing: false, warningEntity: [], warningAssociations: [], warningSections: [], cuttingLine: null },
      rectangleSelect: { isSelecting: false, getRectangle: () => null },
      layerMoving: { isMoving: false, isEnabled: false },
      nodeConnection: { isUsing: false, isConnecting: false, connectFromEntities: [], connectToEntity: null },
      isMouseDown: [false, false, false],
      mouseLocation: new Vector(0, 0),
    },
    stageStyleManager: {
      currentStyle: {
        Background: {
          toNewAlpha: () => ({ r: 0, g: 0, b: 0, a: 1 }),
          toString: () => "bg-dark",
        },
      },
    },
    shapeRenderer: { renderRect: vi.fn() },
    backgroundRenderer: {
      renderDotBackground: vi.fn(),
      renderHorizonBackground: vi.fn(),
      renderVerticalBackground: vi.fn(),
      renderCartesianBackground: vi.fn(),
    },
    entityRenderer: {
      renderAllSectionsBackground: vi.fn(),
      renderAllEntities: vi.fn(),
      renderAllSectionsBigTitle: vi.fn(),
    },
    drawingControllerRenderer: { renderTempDrawing: vi.fn() },
    searchContentHighlightRenderer: { render: vi.fn() },
    keyBindHintEngine: { update: vi.fn(), render: vi.fn() },
    mouseInteraction: {
      hoverEdges: [],
      hoverSections: [],
      hoverMultiTargetEdges: [],
      hoverConnectPoints: [],
      hoverEntities: [],
    },
    collaboration: {
      currentPresences: [],
      getRemoteCursors: () => [],
      getRemoteCursorChats: () => [],
    },
    effects: { effectsCount: 0 },
    stageManager: {
      getEntities: () => [],
      getAssociations: () => [],
      getSections: () => [],
      getTextNodes: () => [],
      getConnectPoints: () => [],
      getImageNodes: () => [],
      getUrlNodes: () => [],
      getPortalNodes: () => [],
      getPenStrokes: () => [],
      getSvgNodes: () => [],
      getTagEntities: () => [],
    },
    sectionMethods: { isAssociationCoveredByBigTitleSection: () => false },
    rectangleSelect: { getRectangle: () => null },
    cutting: { warningEntity: [], warningEdges: [], warningSections: [], cuttingLine: null },
    nodeConnector: { isConnecting: false },
    keyboardOnlyGraphEngine: { isOpenning: () => false, isCreating: () => false },
    entityMoveManager: { isMoving: false },
  };

  const canvas = new Canvas(project, overlayEl);
  project.canvas = canvas;

  const renderer = new Renderer(project);
  project.renderer = renderer;
  renderer.resizeWindow(800, 600);
  vi.spyOn(renderer, "getCoverWorldRectangle").mockReturnValue(new Rectangle(new Vector(0, 0), new Vector(800, 600)));

  return { project, canvas, renderer, bgCtx, stageCtx, overlayCtx };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Renderer layered dirty-flag optimization", () => {
  it("skips idle frames completely after the initial render", () => {
    const { renderer, bgCtx, stageCtx, overlayCtx } = createTestHarness();

    renderer.tick();
    expect(renderer.frameIndex).toBe(1);
    expect(renderer.skippedFrames).toBe(0);
    expect(bgCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(stageCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(overlayCtx.clearRect).toHaveBeenCalledTimes(1);

    // Subsequent idle frames do zero work
    renderer.tick();
    renderer.tick();
    expect(renderer.frameIndex).toBe(1);
    expect(renderer.skippedFrames).toBe(2);
    expect(bgCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(stageCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(overlayCtx.clearRect).toHaveBeenCalledTimes(1);
  });

  it("redraws only the overlay layer when DirtyLayer.Overlay is marked", () => {
    const { renderer, bgCtx, stageCtx, overlayCtx } = createTestHarness();

    renderer.tick();
    renderer.markDirty(DirtyLayer.Overlay);
    renderer.tick();

    expect(bgCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(stageCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(overlayCtx.clearRect).toHaveBeenCalledTimes(2);
  });

  it("redraws only the stage layer when DirtyLayer.Stage is marked", () => {
    const { renderer, bgCtx, stageCtx, overlayCtx } = createTestHarness();

    renderer.tick();
    renderer.markDirty(DirtyLayer.Stage);
    renderer.tick();

    expect(bgCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(stageCtx.clearRect).toHaveBeenCalledTimes(2);
    expect(overlayCtx.clearRect).toHaveBeenCalledTimes(1);
  });

  it("redraws all layers when the camera moves", () => {
    const { project, renderer, bgCtx, stageCtx, overlayCtx } = createTestHarness();

    renderer.tick();
    project.camera.location = new Vector(100, 50);
    renderer.tick();

    expect(bgCtx.clearRect).toHaveBeenCalledTimes(2);
    expect(stageCtx.clearRect).toHaveBeenCalledTimes(2);
    expect(overlayCtx.clearRect).toHaveBeenCalledTimes(2);
  });

  it("composites all layers onto an override ctx for thumbnail/screenshot export", () => {
    const { canvas, renderer, bgCtx, stageCtx, overlayCtx } = createTestHarness();
    const exportCtx = createMockCtx();

    renderer.tick();
    const originalCtx = canvas.ctx;
    canvas.ctx = exportCtx;
    expect(canvas.isLayeredMode()).toBe(false);

    renderer.tick();
    // Background clears once on exportCtx; stage & overlay do NOT clear exportCtx
    expect(exportCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(bgCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(stageCtx.clearRect).toHaveBeenCalledTimes(1);
    expect(overlayCtx.clearRect).toHaveBeenCalledTimes(1);

    canvas.ctx = originalCtx;
    expect(canvas.isLayeredMode()).toBe(true);
  });
});
