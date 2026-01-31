import type { Project } from "@/core/Project";

/**
 * 导入器基类，包含共享的工具方法
 */
export abstract class BaseImporter {
  constructor(protected readonly project: Project) {}
}
