import { describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import type { Project } from "@/core/Project";

vi.mock("@/core/Project", () => ({ Project: class {}, service: () => (value: unknown) => value }));
vi.mock("@/core/service/Settings", () => ({
  Settings: {
    moveAmplitude: 2,
    moveFriction: 0.1,
    scaleExponent: 0.2,
    scaleCameraByMouseLocation: true,
    cameraResetViewPaddingRate: 1,
  },
}));
vi.mock("../service/feedbackService/SoundService", () => ({
  SoundService: { play: { viewAdjustSoundFile: vi.fn() } },
}));
vi.mock("@/core/stage/stageObject/abstract/StageEntity", () => ({ Entity: class {} }));
import { Camera } from "./Camera";

describe("camera after direct gestures", () => {
  it("fits the project even when the canvas mounts after the first ten frames", () => {
    const renderer = { w: 0, h: 0, transformWorld2View: () => Vector.getZero() };
    const center = new Vector(4000, -3000);
    const getCenter = vi.fn(() => center.clone());
    const camera = new Camera({
      renderer,
      stageManager: { getCenter, getSize: () => new Vector(2000, 1000) },
    } as unknown as Project);
    for (let i = 0; i < 30; i++) camera.tick();
    expect(getCenter).not.toHaveBeenCalled();
    renderer.w = 1000;
    renderer.h = 500;
    camera.tick();
    expect(camera.location).toEqual(center);
    expect(camera.currentScale).toBe(0.5);
    for (let i = 0; i < 30; i++) camera.tick();
    expect(getCenter).toHaveBeenCalledOnce();
  });
  it("keeps the exact scale and location over idle frames", () => {
    const renderer = { transformWorld2View: vi.fn(() => new Vector(50, 50)) };
    const camera = new Camera({ renderer } as unknown as Project);
    Object.assign(camera, { hasResetOnOpen: true });
    camera.location = new Vector(689.852530163047, -790.7953028402999);
    camera.currentScale = camera.targetScale = 0.07422735362687596;
    const location = camera.location.clone();
    for (let i = 0; i < 240; i++) camera.tick();
    expect(camera.currentScale).toBe(0.07422735362687596);
    expect(camera.targetScale).toBe(camera.currentScale);
    expect(camera.location).toEqual(location);
  });
});
