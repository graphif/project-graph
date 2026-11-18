import { currentWindow } from "mygo-runtime";
import { Native, events } from "@/generated/mygo";

export const desktopWindow = {
  ...currentWindow,
  show: Native.show,
  hide: Native.hide,
  destroy: Native.destroy,
  setFocus: Native.focus,
  setSkipTaskbar: Native.setSkipTaskbar,
  setAlwaysOnTop: Native.setAlwaysOnTop,
  setIgnoreCursorEvents: Native.setIgnoreCursorEvents,
  setResizable: Native.setResizable,
  unminimize: Native.restore,
  isFullscreen: Native.isFullscreen,
  setFullscreen: Native.setFullscreen,
  async isFocused() {
    return document.hasFocus();
  },
  async theme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },
  async onThemeChanged(callback: (event: { payload: string }) => void) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => callback({ payload: media.matches ? "dark" : "light" });
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  },
  async onFocusChanged(callback: (event: { payload: boolean }) => void) {
    const listener = () => callback({ payload: document.hasFocus() });
    window.addEventListener("focus", listener);
    window.addEventListener("blur", listener);
    return () => {
      window.removeEventListener("focus", listener);
      window.removeEventListener("blur", listener);
    };
  },
  setSize: (size: { width: number; height: number }) => Native.setSize(size.width, size.height),
  async onResized(callback: () => void) {
    window.addEventListener("resize", callback);
    return () => window.removeEventListener("resize", callback);
  },
  async onCloseRequested(callback: () => void | Promise<void>) {
    return events.windowCloseRequested.on(() => {
      void callback();
    });
  },
};
export const getCurrentWindow = () => desktopWindow;
