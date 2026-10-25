import { appCacheDir, join } from "@/platform/path";
import { exists, mkdir, readFile, remove, writeFile } from "@/platform/files";
import { BlobWriter, Uint8ArrayReader, ZipReader } from "@zip.js/zip.js";

/**
 * 工具函数，将输入字符串转换为sha256哈希值
 * @param input
 * @returns
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 获取缩略图整体缓存文件夹
 * @returns
 */
async function getPrgThumbnailCacheDir() {
  return await join(await appCacheDir(), "prg-thumbnail-cache-v1");
}

/**
 * 获取一个prg文件的缩略图缓存文件
 * 绝对路径 ==SHA256=> xxx   dir/xxx
 * @param fsPath
 * @returns
 */
async function getPrgThumbnailCachePath(fsPath: string) {
  const dir = await getPrgThumbnailCacheDir();
  const key = await sha256Hex(fsPath);
  return await join(dir, `${key}.png`);
}

/**
 * 从 PRG 文件（ZIP 格式）中提取 thumbnail.png，不加载整个项目。
 * @param fsPath PRG 文件的文件系统路径
 * @returns thumbnail PNG 的 Blob，如果不存在则返回 undefined
 */
export async function readPrgThumbnailBlob(fsPath: string): Promise<Blob | undefined> {
  const fileContent = await readFile(fsPath);
  const reader = new ZipReader(new Uint8ArrayReader(fileContent));
  const entries = await reader.getEntries();

  for (const entry of entries) {
    if (entry.filename === "thumbnail.png" && "getData" in entry && typeof entry.getData === "function") {
      const blob = await entry.getData(new BlobWriter("image/png"));
      await reader.close();
      return blob;
    }
  }

  await reader.close();
  return undefined;
}

/**
 * 根据prg文件绝对路径字符串，获取这个prg的缩略图缓存图片
 * @param fsPath
 * @returns
 */
export async function readCachedPrgThumbnail(fsPath: string): Promise<Blob | undefined> {
  const cachePath = await getPrgThumbnailCachePath(fsPath);
  if (!(await exists(cachePath))) return undefined;
  const content = await readFile(cachePath);
  return new Blob([content], { type: "image/png" });
}

/**
 * 传入一个prg文件路径，生成缓存缩略图文件 到对应缓存位置。
 * 如果图片已经存在，则不生成缩略图，什么也不做
 * @param fsPath prg文件路径
 * @returns
 */
export async function ensurePrgThumbnailCached(fsPath: string): Promise<void> {
  const cacheDir = await getPrgThumbnailCacheDir();
  if (!(await exists(cacheDir))) {
    await mkdir(cacheDir, { recursive: true });
  }

  const prgThumbnailCachedPath = await getPrgThumbnailCachePath(fsPath);
  if (await exists(prgThumbnailCachedPath)) return;

  const blob = await readPrgThumbnailBlob(fsPath);
  if (!blob) return;

  const buffer = await blob.arrayBuffer();
  await writeFile(prgThumbnailCachedPath, new Uint8Array(buffer));
}

export async function refreshPrgThumbnailCache(fsPath: string): Promise<"updated" | "removed" | "missing"> {
  const cacheDir = await getPrgThumbnailCacheDir();
  if (!(await exists(cacheDir))) {
    await mkdir(cacheDir, { recursive: true });
  }

  const cachePath = await getPrgThumbnailCachePath(fsPath);
  const blob = await readPrgThumbnailBlob(fsPath);

  if (!blob) {
    const hadCache = await exists(cachePath);
    if (hadCache) {
      await remove(cachePath);
    }
    return hadCache ? "removed" : "missing";
  }

  const buffer = await blob.arrayBuffer();
  await writeFile(cachePath, new Uint8Array(buffer));

  return "updated";
}
