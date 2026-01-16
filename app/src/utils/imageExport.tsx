import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { exists, writeFile } from "@tauri-apps/plugin-fs";
import mime from "mime";

/**
 * 将选中的图片节点导出到项目目录
 * @param imageNodes 要导出的图片节点数组
 * @param projectPath 项目文件路径（.prg 文件的完整路径）
 * @param attachments 附件存储（用于获取图片 Blob）
 * @param fileName 用户输入的文件名（不含扩展名）
 * @returns 导出结果（成功数量、失败数量）
 */
export async function exportImagesToProjectDirectory(
  imageNodes: ImageNode[],
  projectPath: string,
  attachments: Map<string, Blob>,
  fileName: string,
): Promise<{ successCount: number; failedCount: number }> {
  const isBatch = imageNodes.length > 1;
  let successCount = 0;
  let failedCount = 0;

  // 获取当前 prg 文件所在目录
  const projectDir = projectPath.substring(0, projectPath.lastIndexOf("/"));

  for (let i = 0; i < imageNodes.length; i++) {
    const imageNode = imageNodes[i];

    try {
      // 获取图片 Blob
      const blob = attachments.get(imageNode.attachmentId);
      if (!blob) {
        console.warn(`跳过：无法找到图片 ${i + 1} 的数据`);
        failedCount++;
        continue;
      }

      // 从 Blob type 推断扩展名
      const ext = mime.getExtension(blob.type) || "png";

      // 构建文件名：如果是批量导出，添加数字后缀
      const finalFileName = isBatch ? `${fileName}_${i + 1}` : fileName;
      const saveFilePath = `${projectDir}/${finalFileName}.${ext}`;

      // 检查文件是否已存在
      const fileExists = await exists(saveFilePath);
      if (fileExists) {
        console.warn(`跳过：文件已存在 ${finalFileName}.${ext}`);
        failedCount++;
        continue;
      }

      // 将 Blob 转换为 Uint8Array
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 保存图片
      await writeFile(saveFilePath, uint8Array);
      successCount++;
    } catch (error) {
      console.error(`保存图片 ${i + 1} 失败:`, error);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}
