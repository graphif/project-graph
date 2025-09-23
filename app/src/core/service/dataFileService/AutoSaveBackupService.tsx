import { Project, service } from "@/core/Project";
import { appCacheDir } from "@tauri-apps/api/path";
import { join } from "@tauri-apps/api/path";
import { exists, writeFile, readDir, stat, remove, mkdir } from "@tauri-apps/plugin-fs";
import { Settings } from "@/core/service/Settings";
import { toast } from "sonner";
import { PathString } from "@/utils/pathString";

/**
 * 自动保存与备份系统
 *
 * 自动备份：
 * 超过限制时删除老文件
 * 保存在 C:\Users\{userName}\AppData\Local\liren.project-graph\备份文件夹 下
 */
@service("autoSaveBackup")
export class AutoSaveBackupService {
  // 上次备份时间
  private lastBackupTime = 0;
  // 上次备份内容的哈希值
  private lastBackupHash = "";

  constructor(private readonly project: Project) {
    this.lastBackupTime = Date.now();
  }

  /**
   * 高频率调用的tick函数，内部实现降频操作
   */
  tick() {
    const now = Date.now();

    // 检查是否开启了自动备份
    if (!Settings.autoBackup) {
      return;
    }

    // 检查是否达到备份间隔时间（转换为毫秒）
    if (now - this.lastBackupTime >= Settings.autoBackupInterval * 1000) {
      this.lastBackupTime = now;
      this.autoBackup().catch((err) => {
        console.error("自动备份失败:", err);
      });
    }
  }

  /**
   * 执行自动备份操作
   */
  private async autoBackup() {
    if (!this.project.uri || this.project.isDraft) {
      // 临时草稿先不备份
      return;
    }

    try {
      const currentHash = this.project.stageHash;
      // 检查是否与上次备份有差异
      if (currentHash === this.lastBackupHash) {
        return;
      }

      // 获取缓存目录
      const cacheDir = await appCacheDir();
      // 创建备份目录
      const backupDir = await join(cacheDir, "auto-backup-v2");

      // 确保备份目录存在
      if (!(await exists(backupDir))) {
        try {
          // 创建备份目录
          await mkdir(backupDir);
        } catch (err) {
          toast.error(`创建备份目录失败: ${err}`);
          return;
        }
      }

      // 生成备份文件名
      const fileName = this.generateBackupFileName();
      const backupFilePath = await join(backupDir, fileName);

      // 创建备份文件
      await this.createBackupFile(backupFilePath);

      // 更新上次备份的哈希值
      this.lastBackupHash = currentHash;

      // 管理备份文件数量
      await this.manageBackupFiles(backupDir);
    } catch (err) {
      toast.error("自动备份过程中发生错误:" + err);
    }
  }

  /**
   * 生成备份文件名
   */
  private generateBackupFileName(): string {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;

    // 获取原始文件名（不包含扩展名）
    const originalFileName = this.getOriginalFileName();

    return `${originalFileName}-${timestamp}.prg`;
  }

  /**
   * 获取原始文件名（不包含扩展名）
   */
  private getOriginalFileName(): string {
    try {
      const uriStr = decodeURI(this.project.uri.toString());
      const nameWithoutExt = PathString.getFileNameFromPath(uriStr);
      return nameWithoutExt || "unnamed";
    } catch {
      return "unnamed";
    }
  }

  /**
   * 创建备份文件
   */
  private async createBackupFile(backupFilePath: string): Promise<void> {
    try {
      // 复制项目保存逻辑，但写入到备份文件路径
      const fileContent = await this.project.getFileContent();

      // 写入备份文件
      await writeFile(backupFilePath, fileContent);
      toast.success("自动备份成功");
    } catch (err) {
      toast.error("创建备份文件失败:" + err);
      throw err;
    }
  }

  /**
   * 管理备份文件数量，删除过旧的备份文件
   */
  private async manageBackupFiles(backupDir: string): Promise<void> {
    try {
      // 获取备份目录中的所有文件
      const files = await readDir(backupDir);

      // 过滤出.prg文件并获取文件信息
      const prgFiles = [];
      for (const file of files) {
        if (file.name.endsWith(".prg")) {
          try {
            const fileStat = await stat(await join(backupDir, file.name));
            prgFiles.push({
              name: file.name,
              mtime: fileStat.mtime,
            });
          } catch {
            // 忽略无法获取状态的文件
          }
        }
      }

      // 按修改时间排序（最新的在前）
      prgFiles.sort((a, b) => {
        const dateA = a.mtime ? new Date(a.mtime).getTime() : 0;
        const dateB = b.mtime ? new Date(b.mtime).getTime() : 0;
        return dateB - dateA;
      });

      // 获取设置的备份数量限制
      const maxBackupCount = Settings.autoBackupLimitCount;

      // 删除超出限制的旧备份
      if (prgFiles.length > maxBackupCount) {
        const filesToDelete = prgFiles.slice(maxBackupCount);
        for (const fileToDelete of filesToDelete) {
          try {
            await remove(await join(backupDir, fileToDelete.name));
          } catch (err) {
            toast.error(`删除旧备份文件 ${fileToDelete.name} 失败: ${err}`);
            // 继续尝试删除其他文件
          }
        }
      }
    } catch (err) {
      toast.error(`管理备份文件失败: ${err}`);
    }
  }
}
