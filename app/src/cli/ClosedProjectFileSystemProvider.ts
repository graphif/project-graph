import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import type { FileSystemProvider } from "@/core/interfaces/Service";
import type { DirEntry } from "@tauri-apps/plugin-fs";
import type { URI } from "vscode-uri";

export class FileSystemProviderFile implements FileSystemProvider {
  async read(uri: URI): Promise<Uint8Array> {
    return readFile(uri.fsPath);
  }

  async readDir(uri: URI): Promise<DirEntry[]> {
    const entries = await readdir(uri.fsPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      isSymlink: entry.isSymbolicLink(),
    }));
  }

  async write(uri: URI, content: Uint8Array): Promise<void> {
    await writeFile(uri.fsPath, content);
  }

  async remove(uri: URI): Promise<void> {
    await rm(uri.fsPath, { recursive: true });
  }

  async exists(uri: URI): Promise<boolean> {
    try {
      await access(uri.fsPath);
      return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return false;
      throw error;
    }
  }

  async mkdir(uri: URI): Promise<void> {
    await mkdir(uri.fsPath, { recursive: true });
  }

  async rename(oldUri: URI, newUri: URI): Promise<void> {
    await rename(oldUri.fsPath, newUri.fsPath);
  }
}
