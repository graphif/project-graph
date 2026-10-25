import { describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";

vi.mock("@/core/service/Settings", () => ({
  Settings: {
    enableWindowsTouchPad: true,
    moveAmplitude: 2,
    moveFriction: 0.1,
    scaleExponent: 0.2,
    scaleCameraByMouseLocation: true,
  },
}));
vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/service/feedbackService/SoundService", () => ({ SoundService: {} }));
vi.mock("@/core/stage/stageObject/abstract/StageEntity", () => ({ Entity: class {} }));
vi.mock("@/core/service/feedbackService/effectEngine/concrete/MouseTipFeedbackEffect", () => ({
  MouseTipFeedbackEffect: {},
}));
vi.mock("@/utils/externalOpen", () => ({ openBrowserOrFileByEntity: vi.fn() }));
vi.mock("@/utils/platform", () => ({ isMac: false, isIpad: false }));
vi.stubGlobal("WheelEvent", { DOM_DELTA_PIXEL: 0 });

import { ControllerCameraClass } from "./ControllerCamera";
import type { Project } from "@/core/Project";
import { Camera } from "@/core/stage/Camera";

function setup() {
  const project = {
    controller: {
      isCameraLocked: false,
      pressingKeySet: new Set<string>(),
      isMouseDown: [false, false, false],
      setCursorName: vi.fn(),
    },
    canvas: { clientToView: (x: number, y: number) => new Vector(x, y) },
    renderer: {
      w: 100,
      h: 100,
      transformView2World: (p: Vector) =>
        p.subtract(new Vector(50, 50)).divide(camera.currentScale).add(camera.location),
      transformWorld2View: (p: Vector) =>
        p.subtract(camera.location).multiply(camera.currentScale).add(new Vector(50, 50)),
    },
  } as unknown as Project;
  const camera = (project.camera = new Camera(project));
  camera.targetScale = 2;
  Object.assign(camera, { hasResetOnOpen: true });
  return { camera, project, control: new ControllerCameraClass(project) };
}
const wheel = (values: Partial<WheelEvent>) =>
  ({
    deltaMode: 0,
    deltaX: 0,
    deltaY: 0,
    clientX: 50,
    clientY: 50,
    timeStamp: 1000,
    ctrlKey: false,
    ...values,
  }) as WheelEvent;

describe("trackpad camera handoff", () => {
  it.each([1e-6, 1e6])("supports gesture zoom beyond the old limits at %s", (scale) => {
    const { camera, project } = setup();
    camera.applyGesture(new Vector(50, 50), new Vector(60, 60), scale);
    expect(camera.currentScale).toBe(scale);
    expect(project.renderer.transformWorld2View(Vector.getZero()).x).toBeCloseTo(60);
    const location = camera.location.clone();
    for (let i = 0; i < 10; i++) camera.tick();
    expect(camera.currentScale).toBe(scale);
    expect(camera.location).toEqual(location);
  });
  it.each([0.000001, 1000000])("keeps wheel zoom proportional at %s", (scale) => {
    const { camera, control } = setup();
    Object.assign(control, { lastZoomFeedbackTime: 0 });
    camera.currentScale = camera.targetScale = scale;
    const wheelControl = control as unknown as {
      applyWheelZoom: (delta: number, time: number, mode: number) => void;
    };
    wheelControl.applyWheelZoom(-100, 0, 0);
    expect(camera.targetScale / scale).toBeCloseTo(Math.exp(0.14));
    wheelControl.applyWheelZoom(100, 0, 0);
    expect(camera.targetScale).toBeCloseTo(scale);
  });
  it("direct panning clears velocity, queued movement and old zoom targets", () => {
    const { camera, control } = setup();
    camera.speed = new Vector(5, 3);
    camera.accelerateCommander = new Vector(1, 1);
    camera.isStartZoomIn = true;
    camera.bombMove(new Vector(1000, 1000));
    control.mousewheel(wheel({ deltaX: 20, deltaY: 12 }));
    for (let i = 0; i < 240; i++) camera.tick();
    expect(camera.location).toEqual(new Vector(5, 3));
    expect(camera.currentScale).toBe(1);
  });
  it("mouse drag survives a zoom between pointer moves without snapping to the old world anchor", () => {
    const { camera, control, project } = setup();
    project.controller.isMouseDown[1] = true;
    control.mousedown({ button: 1, clientX: 50, clientY: 50 } as MouseEvent);
    control.mousemove({ clientX: 60, clientY: 50 } as MouseEvent);
    expect(camera.location.x).toBe(-10);
    control.mousewheel(wheel({ ctrlKey: true, deltaY: -10, clientX: 60, timeStamp: 1000 }));
    const location = camera.location.x;
    control.mousemove({ clientX: 60, clientY: 50 } as MouseEvent);
    expect(camera.location.x).toBe(location);
    control.mouseup({ button: 1 } as MouseEvent);
    expect(control.isUsingMouseGrabMove).toBe(false);
  });
  it("combines pinch and pan and stays completely still for 240 ticks after release", () => {
    const { camera, control, project } = setup();
    control.mousewheel(wheel({ ctrlKey: true, deltaY: 0 }));
    const anchor = new Vector(0, 0);
    control.mousewheel(wheel({ ctrlKey: true, deltaY: -10, clientX: 70, clientY: 60, timeStamp: 1016 }));
    expect(project.renderer.transformWorld2View(anchor).x).toBeCloseTo(70);
    expect(project.renderer.transformWorld2View(anchor).y).toBeCloseTo(60);
    control.mousewheel(wheel({ ctrlKey: true, deltaY: 0, clientX: 80, clientY: 65, timeStamp: 1032 }));
    const location = camera.location.clone(),
      scale = camera.currentScale;
    for (let i = 0; i < 240; i++) camera.tick();
    expect(camera.location).toEqual(location);
    expect(camera.currentScale).toBe(scale);
    expect(camera.speed.isZero()).toBe(true);
  });
  it("handles touch-screen pinch with the same anchor and leaves no release acceleration", () => {
    const { camera, control, project } = setup();
    const touches = (points: number[][]) =>
      ({
        touches: points.map(([clientX, clientY]) => ({ clientX, clientY })),
        preventDefault: vi.fn(),
      }) as unknown as TouchEvent;
    control.touchstart(
      touches([
        [30, 50],
        [70, 50],
      ]),
    );
    control.touchmove(
      touches([
        [20, 60],
        [100, 60],
      ]),
    );
    expect(camera.currentScale).toBe(2);
    expect(project.renderer.transformWorld2View(new Vector(0, 0))).toEqual(new Vector(60, 60));
    control.touchend(touches([]));
    const location = camera.location.clone();
    for (let i = 0; i < 240; i++) camera.tick();
    expect(camera.location).toEqual(location);
  });
  it("does not inherit touchpad classification for a discrete mouse event", () => {
    const { control } = setup();
    control.mousewheel(wheel({ deltaX: 20, deltaY: 12 }));
    const mousewheelFunction = vi.fn();
    Object.assign(control, { mousewheelFunction });
    control.mousewheel(wheel({ deltaMode: 1, deltaY: 3, timeStamp: 1016 }));
    expect(mousewheelFunction).toHaveBeenCalledOnce();
  });
  it("keeps physical Ctrl + mouse wheel on the configured mouse path", () => {
    const { project, control } = setup();
    project.controller.pressingKeySet.add("control");
    const mousewheelFunction = vi.fn();
    Object.assign(control, { mousewheelFunction });
    control.mousewheel(wheel({ ctrlKey: true, deltaY: 120 }));
    expect(mousewheelFunction).toHaveBeenCalledOnce();
  });
  it("handles large initial pinch deltas directly without a residual zoom target", () => {
    const { camera, control } = setup();
    control.mousewheel(wheel({ ctrlKey: true, deltaY: 90 }));
    expect(camera.currentScale).toBeCloseTo(Math.exp(-0.9));
    expect(camera.targetScale).toBe(camera.currentScale);
  });
  it("pan cancels an outstanding wheel zoom and uses reduced sensitivity", () => {
    const { camera, control } = setup();
    control.mousewheel(wheel({ deltaX: 20, deltaY: 12 }));
    expect(camera.targetScale).toBe(1);
    expect(camera.location).toEqual(new Vector(5, 3));
  });
  it("corrects a mouse classification when diagonal touchpad movement arrives", () => {
    const { camera, control } = setup();
    Object.assign(control, { wheelGesture: "mouse", lastWheelEventTime: 990 });
    control.mousewheel(wheel({ deltaX: 10, deltaY: 100 }));
    expect(camera.location).toEqual(new Vector(2.5, 25));
    expect(camera.targetScale).toBe(camera.currentScale);
  });
});
