import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, readDir } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";
import { FileSystemProviderFile } from "../fileSystemProvider/FileSystemProviderFile";
import { Settings } from "../service/Settings";
import { Extension } from "./Extension";
import { ExtensionRuntime } from "./ExtensionRuntime";

export namespace ExtensionManager {
  const extensions: Map<string, Extension> = new Map();
  const runtimes: Map<string, ExtensionRuntime> = new Map();

  export async function getExtensionsDir() {
    console.log(await appDataDir());
    return await join(await appDataDir(), "extensions");
  }
  export async function getExtensions() {
    const extensionsDir = await getExtensionsDir();
    if (!(await exists(extensionsDir))) {
      await mkdir(extensionsDir);
    }
    const entries = await readDir(extensionsDir);
    return entries.map((it) => it.name);
  }
  export async function getExtension(name: string) {
    if (extensions.has(name)) {
      return extensions.get(name)!;
    }
    const extensionsDir = await getExtensionsDir();
    const extensionPath = await join(extensionsDir, name);
    const extension = new Extension(URI.file(extensionPath));
    extension.registerFileSystemProvider("file", FileSystemProviderFile);
    await extension.init();
    extensions.set(name, extension);
    return extension;
  }
  export async function getRuntime(name: string) {
    if (runtimes.has(name)) {
      return runtimes.get(name)!;
    }
    const extension = await getExtension(name);
    const runtime = new ExtensionRuntime(extension);
    runtimes.set(name, runtime);
    return runtime;
  }

  /**
   * 卸载单个扩展：终止 Worker 并清除缓存，使下次 getRuntime 能重新创建
   */
  export function unload(name: string) {
    const runtime = runtimes.get(name);
    if (runtime) {
      runtime.terminate();
      runtimes.delete(name);
    }
    extensions.delete(name);
  }

  /**
   * 创建并运行所有扩展
   */
  export async function init() {
    const extensionNames = await getExtensions();
    for (const name of extensionNames) {
      if (Settings.disabledExtensions.includes(name)) {
        console.log(`扩展 ${name} 已被禁用，跳过加载`);
        continue;
      }
      await getRuntime(name);
    }
  }

  export async function reload() {
    // 终止所有扩展的 Worker
    for (const runtime of runtimes.values()) {
      runtime.terminate();
    }
    runtimes.clear();
    extensions.clear();
    await init();
  }
}
