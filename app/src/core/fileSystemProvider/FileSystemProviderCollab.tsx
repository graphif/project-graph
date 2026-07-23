import { FileSystemProvider } from "@/core/interfaces/Service";
import type { Project } from "@/core/Project";
import { encode } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import type { URI } from "vscode-uri";

/**
 * 协作会话使用 collab: 协议。本地不持久化到磁盘；
 * 保存操作提示用户另存为本地文件。
 */
export class FileSystemProviderCollab implements FileSystemProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_project: Project) {}

  async read() {
    const encodedStage = encode([]);
    const uwriter = new Uint8ArrayWriter();
    const writer = new ZipWriter(uwriter);
    await writer.add("stage.msgpack", new Uint8ArrayReader(encodedStage));
    await writer.add("tags.msgpack", new Uint8ArrayReader(encode([])));
    await writer.close();
    return await uwriter.getData();
  }

  async readDir() {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async write(_uri: URI, _content: Uint8Array) {
    throw new Error("协作会话请使用「另存为」保存到本地文件");
  }

  async remove() {}

  async exists() {
    // 加入房间时状态由服务端注入，不走本地文件加载
    return false;
  }

  async mkdir() {}
  async rename() {}
}
