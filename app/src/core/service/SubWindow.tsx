import { store } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { atom, useAtomValue } from "jotai";
import { startTransition } from "react";

export namespace SubWindow {
  // export enum IdEnum {}
  export interface Window {
    /** uuid */
    id: string;
    title: string;
    children: React.ReactNode;
    /** 当大小为(-1,-1)时，则为自适应大小 */
    rect: Rectangle;
    /** 开发中 */
    maximized: boolean;
    /** 开发中 */
    minimized: boolean;
    focused: boolean;
    zIndex: number;
    /**
     * 标题栏区域覆盖在内容之上
     * 设置为true就不能拖动窗口了
     * 可以给窗口内元素添加data-pg-drag-region属性，使其成为可拖动区域
     */
    titleBarOverlay: boolean;
    resizable: boolean;
    /**
     * 只是隐藏关闭按钮，不影响下面的closeWhen方法
     */
    closable: boolean;
    closing: boolean;
    closeWhenClickOutside: boolean;
    /** @private */
    _closeWhenClickOutsideListener?: (e: PointerEvent) => void;
    closeWhenClickInside: boolean;
  }
  const subWindowsAtom = atom<Window[]>([]);
  export const use = () => useAtomValue(subWindowsAtom);
  function getMaxZIndex() {
    return store.get(subWindowsAtom).reduce((maxZIndex, window) => Math.max(maxZIndex, window.zIndex), 0);
  }
  export function create(options: Partial<Window>): Window {
    const win: Window = {
      id: crypto.randomUUID(),
      title: "",
      children: <></>,
      rect: new Rectangle(Vector.getZero(), Vector.same(100)),
      maximized: false,
      minimized: false,
      // opacity: 1,
      focused: false,
      zIndex: getMaxZIndex() + 1,
      titleBarOverlay: false,
      resizable: true,
      closable: true,
      closing: false,
      closeWhenClickOutside: false,
      closeWhenClickInside: false,
      ...options,
    };
    //检测如果窗口到屏幕外面了，自动调整位置
    const { x: width, y: height } = win.rect.size;
    const { innerWidth, innerHeight } = window;
    if (win.rect.location.x + width > innerWidth) {
      win.rect.location.x = innerWidth - width;
    }
    if (win.rect.location.y + height > innerHeight) {
      win.rect.location.y = innerHeight - height;
    }
    // 窗口创建完成，添加到store中
    store.set(subWindowsAtom, [...store.get(subWindowsAtom), win]);
    if (options.closeWhenClickOutside) {
      win._closeWhenClickOutsideListener = (e: PointerEvent) => {
        if (e.target instanceof HTMLElement && e.target.closest(`[data-pg-window-id="${win.id}"]`)) {
          return;
        }
        close(win.id);
      };
      document.addEventListener("pointerdown", win._closeWhenClickOutsideListener);
    }
    return win;
  }
  export function update(id: string, options: Partial<Omit<Window, "id">>) {
    store.set(
      subWindowsAtom,
      store.get(subWindowsAtom).map((window) => (window.id === id ? { ...window, ...options } : window)),
    );
  }
  export function close(id: string) {
    if (get(id)?.closeWhenClickOutside) {
      document.removeEventListener("pointerdown", get(id)._closeWhenClickOutsideListener!);
    }
    update(id, { closing: true });
    setTimeout(() => {
      // 窗口已经几乎看不见了，可以先把children清空
      update(id, { children: null });
    }, 450);
    setTimeout(() => {
      startTransition(() => {
        store.set(
          subWindowsAtom,
          store.get(subWindowsAtom).filter((window) => window.id !== id),
        );
      });
    }, 500);
  }
  export function focus(id: string) {
    // 先把所有窗口的focused设为false
    store.set(
      subWindowsAtom,
      store.get(subWindowsAtom).map((window) => ({ ...window, focused: false })),
    );
    // 再把当前窗口的focused设为true，并且把zIndex设为最大
    update(id, { focused: true, zIndex: getMaxZIndex() + 1 });
  }
  export function get(id: string) {
    return store.get(subWindowsAtom).find((window) => window.id === id)!;
  }
}
