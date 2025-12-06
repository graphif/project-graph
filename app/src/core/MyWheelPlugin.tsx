import { Plugin, Viewport } from "pixi-viewport";
import { Point } from "pixi.js";
import { Settings } from "./service/Settings";

/** Options for {@link MyWheelPlugin}. */
export interface IWheelOptions {
  /**
   * Percent to scroll with each spin.
   * @default 0.1
   */
  percent?: number;

  /**
   * (No longer used) The new easing logic is now default.
   * @deprecated
   */
  smooth?: false | number;

  /**
   * Stop smoothing with any user input on the viewport.
   * @default true
   */
  interrupt?: boolean;

  /**
   * Reverse the direction of the scroll.
   * @default false
   */
  reverse?: boolean;

  /**
   * Place this point at center during zoom instead of current mouse position.
   * @default null
   */
  center?: Point | null;

  /**
   * Scaling factor for non-DOM_DELTA_PIXEL scrolling events.
   * @default 20
   */
  lineHeight?: number;

  /**
   * Axis to zoom.
   * @default 'all'
   */
  axis?: "all" | "x" | "y";

  /**
   * Array of key codes that must be pressed for zoom to occur.
   * @default null
   */
  keyToPress?: string[] | null;

  /**
   * Pinch the trackpad to zoom.
   * @default false
   */
  trackpadPinch?: boolean;

  /**
   * Zooms on wheel spin.
   * @default true
   */
  wheelZoom?: boolean;
}

const DEFAULT_WHEEL_OPTIONS: Required<IWheelOptions> = {
  percent: 0.1,
  smooth: false, // This option is no longer used but kept for compatibility.
  interrupt: true,
  reverse: false,
  center: null,
  lineHeight: 20,
  axis: "all",
  keyToPress: null,
  trackpadPinch: false,
  wheelZoom: true,
};

/**
 * Plugin for handling wheel scrolling for viewport zoom with smooth easing.
 *
 * This plugin replaces the default wheel behavior with a smooth, interpolated
 * zoom, similar to the logic found in popular mapping applications or design tools.
 *
 * @event wheel-start({event, viewport}) - fires when a wheel event is captured
 */
export class MyWheelPlugin extends Plugin {
  public readonly options: Required<IWheelOptions>;

  /** The target scale the viewport is animating towards. */
  private targetScale: Point;

  /** The screen position of the last mouse wheel event, used as the zoom center. */
  private mousePositionForZoom: Point | null = null;

  /** Flags whether the keys required to zoom are pressed currently. */
  protected keyIsPressed: boolean;

  constructor(parent: Viewport, options: IWheelOptions = {}) {
    super(parent);
    this.options = Object.assign({}, DEFAULT_WHEEL_OPTIONS, options);
    this.keyIsPressed = false;

    // Initialize targetScale with the viewport's current scale.
    this.targetScale = this.parent.scale.clone();

    if (this.options.keyToPress) {
      this.handleKeyPresses(this.options.keyToPress);
    }
  }

  protected handleKeyPresses(codes: string[]): void {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => {
      if (codes.includes(e.code)) {
        this.keyIsPressed = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (codes.includes(e.code)) {
        this.keyIsPressed = false;
      }
    });
  }

  protected checkKeyPress(): boolean {
    return !this.options.keyToPress || this.keyIsPressed;
  }

  public down(): boolean {
    if (this.options.interrupt) {
      // Stop the animation by setting the target to the current scale
      this.targetScale.copyFrom(this.parent.scale);
    }
    return false;
  }

  protected isAxisX(): boolean {
    return ["all", "x"].includes(this.options.axis);
  }

  protected isAxisY(): boolean {
    return ["all", "y"].includes(this.options.axis);
  }

