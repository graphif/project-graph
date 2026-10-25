import { exists } from "@/platform/files";
import type { Store } from "@/platform/store";
import { createStore } from "@/platform/store";

export namespace StartFilesManager {
  let store: Store;

  export type StartFile = {
    /**
     * 绝对路径
     */
    path: string;
    /**
     * 上次改动或打开的时间戳
     */
    time: number;
  };

  export async function init() {
    store = await createStore("start-files.json");
    store.save();
  }

  export async function clearStartFiles() {
    await store.set("startFiles", []);
    await store.set("currentStartFile", "");
    store.save();
    return true;
  }

  export async function getStartFiles(): Promise<StartFile[]> {
    const data = ((await store.get("startFiles")) as StartFile[]) || [];
    return data; // 返回最近文件列表
  }
  export async function getCurrentStartFile(): Promise<string> {
    return ((await store.get("currentStartFile")) as string) || ""; // 返回当前打开的文件
  }

  export async function setCurrentStartFile(filePath: string) {
    if (filePath === "") {
      return false; // 空路径不处理
    }
    let isFind = false;
    for (const file of await getStartFiles()) {
      if (file.path === filePath) {
        isFind = true;
        break;
      }
    }
    if (!isFind) {
      return false;
    }
    await store.set("currentStartFile", filePath);
    await store.save();
    return true;
  }

  export async function addStartFile(filePath: string) {
    const existingFiles = await getStartFiles();
    for (const file of existingFiles) {
      if (file.path === filePath) {
        return false; // 文件已存在，不再添加
      }
    }
    existingFiles.push({
      path: filePath,
      time: Date.now(),
    });
    await store.set("startFiles", existingFiles);
    await store.save();
    return true;
  }

  export async function removeStartFile(filePath: string) {
    const existingFiles = await getStartFiles();
    // 先检测有没有
    let isFind = false;
    for (const file of existingFiles) {
      if (file.path === filePath) {
        isFind = true;
        break;
      }
    }
    if (!isFind) {
      return false;
    }
    // 开始删除
    // 看看删掉的是不是已经选择的
    const currentFile = await getCurrentStartFile();
    if (currentFile === filePath) {
      await store.set("currentStartFile", "");
    }
    const newFiles = existingFiles.filter((file) => file.path !== filePath);
    await store.set("startFiles", newFiles);
    await store.save();
    return true;
  }

  export async function validateAndRefreshStartFiles() {
    const startFiles = await getStartFiles();
    const startFilesValid: StartFile[] = [];

    // 是否存在文件丢失情况
    let isFileLost = false;

    for (const file of startFiles) {
      try {
        const isExists = await exists(file.path);
        if (isExists) {
          startFilesValid.push(file); // 存在则保留
        } else {
          isFileLost = true;
        }
      } catch (e) {
        console.error("无法检测文件是否存在：", file.path);
        console.error(e);
      }
    }
    if (isFileLost) {
      await store.set("startFiles", startFilesValid); // 更新存储
      await store.save();
    }
  }
}
