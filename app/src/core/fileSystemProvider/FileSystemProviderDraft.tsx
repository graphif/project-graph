import { encode } from "@msgpack/msgpack";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { URI } from "vscode-uri";
import { FileSystemProvider } from "@/core/interfaces/Service";
import { Project } from "@/core/Project";

export class FileSystemProviderDraft implements FileSystemProvider {
  constructor(private readonly project: Project) {}

  async read() {
    // 创建空白文件
    const encodedStage = encode([]);
    const uwriter = new Uint8ArrayWriter();
    const writer = new ZipWriter(uwriter);
    writer.add("stage.msgpack", new Uint8ArrayReader(encodedStage));
    writer.add("tags.msgpack", new Uint8ArrayReader(encode([])));
    await writer.close();
    const fileContent = await uwriter.getData();
    return fileContent;
  }
  async readDir() {
    return [];
  }
  async write(_uri: URI, content: Uint8Array) {
    // 先弹窗让用户选择路径
    const path = await save({
      title: "保存草稿",
      filters: [{ name: "Project Graph", extensions: ["prg"] }],
    });
    if (!path) {
      throw new Error("未选择路径");
    }
    const newUri = URI.file(path);
    await writeFile(newUri.fsPath, content);
    this.project.uri = newUri;
  }
  async remove() {}
  async exists() {
    return false;
  }
  async mkdir() {}
  async rename() {}
}
