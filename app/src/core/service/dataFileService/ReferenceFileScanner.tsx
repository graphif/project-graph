/**
 * 引用块文件扫描器
 *
 * 核心功能：
 * 1. 管理引用块文件的存储位置（在当前项目目录下创建同名子文件夹）
 * 2. 扫描和缓存引用块文件夹中的 .prg 文件
 * 3. 查找和定位引用块文件
 *
 * 使用场景：
 * - 当用户输入 [[文件名]] 创建引用块时，系统会自动在当前项目的引用文件夹中查找或创建对应文件
 * - 支持跨项目引用，优先在当前项目的引用文件夹中查找，确保不同项目的同名引用不会冲突
 *
 * 文件夹结构示例：
 * - 当前项目.prg
 * - 当前项目/
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
  const fileCache: Map<string, Set<string>> = new Map();

  /**
   * 清除指定项目的文件缓存
   * @param projectPath 项目文件路径
   */
  export function clearCache(projectPath: string) {
    fileCache.delete(projectPath);
  }

  /**
   * 清除所有项目的文件缓存
   */
  export function clearAllCache() {
    fileCache.clear();
  }

  /**
   * 获取引用文件夹路径
   *
   * 核心功能：根据项目文件路径，计算出对应的引用文件夹路径
   * 例如：/path/to/项目.prg -> /path/to/项目/
   *
   * @param projectPath 项目文件路径（.prg 文件）
   * @returns 引用文件夹路径
   */
  export function getReferenceFolderPath(projectPath: string): string {
    const dir = PathString.dirPath(projectPath);
    const fileName = PathString.getFileNameFromPath(projectPath);
    const sep = PathString.getSep();
    return `${dir}${sep}${fileName}`;
  }

  /**
   * 确保引用文件夹存在
   *
   * 核心功能：检查引用文件夹是否存在，不存在则递归创建
   * 用于在创建新引用文件前确保目标文件夹已准备好
   *
   * @param projectPath 项目文件路径
   * @returns 引用文件夹路径
   */
  export async function ensureReferenceFolderExists(projectPath: string): Promise<string> {
    const folderPath = getReferenceFolderPath(projectPath);
    const folderExists = await exists(folderPath);
    if (!folderExists) {
      await mkdir(folderPath, { recursive: true });
    }
    return folderPath;
  }

  /**
   * 扫描引用文件夹中的所有 .prg 文件
   *
   * 核心功能：
   * 1. 递归扫描引用文件夹及其子文件夹
   * 2. 收集所有 .prg 文件的文件名（不含扩展名）
   * 3. 使用缓存加速后续查找
   *
   * @param projectPath 项目文件路径
   * @returns 文件名集合（不含 .prg 扩展名）
   */
  export async function scanReferenceFolder(projectPath: string): Promise<Set<string>> {
    // 检查缓存
    const cached = fileCache.get(projectPath);
    if (cached) {
      return cached;
    }

    const folderPath = getReferenceFolderPath(projectPath);
    const fileNames = new Set<string>();

    // 如果文件夹不存在，返回空集合
    if (!(await exists(folderPath))) {
      fileCache.set(projectPath, fileNames);
      return fileNames;
    }

    // 递归扫描文件夹
    await scanDirectoryRecursive(folderPath, fileNames);
    fileCache.set(projectPath, fileNames);
    return fileNames;
  }

  /**
   * 递归扫描目录
   *
   * 核心功能：遍历目录树，收集所有 .prg 文件的文件名
   *
   * @param dirPath 目录路径
   * @param fileNames 文件名集合（用于收集结果）
   */
  async function scanDirectoryRecursive(dirPath: string, fileNames: Set<string>): Promise<void> {
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        if (entry.isDirectory) {
          // 递归扫描子目录
          await scanDirectoryRecursive(await join(dirPath, entry.name), fileNames);
        } else if (entry.isFile && entry.name.endsWith(".prg")) {
          // 收集 .prg 文件名（去除扩展名）
          const fileName = entry.name.slice(0, -4);
          fileNames.add(fileName);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  /**
   * 在引用文件夹中查找指定文件
   *
   * 核心功能：递归搜索引用文件夹，查找匹配的 .prg 文件
   * 用于判断引用目标是否已存在
   *
   * @param projectPath 项目文件路径
   * @param fileName 要查找的文件名（不含扩展名）
   * @returns 找到的文件完整路径，未找到返回 null
   */
  export async function findFileInReferenceFolder(projectPath: string, fileName: string): Promise<string | null> {
    const folderPath = getReferenceFolderPath(projectPath);
    if (!(await exists(folderPath))) {
      return null;
    }

    // 递归查找文件
    const foundPath = await findFileRecursive(folderPath, `${fileName}.prg`);
    return foundPath;
  }

  /**
   * 递归查找文件
   *
   * 核心功能：在目录树中搜索指定文件名
   *
   * @param dirPath 目录路径
   * @param targetFileName 目标文件名（含扩展名）
   * @returns 找到的文件完整路径，未找到返回 null
   */
  async function findFileRecursive(dirPath: string, targetFileName: string): Promise<string | null> {
    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const entryPath = await join(dirPath, entry.name);
        if (entry.isDirectory) {
          // 递归搜索子目录
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

  /**
   * 将新创建的文件添加到缓存
   *
   * 核心功能：创建新引用文件后，更新缓存以加速后续查找
   *
   * @param projectPath 项目文件路径
   * @param fileName 新文件名（不含扩展名）
   */
  export async function addFileToCache(projectPath: string, fileName: string): Promise<void> {
    let cached = fileCache.get(projectPath);
    if (!cached) {
      cached = new Set();
      fileCache.set(projectPath, cached);
    }
    cached.add(fileName);
  }

  /**
   * 获取新引用文件的完整路径
   *
   * 核心功能：根据项目路径和文件名，生成新引用文件的存储路径
   *
   * @param projectPath 项目文件路径
   * @param fileName 新文件名（不含扩展名）
   * @returns 新文件的完整路径
   */
  export function getNewFilePath(projectPath: string, fileName: string): string {
    const folderPath = getReferenceFolderPath(projectPath);
    const sep = PathString.getSep();
    return `${folderPath}${sep}${fileName}.prg`;
  }

  /**
   * 获取新引用文件的 URI
   *
   * 核心功能：生成新引用文件的 URI 对象，用于创建 Project 实例
   *
   * @param projectPath 项目文件路径
   * @param fileName 新文件名（不含扩展名）
   * @returns 新文件的 URI
   */
  export function getNewFileUri(projectPath: string, fileName: string): URI {
    const filePath = getNewFilePath(projectPath, fileName);
    return URI.file(filePath);
  }
}
