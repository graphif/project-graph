import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Vector } from "@graphif/data-structures";
import { ControllerInput } from "./ControllerInput";

beforeEach(() => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "PointerEvent",
    class extends Event {
      constructor(type: string, init: object = {}) {
        super(type, { cancelable: true });
        Object.assign(
          this,
          { pointerType: "mouse", pointerId: 1, button: 0, buttons: 1, clientX: 20, clientY: 40 },
          init,
        );
      }
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const target = new EventTarget();
  const captures = new Set<number>();
  const element = Object.assign(target, {
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => {
      captures.delete(id);
      target.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: id }));
    },
  }) as unknown as HTMLCanvasElement;
  const handlers = {
    down: vi.fn(),
    move: vi.fn(),
    up: vi.fn(),
    doubleClick: vi.fn(),
    mouseChord: vi.fn(),
    wheel: vi.fn(),
    keydown: vi.fn(),
    keyup: vi.fn(),
    touchstart: vi.fn(),
    touchmove: vi.fn(),
    touchend: vi.fn(),
    cancel: vi.fn(),
  };
  const input = new ControllerInput(element, (x, y) => new Vector((x - 10) / 2, (y - 20) / 2), handlers);
  const pointer = (type: string, init: PointerEventInit = {}) => element.dispatchEvent(new PointerEvent(type, init));
  const touch = (type: string, points: number[][], changed = points) =>
    element.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), {
        touches: points.map(([clientX, clientY], identifier) => ({ clientX, clientY, identifier })),
        changedTouches: changed.map(([clientX, clientY], identifier) => ({ clientX, clientY, identifier })),
      }),
    );
  return { input, handlers, element, pointer, touch, captures };
}

