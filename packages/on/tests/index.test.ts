import { Container } from "pixi.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BindEvents, on } from "../src/index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BindEvents", () => {
  it("automatically registers decorated methods on instantiation", () => {
    const onSpy = vi.spyOn(Container.prototype, "on");

    class TestSprite extends BindEvents(Container) {
      handleTap() {}
      handleDown() {}
    }

    on("pointertap")(TestSprite.prototype as unknown as Container, "handleTap");
    on("pointerdown")(TestSprite.prototype as unknown as Container, "handleDown");

    const instance = new TestSprite();

    expect(onSpy).toHaveBeenCalledTimes(2);
    expect(onSpy).toHaveBeenNthCalledWith(1, "pointertap", instance.handleTap, instance);
    expect(onSpy).toHaveBeenNthCalledWith(2, "pointerdown", instance.handleDown, instance);
  });

  it("unregisters decorated methods when destroy is called", () => {
    const offSpy = vi.spyOn(Container.prototype, "off");

    class DisposableSprite extends BindEvents(Container) {
      handleMove() {}
    }

    on("pointermove")(DisposableSprite.prototype as unknown as Container, "handleMove");

    const instance = new DisposableSprite();
    instance.destroy();

    expect(offSpy).toHaveBeenCalledTimes(1);
    expect(offSpy).toHaveBeenCalledWith("pointermove", instance.handleMove, instance);
  });
});
