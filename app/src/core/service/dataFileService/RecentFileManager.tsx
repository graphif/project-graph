import { createStore } from "@/utils/store";
import { exists } from "@tauri-apps/plugin-fs";
import { Store } from "@tauri-apps/plugin-store";
import { URI } from "vscode-uri";

/**
 * 管理最近打开的文件列表
 * 有数据持久化机制
 */
export namespace RecentFileManager {
  let store: Store;

  export type RecentFile = {
    uri: URI;
    /**
     * 上次保存或打开的时间戳
     */
    time: number;
  };

  export async function init() {
    store = await createStore("recent-files2.json");
    await store.save();
  }

  /**
   * 增加一个最近打开的文件
   * @param file
   */
  export async function addRecentFile(file: RecentFile) {
    // 如果已经有了，则先删除
    const existingFiles = await getRecentFiles();
    const existingIndex = existingFiles.findIndex((f) => f.uri.toString() === file.uri.toString());
    if (existingIndex >= 0) {
      existingFiles.splice(existingIndex, 1); // 删除已有记录
    }

    existingFiles.push(file); // 添加新文件

    await store.set(
      "recentFiles",
      existingFiles.map((f) => ({ ...f, uri: f.uri.toString() })),
    ); // 更新存储
    await store.save();
  }

  export async function addRecentFileByUri(uri: URI) {
    await addRecentFile({
      uri: uri,
      time: new Date().getTime(),
    });
  }

  export async function addRecentFilesByUris(uris: URI[]) {
    // 先去重
    const uniqueUris = Array.from(new Set(uris.map((u) => u.toString()))).map((str) => URI.parse(str));
    const existingFiles = await getRecentFiles();
    for (const uri of uniqueUris) {
      const addFile = {
        uri: uri,
        time: new Date().getTime(),
      };
      if (!existingFiles.some((f) => f.uri.toString() === addFile.uri.toString())) {
        existingFiles.push(addFile); // 添加新文件
      }
    }
    await store.set(
      "recentFiles",
      existingFiles.map((f) => ({ ...f, uri: f.uri.toString() })),
    ); // 更新存储
    await store.save();
  }

  /**
   * 删除一条历史记录
   * @param path
   */
  export async function removeRecentFileByUri(uri: URI) {
    const existingFiles = await getRecentFiles();
    const existingIndex = existingFiles.findIndex((f) => f.uri.toString() === uri.toString());
    if (existingIndex >= 0) {
      existingFiles.splice(existingIndex, 1); // 删除已有记录
      await store.set(
        "recentFiles",
        existingFiles.map((f) => ({ ...f, uri: f.uri.toString() })),
      ); // 更新存储
      await store.save();
      return true;
    }
    return false;
  }

  /**
   * 清空所有历史记录
   */
  export async function clearAllRecentFiles() {
    await store.set("recentFiles", []); // 清空列表
    await store.save();
  }

  /**
   * 获取最近打开的文件列表
   */
  export async function getRecentFiles(): Promise<RecentFile[]> {
    const data = ((await store.get("recentFiles")) as any[]) || [];
    // 恢复为Uri对象
    return data.map((f) => ({
      ...f,
      uri: typeof f.uri === "string" ? URI.parse(f.uri) : f.uri,
    }));
  }

  /**
   * 刷新最近打开的文件列表
   * 从缓存中读取每个文件的路径，检查文件是否存在
   * 如果不存在，则删除该条记录
   */
  export async function validAndRefreshRecentFiles() {
    const recentFiles = await getRecentFiles();
    const recentFilesValid: RecentFile[] = [];

    // 是否存在文件丢失情况
    let isFileLost = false;

    for (const file of recentFiles) {
      try {
        const isExists = await exists(file.uri.toString());
        if (isExists) {
          recentFilesValid.push(file); // 存在则保留
        } else {
          isFileLost = true;
        }
      } catch (e) {
        console.error("无法检测文件是否存在：", file.uri.toString());
        console.error(e);
      }
    }
    if (isFileLost) {
      await store.set(
        "recentFiles",
        recentFilesValid.map((f) => ({ ...f, uri: f.uri.toString() })),
      ); // 更新存储
    }
  }

  /**
   * 最终按时间戳排序，最近的在最前面
   */
  export async function sortTimeRecentFiles() {
    const recentFiles = await getRecentFiles();
    // 新的在前面
    recentFiles.sort((a, b) => b.time - a.time);
    await store.set(
      "recentFiles",
      recentFiles.map((f) => ({ ...f, uri: f.uri.toString() })),
    ); // 更新存储
    await store.save();
  }

  /**
   * 清空最近打开的文件列表，用户手动清除
   */
  export async function clearRecentFiles() {
    await store.set("recentFiles", []); // 清空列表
    await store.save();
  }
}
