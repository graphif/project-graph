/**
 * 扩展（插件）的元数据
 */
export interface ExtensionMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string; // 格式: "name <email>"
}

/**
 * .prg 文件的元数据
 * 存储在 .prg 文件的 metadata.msgpack 中
 * 用于版本管理、数据升级、文件信息记录等
 */
export interface PrgMetadata {
  /**
   * 数据文件版本号（语义化版本格式，如 "2.0.0", "2.1.0"）
   * 用于判断是否需要数据升级
   * @required
   */
  version: string;

  /**
   * 扩展（插件）元数据，如果是插件类型的prg则包含此字段
   */
  extension?: ExtensionMetadata;
}

/**
 * 创建默认的 metadata 对象
 * @param version 版本号，默认为最新版本
 */
export function createDefaultMetadata(version: string = "2.0.0"): PrgMetadata {
  return {
    version,
  };
}

/**
 * 验证 metadata 对象是否有效
 * @param metadata 待验证的 metadata
 * @returns 是否有效
 */
export function isValidMetadata(metadata: any): metadata is PrgMetadata {
  return metadata && typeof metadata === "object" && typeof metadata.version === "string";
}

/**
 * 合并 metadata，保留所有字段
 * @param base 基础 metadata
 * @param updates 更新的字段
 * @returns 合并后的 metadata
 */
export function mergeMetadata(base: PrgMetadata, updates: Partial<PrgMetadata>): PrgMetadata {
  return {
    ...base,
    ...updates,
  };
}
