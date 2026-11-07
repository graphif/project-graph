import { isMyGo, runtime } from "mygo-runtime";

const hostPlatform = isMyGo() ? runtime().platform : undefined;
export const isMac = hostPlatform === "darwin";
export const isWindows = hostPlatform === "win32";
export const isLinux = hostPlatform === "linux";
export const isTest = import.meta.env.LR_VITEST === "true";
export function family() {
  return isWindows ? "windows" : "unix";
}
