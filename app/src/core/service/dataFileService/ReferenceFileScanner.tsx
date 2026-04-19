/**
 * 引用块文件扫描器
 *
 * 核心功能：
 * 1. 管理引用块文件的存储位置（在当前项目目录下创建同名子文件夹）
 * 2. 扫描和缓存引用块文件夹中的 .prg 文件
 * 3. 查找和定位引用块文件
 *
 * 使用场景：
 * - 当用户输入 [[文件名]] 创建引用块时，系统会在当前项目的引用文件夹中查找或创建对应文件
 * - 支持跨项目隔离：优先在当前项目的引用文件夹中查找，不同项目的同名引用互不冲突
 *
 * 文件夹结构示例：
 * - 当前项目.prg
 * - 当前项目/          ← 引用文件夹（与项目文件同名）
 *   ├── 引用文件1.prg
 *   ├── 引用文件2.prg
 *   └── 子文件夹/
 *       └── 引用文件3.prg
 */

import { mkdir, readDir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { PathString } from "@/utils/pathString";
import { URI } from "vscode-uri";

export namespace ReferenceFileScanner {
  /**
   * 文件缓存：项目路径 -> 该项目引用文件夹中的文件名集合
   * 用于加速后续查找，避免重复扫描文件系统
   */
  const fileCache = new Map<string, Set<string>>();

  /** 清除指定项目的缓存 */
  export function clearCache(projectPath: string) {
    fileCache.delete(projectPath);
  }

  /** 清除所有项目的缓存 */
  export function clearAllCache() {
    fileCache.clear();
  }

  /**
   * 获取项目对应的引用文件夹路径
   * 规则：与 .prg 文件同目录、同名（不含扩展名）的子文件夹
   */
  export function getReferenceFolderPath(projectPath: string): string {
    const dir = PathString.dirPath(projectPath);
    const fileName = PathString.getFileNameFromPath(projectPath);
    return `${dir}${PathString.getSep()}${fileName}`;
  }

  /**
   * 确保引用文件夹存在，不存在则自动创建
   * @returns 引用文件夹的路径
   */
  export async function ensureReferenceFolderExists(projectPath: string): Promise<string> {
    const folderPath = getReferenceFolderPath(projectPath);
    if (!(await exists(folderPath))) {
      await mkdir(folderPath, { recursive: true });
    }
    return folderPath;
  }

  /**
   * 扫描引用文件夹，返回其中所有 .prg 文件的文件名（不含扩展名）集合
   * 结果会被缓存，重复调用不会重复扫描
   */
  export async function scanReferenceFolder(projectPath: string): Promise<Set<string>> {
    const cached = fileCache.get(projectPath);
    if (cached) return cached;

    const folderPath = getReferenceFolderPath(projectPath);
    const fileNames = new Set<string>();

    if (await exists(folderPath)) {
      await scanDirectoryRecursive(folderPath, fileNames);
    }

    fileCache.set(projectPath, fileNames);
    return fileNames;
  }

  /**
   * 递归扫描目录，将所有 .prg 文件名（不含扩展名）收集到 fileNames 中
   */
  async function scanDirectoryRecursive(dirPath: string, fileNames: Set<string>): Promise<void> {
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const entryPath = await join(dirPath, entry.name);
        if (entry.isDirectory) {
          await scanDirectoryRecursive(entryPath, fileNames);
        } else if (entry.isFile && entry.name.endsWith(".prg")) {
          fileNames.add(entry.name.slice(0, -4));
        }
      }
    } catch (error) {
      console.error(`扫描目录失败 ${dirPath}:`, error);
    }
  }

  /**
   * 在引用文件夹中查找指定文件名的 .prg 文件
   * @returns 找到时返回完整文件路径，否则返回 null
   */
  export async function findFileInReferenceFolder(projectPath: string, fileName: string): Promise<string | null> {
    const folderPath = getReferenceFolderPath(projectPath);
    if (!(await exists(folderPath))) return null;
    return findFileRecursive(folderPath, `${fileName}.prg`);
  }

  /**
   * 递归在目录中查找目标文件
   * @returns 找到时返回完整文件路径，否则返回 null
   */
  async function findFileRecursive(dirPath: string, targetFileName: string): Promise<string | null> {
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const entryPath = await join(dirPath, entry.name);
        if (entry.isFile && entry.name === targetFileName) {
          return entryPath;
        }
        if (entry.isDirectory) {
          const found = await findFileRecursive(entryPath, targetFileName);
          if (found) return found;
        }
      }
    } catch (error) {
      console.error(`查找文件失败 ${dirPath}:`, error);
    }
    return null;
  }

  /**
   * 将文件名加入缓存（创建新文件后调用，避免下次重新扫描）
   */
  export async function addFileToCache(projectPath: string, fileName: string): Promise<void> {
    const cached = fileCache.get(projectPath) ?? new Set<string>();
    cached.add(fileName);
    fileCache.set(projectPath, cached);
  }

  /**
   * 获取在引用文件夹中新建文件的完整路径
   */
  export function getNewFilePath(projectPath: string, fileName: string): string {
    const folderPath = getReferenceFolderPath(projectPath);
    return `${folderPath}${PathString.getSep()}${fileName}.prg`;
  }

  /**
   * 获取在引用文件夹中新建文件的 URI
   */
  export function getNewFileUri(projectPath: string, fileName: string): URI {
    return URI.file(getNewFilePath(projectPath, fileName));
  }
}
