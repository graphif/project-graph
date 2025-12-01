import { exists, mkdir, readDir, readFile, remove, rename, writeFile } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";
import { FileSystemProvider } from "@/core/interfaces/Service";

export class FileSystemProviderFile implements FileSystemProvider {
  async read(uri: URI) {
    return await readFile(uri.fsPath);
  }

  /**
   * 直接从文件系统创建 Blob 对象，避免一次性加载整个文件到内存
   */
  async readAsBlob(uri: URI): Promise<Blob> {
    const fileContent = await readFile(uri.fsPath);
    // 转换为 Blob 可以接受的类型
    return new Blob([fileContent.buffer as ArrayBuffer]);
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
}
