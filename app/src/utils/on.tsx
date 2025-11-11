import { Container } from "pixi.js";

/**
 * 装饰器：自动为方法绑定事件监听，并在destroy时移除监听
 */
export const on =
  <T extends Container>(eventName: Parameters<T["on"]>[0]) =>
  (target: T, property: keyof T) => {
    const original = target[property];
    if (typeof original !== "function") {
      throw new Error(`@on decorator can only be applied to methods, but got ${typeof original}`);
    }
    const func = original.bind(target);
    target.on(eventName, func);
    // 修改destroy方法
    const originalDestroy = target.destroy;
    target.destroy = function (this: T, ...args: Parameters<T["destroy"]>) {
      this.off(eventName, func);
      return originalDestroy.apply(this, args);
    };
  };
