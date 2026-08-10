import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { FileSystemProvider } from "@/core/interfaces/Service";
import { RuntimeCleanupError } from "@/core/RuntimeCleanup";
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
    await writeClosedProjectFileAtomically(uri.fsPath, content);
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

export async function writeClosedProjectFileAtomically(
  path: string,
  content: Uint8Array | string,
  abortSignal?: AbortSignal,
): Promise<void> {
  const temporaryPath = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let operationError: unknown;
  let failed = false;
  let committed = false;
  try {
    abortSignal?.throwIfAborted();
    try {
      await access(path, constants.W_OK);
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
    }
    await writeFile(temporaryPath, content, { signal: abortSignal });
    abortSignal?.throwIfAborted();
    await rename(temporaryPath, path);
    committed = true;
  } catch (error) {
    failed = true;
    operationError = error;
  }
  if (!committed) {
    try {
      await rm(temporaryPath, { force: true });
    } catch (cleanupError) {
      throw new RuntimeCleanupError("Closed Project temporary file cleanup failed", {
        cause: new AggregateError([operationError, cleanupError]),
      });
    }
  }
  if (failed) throw operationError;
}
