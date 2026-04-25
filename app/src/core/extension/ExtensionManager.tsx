import { appDataDir, join } from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";
import { FileSystemProviderFile } from "../fileSystemProvider/FileSystemProviderFile";
import { Extension } from "./Extension";
import { ExtensionRuntime } from "./ExtensionRuntime";

export namespace ExtensionManager {
  const extensions: Map<string, Extension> = new Map();
  const runtimes: Map<string, ExtensionRuntime> = new Map();

  export async function getExtensionsDir() {
    return await join(await appDataDir(), "extensions");
  }
  export async function getExtensions() {
    const extensionsDir = await getExtensionsDir();
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
   * 创建并运行所有扩展
   */
  export async function init() {
    const extensionNames = await getExtensions();
    for (const name of extensionNames) {
      await getRuntime(name);
    }
  }
}
