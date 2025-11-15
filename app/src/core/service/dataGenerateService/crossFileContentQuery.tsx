import { loadAllServicesAfterInit, loadAllServicesBeforeInit } from "@/core/loadAllServices";
import { Project } from "@/core/Project";
import { PathString } from "@/utils/pathString";
import { RecentFileManager } from "../dataFileService/RecentFileManager";
import { Section } from "@/core/stage/stageObject/entity/Section";

/**
 * 跨文件内容查询服务
 * 用于获取其他prg文件中的内容
 */
export namespace CrossFileContentQuery {
  // 缓存表，key是文件名，value是{sections: Section[], timestamp: number}
  const sectionCache: Map<string, { sections: string[]; timestamp: number }> = new Map();
  // 缓存时间，单位：毫秒
  const CACHE_TIME = 10000;

  /**
   * 获取指定文件中的所有Section框名称
   * @param fileName 文件名
   * @returns Section框名称数组
   */
  export async function getSectionsByFileName(fileName: string): Promise<string[]> {
    // 检查缓存是否存在且未过期
    const cached = sectionCache.get(fileName);
    if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
      return cached.sections;
    }

    try {
      // 1. 根据文件名查找并加载prg文件
      const recentFiles = await RecentFileManager.getRecentFiles();
      const file = recentFiles.find(
        (file) =>
          PathString.getFileNameFromPath(file.uri.path) === fileName ||
          PathString.getFileNameFromPath(file.uri.fsPath) === fileName,
      );
      if (!file) {
        // 如果文件不存在，返回空数组
        sectionCache.set(fileName, { sections: [], timestamp: Date.now() });
        return [];
      }

      const fileUri = file.uri;
      const project = new Project(fileUri);
      loadAllServicesBeforeInit(project);
      await project.init();
      loadAllServicesAfterInit(project);

      // 2. 查找所有Section
      const sections = project.stage
        .filter((obj) => obj instanceof Section && obj.text)
        .map((section) => (section as Section).text);

      // 3. 缓存结果
      sectionCache.set(fileName, { sections, timestamp: Date.now() });

      // 4. 清理资源
      project.dispose();

      return sections;
    } catch (error) {
      console.error("获取文件中的Section框失败", error);
      // 错误时也缓存空结果，避免频繁重试
      sectionCache.set(fileName, { sections: [], timestamp: Date.now() });
      return [];
    }
  }

  /**
   * 清除指定文件的缓存
   * @param fileName 文件名
   */
  export function clearCache(fileName?: string): void {
    if (fileName) {
      sectionCache.delete(fileName);
    } else {
      sectionCache.clear();
    }
  }
}
