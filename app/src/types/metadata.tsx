/**
 * 项目文件的元数据
 * 存储在 .prg 文件的 metadata.msgpack 中
 * 用于版本管理、数据升级、文件信息记录等
 */
export interface ProjectMetadata {
  /**
   * 数据文件版本号（语义化版本格式，如 "2.0.0", "2.1.0"）
   * 用于判断是否需要数据升级
   * @required
   */
  version: string;

  // /**
  //  * 创建时使用的软件版本
  //  * 用于追踪文件是由哪个版本的软件创建的
  //  */
  // createdByVersion?: string;

  // /**
  //  * 最后修改时使用的软件版本
  //  * 用于追踪文件最后是由哪个版本的软件修改的
  //  */
  // lastModifiedByVersion?: string;

  // /**
  //  * 文件创建时间（ISO 8601 格式）
  //  * 用于记录文件的创建时间
  //  */
  // createdAt?: string;

  // /**
  //  * 最后修改时间（ISO 8601 格式）
  //  * 用于记录文件的最后修改时间
  //  */
  // lastModified?: string;

  // /**
  //  * 文件格式标识
  //  * 如果未来文件格式发生变化，可以用此字段标识
  //  * 例如: "prg-v1", "prg-v2"
  //  */
  // fileFormat?: string;

  // /**
  //  * 压缩算法
  //  * 如果未来支持多种压缩算法，可以用此字段标识
  //  * 例如: "none", "gzip", "brotli"
  //  */
  // compression?: string;

  // /**
  //  * 编码方式
  //  * 用于标识数据的编码方式
  //  * 例如: "utf-8", "utf-16"
  //  */
  // encoding?: string;

  // /**
  //  * 数据校验和
  //  * 用于验证数据完整性，防止文件损坏
  //  * 例如: MD5, SHA256 等
  //  */
  // checksum?: string;

  // /**
  //  * 使用的功能特性列表
  //  * 用于兼容性检查，标识文件使用了哪些特性
  //  * 例如: ["lineType", "customShapes", "plugins"]
  //  */
  // features?: string[];

  // /**
  //  * 最低要求的软件版本
  //  * 如果文件使用了某些新特性，可能需要特定版本的软件才能打开
  //  * 例如: "2.1.0"
  //  */
  // requiredVersion?: string;

  // /**
  //  * 作者信息
  //  * 文件的创建者或主要维护者
  //  */
  // author?: string;

  // /**
  //  * 文件描述
  //  * 对文件的简短描述
  //  */
  // description?: string;

  // /**
  //  * 文件标签（元数据层面）
  //  * 不同于项目内的 tags，这是文件本身的标签
  //  * 例如: ["template", "example", "archived"]
  //  */
  // fileTags?: string[];

  // /**
  //  * 许可证信息
  //  * 文件的许可证类型
  //  * 例如: "MIT", "CC-BY-4.0", "proprietary"
  //  */
  // license?: string;

  // /**
  //  * 迁移历史记录
  //  * 记录文件从哪些版本升级过，用于调试和追踪
  //  * 例如: ["2.0.0", "2.1.0"]
  //  */
  // migrationHistory?: string[];

  // /**
  //  * 自定义字段
  //  * 用于扩展，允许添加任意自定义字段
  //  * 键名建议使用命名空间，例如: "custom:myField"
  //  */
  // [key: `custom:${string}`]: any;
}

/**
 * 创建默认的 metadata 对象
 * @param version 版本号，默认为最新版本
 */
export function createDefaultMetadata(version: string = "2.0.0"): ProjectMetadata {
  return {
    version,
  };
}

/**
 * 验证 metadata 对象是否有效
 * @param metadata 待验证的 metadata
 * @returns 是否有效
 */
export function isValidMetadata(metadata: any): metadata is ProjectMetadata {
  return metadata && typeof metadata === "object" && typeof metadata.version === "string";
}

/**
 * 合并 metadata，保留所有字段
 * @param base 基础 metadata
 * @param updates 更新的字段
 * @returns 合并后的 metadata
 */
export function mergeMetadata(base: ProjectMetadata, updates: Partial<ProjectMetadata>): ProjectMetadata {
  return {
    ...base,
    ...updates,
  };
}
