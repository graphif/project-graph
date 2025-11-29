import { FileInfo, FsProvider } from "@graphif/fs";
import { exists, mkdir, readDir, readFile, remove, rename, stat, writeFile } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";

export class FsProviderTauri implements FsProvider {
  static schemes = ["file"];

  async read(uri: URI) {
    return await readFile(uri.fsPath);
  }
  async readDir(uri: URI) {
    return await readDir(uri.fsPath);
  }
  async write(uri: URI, content: Uint8Array) {
    return await writeFile(uri.fsPath, content);
  }
  async remove(uri: URI) {
    return await remove(uri.fsPath);
  }
  async exists(uri: URI) {
    return await exists(uri.fsPath);
  }
  async mkdir(uri: URI) {
    return await mkdir(uri.fsPath);
  }
  async rename(oldUri: URI, newUri: URI) {
    return await rename(oldUri.fsPath, newUri.fsPath);
  }
  async stat(uri: URI) {
    const data = await stat(uri.fsPath);
    // Replace all `undefined` with `null`
    for (const key in data) {
      if (data[key as keyof typeof data] === undefined) {
        (data as any)[key] = null;
      }
    }
    return data as FileInfo;
  }
}