  /**
   * This method is called on every frame by the viewport's ticker.
   * It handles the gradual scaling towards the `targetScale`.
   */
  public update(): void {
    const isAlreadyAtTargetX = Math.abs(this.parent.scale.x - this.targetScale.x) < 1e-5;
    const isAlreadyAtTargetY = Math.abs(this.parent.scale.y - this.targetScale.y) < 1e-5;

    if (isAlreadyAtTargetX && isAlreadyAtTargetY) {
      // Snap to the final target value if we are close enough and return.
      if (this.parent.scale.x !== this.targetScale.x || this.parent.scale.y !== this.targetScale.y) {
        this.parent.scale.copyFrom(this.targetScale);
        this.parent.emit("zoomed", { viewport: this.parent, type: "wheel" });
      }
      return;
    }

    // Determine the center point for the zoom. Fallback to screen center if no mouse event has occurred.
    const centerPoint =
      this.mousePositionForZoom || new Point(this.parent.screenWidth / 2, this.parent.screenHeight / 2);

    // *** CORRECTED LOGIC ***
    // 1. Get the world coordinate under the mouse BEFORE the scale changes.
    const worldPoint = this.parent.toLocal(centerPoint);

    // 2. Calculate the new scale for this frame using exponential easing.
    const newScaleX = this.parent.scale.x + (this.targetScale.x - this.parent.scale.x) * Settings.scaleExponent;
    const newScaleY = this.parent.scale.y + (this.targetScale.y - this.parent.scale.y) * Settings.scaleExponent;

    // 3. Apply the new scale.
    if (this.isAxisX()) {
      this.parent.scale.x = newScaleX;
    }
    if (this.isAxisY()) {
      this.parent.scale.y = newScaleY;
    }
    this.parent.emit("zoomed", { viewport: this.parent, type: "wheel" });

    // Handle clamping with the clamp-zoom plugin, if it exists.
    const clamp = this.parent.plugins.get("clamp-zoom", true);
    if (clamp) {
      clamp.clamp();
      // If clamping changed the scale, update the target to prevent "fighting" the clamp.
      if (this.parent.scale.x !== newScaleX) this.targetScale.x = this.parent.scale.x;
      if (this.parent.scale.y !== newScaleY) this.targetScale.y = this.parent.scale.y;
    }

    // 4. Recalculate the viewport's top-left position to keep the worldPoint under the centerPoint.
    if (this.options.center) {
      // If a fixed center is provided, use that instead of the mouse.
      this.parent.moveCenter(this.options.center);
    } else {
      // This is the crucial formula: new_viewport_pos = screen_pos - world_pos * new_scale
      this.parent.x = centerPoint.x - worldPoint.x * this.parent.scale.x;
      this.parent.y = centerPoint.y - worldPoint.y * this.parent.scale.y;
    }

    this.parent.emit("moved", { viewport: this.parent, type: "wheel" });
  }

  private pinch(e: WheelEvent): void {
    if (this.paused) return;

    this.mousePositionForZoom = this.parent.input.getPointerPosition(e);
    const step = (-e.deltaY * (e.deltaMode ? this.options.lineHeight : 1)) / 200;
    const change = Math.pow(2, (1 + this.options.percent) * step);

    if (Math.abs(change - 1) < 0.001) {
      return;
    }

    if (this.isAxisX()) {
      this.targetScale.x *= change;
    }
    if (this.isAxisY()) {
      this.targetScale.y *= change;
    }

    this.parent.emit("wheel-start", { event: e, viewport: this.parent });
  }

  public wheel(e: WheelEvent): boolean {
    if (this.paused || !this.checkKeyPress()) {
      return false;
    }

    if (e.ctrlKey && this.options.trackpadPinch) {
      this.pinch(e);
    } else if (this.options.wheelZoom) {
      this.mousePositionForZoom = this.parent.input.getPointerPosition(e);

      const sign = this.options.reverse ? -1 : 1;
      const step = (sign * -e.deltaY * (e.deltaMode ? this.options.lineHeight : 1)) / 500;
      const change = Math.pow(2, (1 + this.options.percent) * step);

      if (Math.abs(change - 1) < 0.001) {
        return !this.parent.options.passiveWheel;
      }

      // Instead of changing scale directly, update the target scale.
      // The update() loop will handle the animation and positioning.
      if (this.isAxisX()) {
        this.targetScale.x *= change;
      }
      if (this.isAxisY()) {
        this.targetScale.y *= change;
      }

      this.parent.emit("wheel-start", { event: e, viewport: this.parent });
    }

    return !this.parent.options.passiveWheel;
  }
}
