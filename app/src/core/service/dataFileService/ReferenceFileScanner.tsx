import { mkdir, readDir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { PathString } from "@/utils/pathString";
import { URI } from "vscode-uri";

export namespace ReferenceFileScanner {
  const fileCache: Map<string, Set<string>> = new Map();

  export function clearCache(projectPath: string) {
    fileCache.delete(projectPath);
  }

  export function clearAllCache() {
    fileCache.clear();
  }

  export function getReferenceFolderPath(projectPath: string): string {
    const dir = PathString.dirPath(projectPath);
    const fileName = PathString.getFileNameFromPath(projectPath);
    const sep = PathString.getSep();
    return `${dir}${sep}${fileName}`;
  }

  export async function ensureReferenceFolderExists(projectPath: string): Promise<string> {
    const folderPath = getReferenceFolderPath(projectPath);
    const folderExists = await exists(folderPath);
    if (!folderExists) {
      await mkdir(folderPath, { recursive: true });
    }
    return folderPath;
  }

  export async function scanReferenceFolder(projectPath: string): Promise<Set<string>> {
    const cached = fileCache.get(projectPath);
    if (cached) {
      return cached;
    }

    const folderPath = getReferenceFolderPath(projectPath);
    const fileNames = new Set<string>();

    if (!(await exists(folderPath))) {
      fileCache.set(projectPath, fileNames);
      return fileNames;
    }

    await scanDirectoryRecursive(folderPath, fileNames);
    fileCache.set(projectPath, fileNames);
    return fileNames;
  }

  async function scanDirectoryRecursive(dirPath: string, fileNames: Set<string>): Promise<void> {
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        if (entry.isDirectory) {
          await scanDirectoryRecursive(await join(dirPath, entry.name), fileNames);
        } else if (entry.isFile && entry.name.endsWith(".prg")) {
          const fileName = entry.name.slice(0, -4);
          fileNames.add(fileName);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  export async function findFileInReferenceFolder(projectPath: string, fileName: string): Promise<string | null> {
    const folderPath = getReferenceFolderPath(projectPath);
    if (!(await exists(folderPath))) {
      return null;
    }

    const foundPath = await findFileRecursive(folderPath, `${fileName}.prg`);
    return foundPath;
  }

  async function findFileRecursive(dirPath: string, targetFileName: string): Promise<string | null> {
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const entryPath = await join(dirPath, entry.name);
        if (entry.isDirectory) {
          const found = await findFileRecursive(entryPath, targetFileName);
          if (found) return found;
        } else if (entry.isFile && entry.name === targetFileName) {
          return entryPath;
        }
      }
    } catch (error) {
      console.error(`Error finding file in ${dirPath}:`, error);
    }
    return null;
  }

  export async function addFileToCache(projectPath: string, fileName: string): Promise<void> {
    let cached = fileCache.get(projectPath);
    if (!cached) {
      cached = new Set();
      fileCache.set(projectPath, cached);
    }
    cached.add(fileName);
  }

  export function getNewFilePath(projectPath: string, fileName: string): string {
    const folderPath = getReferenceFolderPath(projectPath);
    const sep = PathString.getSep();
    return `${folderPath}${sep}${fileName}.prg`;
  }

  export function getNewFileUri(projectPath: string, fileName: string): URI {
    const filePath = getNewFilePath(projectPath, fileName);
    return URI.file(filePath);
  }
}
