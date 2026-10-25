import type { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { Vector } from "@graphif/data-structures";

export class ControllerClass {
  constructor(protected readonly project: Project) {}
  public lastMoveLocation: Vector = Vector.getZero();

  protected get allowViewerModeInteraction(): boolean {
    return false;
  }
  public get shouldHandleInteraction(): boolean {
    return !Settings.viewerMode || this.allowViewerModeInteraction;
  }

  public keydown: (event: KeyboardEvent) => void = () => {};
  public keyup: (event: KeyboardEvent) => void = () => {};
  public mousedown: (event: PointerEvent) => void = () => {};
  public mouseup: (event: PointerEvent) => void = () => {};
  public mousemove: (event: PointerEvent) => void = () => {};
  public mousewheel: (event: WheelEvent) => void = () => {};
  public mouseDoubleClick: (event: PointerEvent) => void = () => {};
  public touchstart: (event: TouchEvent) => void = () => {};
  public touchmove: (event: TouchEvent) => void = () => {};
  public touchend: (event: TouchEvent) => void = () => {};

  public dispose() {
    this.lastMoveLocation = Vector.getZero();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector) {}
}
