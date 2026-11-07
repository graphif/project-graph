import { encode } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { URI } from "vscode-uri";
import { FileSystemProvider } from "@/core/interfaces/Service";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async write(_uri: URI, _content: Uint8Array) {
    throw new Error("Draft Project must be saved with Project.save()");
  }
  async remove() {}
  async exists() {
    return false;
  }
  async mkdir() {}
  async rename() {}
}
