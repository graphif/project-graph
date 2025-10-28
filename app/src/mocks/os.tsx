import { type Arch, type Family, type OsType, type Platform } from "@tauri-apps/plugin-os";

export function enableMockOs() {
  const data: {
    eol: string;
    os_type: OsType;
    platform: Platform;
    family: Family;
    version: string;
    arch: Arch;
    exe_extension: string;
  } = {
    eol: "\n",
    os_type: "linux",
    platform: "linux",
    family: "unix",
    version: "Unknown",
    arch: "x86_64",
    exe_extension: "",
  };
  const ua = navigator.userAgent;
  if (ua.indexOf("Windows") >= 0) {
    data.os_type = "windows";
    data.platform = "windows";
    data.family = "windows";
    data.exe_extension = ".exe";
  } else if (ua.indexOf("Macintosh") >= 0 || ua.indexOf("Mac OS X") >= 0) {
    data.os_type = "macos";
    data.platform = "macos";
    data.family = "unix";
  }
  window.__TAURI_OS_PLUGIN_INTERNALS__ = data;
}
