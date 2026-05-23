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
    if (this.project.projectState === ProjectState.Unsaved) {
      this.project.save({ includeThumbnail: false });
    }
  }

  /**
   * 执行自动备份操作
   */
  private async autoBackup() {
    const currentHash = this.project.stageHash;
    if (currentHash === this.lastBackupHash) {
      return;
    }

    const strategy = Settings.autoBackupStrategy;

    // New strategies: backup near the original file
    if (strategy === "sideBySide" || strategy === "subfolder") {
      const ok = await this.localAutoBackup(strategy);
      if (ok) {
        this.lastBackupHash = currentHash;
      }
      return;
    }

    // Original default strategy with custom path fallback
    const primaryCustomPath = Settings.autoBackupCustomPath?.trim() ?? "";
    const secondaryCustomPath = Settings.autoBackupCustomPath2?.trim() ?? "";

    const candidates: Array<{ kind: "custom"; path: string } | { kind: "default" }> = [];
    if (primaryCustomPath) {
      candidates.push({ kind: "custom", path: primaryCustomPath });
    }
    if (secondaryCustomPath && secondaryCustomPath !== primaryCustomPath) {
      candidates.push({ kind: "custom", path: secondaryCustomPath });
    }
    candidates.push({ kind: "default" });

    for (const candidate of candidates) {
      const backupDir = await this.resolveAutoBackupDir(candidate);
      if (!backupDir) {
        continue;
      }
      const ok = await this.tryBackupToDir(backupDir);
      if (ok) {
        this.lastBackupHash = currentHash;
        await this.manageBackupFiles(backupDir);
        return;
      }
    }

    toast.error("自动备份失败：所有备份路径均不可用");
  }

  /**
   * Backup near the original file (sideBySide or subfolder strategy)
   */
  private async localAutoBackup(strategy: "sideBySide" | "subfolder"): Promise<boolean> {
    if (!this.project.uri || this.project.isDraft) {
      return false;
    }

    const uriStr = decodeURI(this.project.uri.toString());
    const dir = PathString.dirPath(uriStr);
    const fileName = PathString.getFileNameFromPath(uriStr);

    let backupDir: string;
    let backupFileName: string;

    if (strategy === "sideBySide") {
      // {filename}_backup_{timestamp}.prg in same folder
      backupDir = dir;
      backupFileName = `${fileName}_backup_${this.generateTimestamp()}.prg`;
    } else {
      // {filename}_backup/{timestamp}.prg
      backupDir = await join(dir, `${fileName}_backup`);
      backupFileName = `${this.generateTimestamp()}.prg`;
    }

    // Ensure backup dir exists (for subfolder)
    if (strategy === "subfolder" && !(await exists(backupDir))) {
      try {
        await mkdir(backupDir, { recursive: true });
      } catch (err) {
        toast.error(`创建备份子目录失败: ${err}`);
        return false;
      }
    }

    const backupFilePath = await join(backupDir, backupFileName);

    try {
      const fileContent = await this.project.getFileContent({ includeThumbnail: false });
      await writeFile(backupFilePath, fileContent);
      toast.success(`备份成功：${backupFilePath}`);
    } catch (err) {
      toast.error(`备份失败: ${err}`);
      return false;
    }

    // Manage old backup files with appropriate prefix filter
    if (strategy === "sideBySide") {
      await this.manageBackupFiles(backupDir, `${fileName}_backup_`);
    } else {
      await this.manageBackupFiles(backupDir);
    }
    return true;
  }

  public async manualBackup() {
    try {
      const backupDir = await join(await appCacheDir(), "manual-backup-v2");
      await this.backupCurrentProject(backupDir);
    } catch (err) {
      toast.error("备份过程中发生错误:" + err);
    }
  }

  private async resolveAutoBackupDir(
    candidate: { kind: "custom"; path: string } | { kind: "default" },
  ): Promise<string | null> {
    try {
      if (candidate.kind === "custom") {
        return await join(candidate.path, PathString.fileNameSafity(this.getOriginalFileName()));
      }
      return await join(await appCacheDir(), "auto-backup-v2", PathString.fileNameSafity(this.getOriginalFileName()));
    } catch (err) {
      toast.error(`生成备份路径失败: ${err}`);
      return null;
    }
  }

  private async tryBackupToDir(backupDir: string): Promise<boolean> {
    try {
      return await this.backupCurrentProject(backupDir);
    } catch {
      return false;
    }
  }

  private async backupCurrentProject(backupDir: string): Promise<boolean> {
    // 确保备份目录存在
    if (!(await exists(backupDir))) {
      try {
        // 创建备份目录（recursive: true 确保父目录也会被一并创建）
        await mkdir(backupDir, { recursive: true });
      } catch (err) {
        toast.error(`创建备份目录失败: ${err}`);
        return false;
      }
    }

    // 生成备份文件名
    const fileName = this.generateBackupFileName();
    const backupFilePath = await join(backupDir, fileName);

    // 创建备份文件
    await this.createBackupFile(backupFilePath);
    return true;
  }

  /**
   * 生成备份文件名
   */
  private generateBackupFileName(): string {
    const originalFileName = this.getOriginalFileName();
    return `${originalFileName}-${this.generateTimestamp()}.prg`;
  }

  /**
   * 生成时间戳字符串
   */
  private generateTimestamp(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
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
      const fileContent = await this.project.getFileContent({ includeThumbnail: false });

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
  private async manageBackupFiles(backupDir: string, prefix?: string): Promise<void> {
    try {
      // 获取备份目录中的所有文件
      const files = await readDir(backupDir);

      // 过滤出.prg文件并获取文件信息
      const prgFiles = [];
      for (const file of files) {
        if (file.name.endsWith(".prg") && (!prefix || file.name.startsWith(prefix))) {
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
