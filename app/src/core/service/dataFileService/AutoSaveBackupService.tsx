import { Project, ProjectState, service } from "@/core/Project";
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

  private lastSaveTime = 0;

  constructor(private readonly project: Project) {
    this.lastBackupTime = Date.now();
  }

  /**
   * 高频率调用的tick函数，内部实现降频操作
   */
  tick() {
    const now = Date.now();

    // 检查是否达到备份间隔时间（转换为毫秒）
    if (Settings.autoBackup) {
      if (now - this.lastBackupTime >= Settings.autoBackupInterval * 1000) {
        this.lastBackupTime = now;
        this.autoBackup();
      }
    }
    if (Settings.autoSave) {
      if (now - this.lastSaveTime >= Settings.autoSaveInterval * 1000) {
        this.lastSaveTime = now;
        this.autoSave();
      }
    }
  }

  private async autoSave() {
    if (!this.project.uri || this.project.isDraft) {
      // 临时草稿先不备份
      return;
    }
    if (this.project.state === ProjectState.Unsaved) {
      this.project.save();
    }
  }

  /**
   * 执行自动备份操作
   */
  private async autoBackup() {
    try {
      const currentHash = this.project.stageHash;
      // 检查是否与上次备份有差异
      if (currentHash === this.lastBackupHash) {
        return;
      }

      // 确定备份目录路径
      let backupDir;

      // 检查是否设置了自定义备份路径
      if (Settings.autoBackupCustomPath) {
        try {
          // 使用自定义备份路径，为每个项目创建子目录
          backupDir = await join(Settings.autoBackupCustomPath, PathString.fileNameSafity(this.getOriginalFileName()));
          if (!(await exists(backupDir))) {
            try {
              await mkdir(backupDir, { recursive: true });
            } catch (err) {
              // 创建失败，显示错误提示并使用默认路径
              toast.error(`无法在自定义路径创建备份目录: ${err}`);
              // 重置为使用默认路径
              backupDir = await join(
                await appCacheDir(),
                "auto-backup-v2",
                PathString.fileNameSafity(this.getOriginalFileName()),
              );
            }
          }
        } catch (err) {
          // 使用自定义路径出错，回退到默认路径
          toast.error(`使用自定义备份路径出错: ${err}`);
          backupDir = await join(
            await appCacheDir(),
            "auto-backup-v2",
            PathString.fileNameSafity(this.getOriginalFileName()),
          );
        }
      } else {
        // 使用默认备份路径
        backupDir = await join(
          await appCacheDir(),
          "auto-backup-v2",
          PathString.fileNameSafity(this.getOriginalFileName()),
        );
      }

      await this.backupCurrentProject(backupDir);

      // 更新上次备份的哈希值
      this.lastBackupHash = currentHash;

      // 管理备份文件数量
      await this.manageBackupFiles(backupDir);
    } catch (err) {
      toast.error("自动备份过程中发生错误:" + err);
    }
  }

  public async manualBackup() {
    try {
      const backupDir = await join(await appCacheDir(), "manual-backup-v2");
      await this.backupCurrentProject(backupDir);
    } catch (err) {
      toast.error("备份过程中发生错误:" + err);
    }
  }

  private async backupCurrentProject(backupDir: string) {
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
    if (!this.project.uri || this.project.isDraft) {
      return "Draft";
    }
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
      toast.success(`备份成功：${backupFilePath}`);
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