describe("unified canvas input", () => {
  it.each([
    [0, 1, 2, 1],
    [0, 1, 2, 2],
    [2, 2, 0, 1],
    [2, 2, 0, 2],
  ])(
    "consumes a left/right chord (first %i, buttons %i, second %i, remaining %i)",
    (first, buttons, second, remaining) => {
      const { input, pointer, handlers, captures, element } = setup();
      pointer("pointerdown", { button: first, buttons });
      pointer("pointermove", { button: second, buttons: 3 });
      expect(handlers.cancel).toHaveBeenCalledOnce();
      expect(handlers.mouseChord).toHaveBeenCalledOnce();
      expect(handlers.down).toHaveBeenCalledTimes(1);
      expect(captures.has(1)).toBe(true);
      pointer("pointermove", { button: -1, buttons: 3, clientX: 60 });
      pointer("pointermove", { button: remaining === 1 ? 2 : 0, buttons: remaining });
      pointer("pointermove", { button: -1, buttons: 3 });
      pointer("pointermove", { button: remaining === 1 ? 2 : 0, buttons: remaining });
      pointer("pointerup", { button: remaining === 1 ? 0 : 2, buttons: 0 });
      expect(handlers.mouseChord).toHaveBeenCalledOnce();
      expect(handlers.move).not.toHaveBeenCalled();
      expect(handlers.up).not.toHaveBeenCalled();
      expect(handlers.doubleClick).not.toHaveBeenCalled();
      expect(captures.size).toBe(0);
      const menu = new Event("contextmenu", { cancelable: true });
      element.dispatchEvent(menu);
      expect(menu.defaultPrevented).toBe(true);
      pointer("pointerdown", { button: 2, buttons: 2 });
      pointer("pointerup", { button: 2, buttons: 0 });
      expect(handlers.up).toHaveBeenCalledOnce();
      const nextMenu = new Event("contextmenu", { cancelable: true });
      element.dispatchEvent(nextMenu);
      expect(nextMenu.defaultPrevented).toBe(false);
      input.dispose();
    },
  );

  it("recognizes another chord after both buttons are released", () => {
    const { input, pointer, handlers } = setup();
    pointer("pointerdown", { buttons: 3 });
    pointer("pointerup", { buttons: 0 });
    pointer("pointerdown", { buttons: 3 });
    expect(handlers.mouseChord).toHaveBeenCalledTimes(2);
    pointer("pointerup", { buttons: 0 });
    input.dispose();
  });

  it("accepts a simultaneous press and recovers from blur", () => {
    const { input, pointer, handlers, captures } = setup();
    pointer("pointerdown", { buttons: 3 });
    expect(handlers.down).not.toHaveBeenCalled();
    expect(handlers.mouseChord).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("blur"));
    expect(captures.size).toBe(0);
    pointer("pointerup", { buttons: 0 });
    pointer("pointerdown", { buttons: 1 });
    pointer("pointerup", { buttons: 0 });
    expect(handlers.up).toHaveBeenCalledOnce();
    input.dispose();
  });

  it("does not interpret pen buttons or a press begun outside the canvas as a mouse chord", () => {
    const { input, pointer, handlers } = setup();
    pointer("pointermove", { buttons: 3 });
    pointer("pointerdown", { pointerType: "pen", buttons: 3 });
    pointer("pointermove", { pointerType: "pen", buttons: 3 });
    expect(handlers.mouseChord).not.toHaveBeenCalled();
    input.dispose();
  });

  it("scales pixel pan deltas with the canvas but preserves pinch scale units", () => {
    const { input, element, handlers } = setup();
    const wheel = (ctrlKey: boolean) =>
      Object.assign(new Event("wheel", { cancelable: true }), {
        deltaMode: 0,
        deltaX: 20,
        deltaY: 40,
        clientX: 20,
        clientY: 40,
        ctrlKey,
      });
    const pan = wheel(false);
    element.dispatchEvent(pan);
    expect(pan.defaultPrevented).toBe(true);
    expect(handlers.wheel).toHaveBeenLastCalledWith(expect.objectContaining({ deltaX: 10, deltaY: 20 }));
    element.dispatchEvent(wheel(true));
    expect(handlers.wheel).toHaveBeenLastCalledWith(expect.objectContaining({ deltaX: 20, deltaY: 40 }));
    input.dispose();
  });
  it("ignores a release after cancellation and recovers when the button state is lost", () => {
    const { input, pointer, handlers } = setup();
    pointer("pointerdown");
    pointer("pointermove", { buttons: 0 });
    pointer("pointerup");
    expect(handlers.cancel).toHaveBeenCalledOnce();
    expect(handlers.up).not.toHaveBeenCalled();
    input.dispose();
  });
  it("normalizes mouse coordinates once and retains capture until release", () => {
    const { input, handlers, pointer, captures } = setup();
    pointer("pointerdown");
    expect(captures.has(1)).toBe(true);
    expect(handlers.down).toHaveBeenCalledWith(expect.objectContaining({ clientX: 5, clientY: 10 }));
    pointer("pointermove", { clientX: 1000 });
    pointer("pointerup", { clientX: 1000, buttons: 0 });
    expect(handlers.up).toHaveBeenCalledOnce();
    expect(captures.size).toBe(0);
    expect(handlers.cancel).not.toHaveBeenCalled();
    input.dispose();
  });

  it("uses only touch events for touch pointers and the actual release location", () => {
    const { input, handlers, pointer, touch } = setup();
    pointer("pointerdown", { pointerType: "touch" });
    touch("touchstart", [[40, 50]]);
    pointer("pointerup", { pointerType: "touch" });
    touch("touchend", [], [[45, 55]]);
    expect(handlers.down).toHaveBeenCalledOnce();
    expect(handlers.up).toHaveBeenCalledOnce();
    expect(handlers.up).toHaveBeenCalledWith(expect.objectContaining({ clientX: 17.5, clientY: 17.5 }));
    input.dispose();
  });

  it("cancels single-finger dragging for pinch and does not resume it with the remaining finger", () => {
    const { input, handlers, touch } = setup();
    touch("touchstart", [[20, 40]]);
    touch("touchstart", [
      [20, 40],
      [60, 40],
    ]);
    touch("touchmove", [
      [30, 40],
      [80, 40],
    ]);
    touch("touchend", [[30, 40]], [[80, 40]]);
    touch("touchmove", [[40, 40]]);
    touch("touchend", [], [[40, 40]]);
    expect(handlers.cancel).toHaveBeenCalledOnce();
    expect(handlers.move).not.toHaveBeenCalled();
    expect(handlers.up).not.toHaveBeenCalled();
    expect(handlers.touchmove).toHaveBeenCalledTimes(2);
    expect(handlers.doubleClick).not.toHaveBeenCalled();
    input.dispose();
  });

  it("recognizes same-button double clicks but not mixed buttons or drags", () => {
    const { input, handlers, pointer } = setup();
    pointer("pointerdown");
    pointer("pointerup");
    pointer("pointerdown", { button: 2 });
    pointer("pointerup", { button: 2 });
    expect(handlers.doubleClick).not.toHaveBeenCalled();
    pointer("pointerdown", { button: 2 });
    pointer("pointerup", { button: 2 });
    expect(handlers.doubleClick).toHaveBeenCalledOnce();
    pointer("pointerdown");
    pointer("pointermove", { clientX: 100 });
    pointer("pointerup");
    pointer("pointerdown");
    pointer("pointerup");
    expect(handlers.doubleClick).toHaveBeenCalledOnce();
    input.dispose();
  });

  it.each(["pointercancel", "lostpointercapture"])("cleans up %s without a click", (type) => {
    const { input, handlers, pointer, captures } = setup();
    pointer("pointerdown");
    pointer(type);
    expect(handlers.cancel).toHaveBeenCalledOnce();
    expect(handlers.doubleClick).not.toHaveBeenCalled();
    expect(captures.size).toBe(0);
    input.dispose();
  });

  it("cancels on focus loss and unbinds all listeners on disposal", () => {
    const { input, handlers, pointer, touch } = setup();
    pointer("pointerdown");
    window.dispatchEvent(new Event("blur"));
    expect(handlers.cancel).toHaveBeenCalledOnce();
    input.dispose();
    const count = handlers.cancel.mock.calls.length;
    pointer("pointerdown");
    touch("touchstart", [[20, 40]]);
    window.dispatchEvent(new Event("blur"));
    expect(handlers.down).toHaveBeenCalledOnce();
    expect(handlers.cancel).toHaveBeenCalledTimes(count);
  });
});
