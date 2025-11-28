import { Dialog } from "@/components/ui/dialog";
import { FileSystemProvider, fileSystemProviders } from "@/core/fs";
import { encode } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { URI } from "vscode-uri";

export class FileSystemProviderDraft implements FileSystemProvider {
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
    const newUri = await Dialog.file("保存文件", "save", ["prg"]);
    if (!newUri) {
      throw new Error("未选择路径");
    }
    const fs = new fileSystemProviders[newUri.scheme]();
    await fs.write(newUri, content);
    return newUri;
  }
  async remove() {}
  async exists() {
    return false;
  }
  async mkdir() {}
  async rename() {}
  async stat() {
    return {
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      size: 1024,
      mtime: new Date(),
      atime: new Date(),
      birthtime: new Date(),
      readonly: false,
      fileId: 12345,
      dev: 2049,
      ino: 12345678,
      mode: 33188,
      nlink: 1,
      uid: 501,
      gid: 20,
      rdev: 0,
      blksize: 4096,
      blocks: 8,
      fileAttributes: 0,
    };
  }
}
