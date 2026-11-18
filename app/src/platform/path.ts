import { Native } from "@/generated/mygo";
import { isMyGo, runtime } from "mygo-runtime";

export const appDataDir = () => Native.path("data");
export const appLocalDataDir = appDataDir;
export const dataDir = appDataDir;
export const appCacheDir = () => Native.path("cache");
export const homeDir = () => Native.path("home");
export const tempDir = () => Native.path("temp");
export const dirname = Native.dirname;
export const join = (...parts: string[]) => Native.join(parts);
export const sep = () => (isMyGo() && runtime().platform === "win32" ? "\\" : "/");
