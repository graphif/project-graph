/**
 * 根据文件扩展名推断图标的 MIME 类型
 * 支持 png、jpg/jpeg、svg、webp
 */
export function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}
