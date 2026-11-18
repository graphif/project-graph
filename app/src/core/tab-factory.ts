import { Uint8ArrayReader, ZipReader } from "@zip.js/zip.js";
import { URI } from "vscode-uri";
import { Project } from "./project";
import { Extension } from "./extension/extension";
import { FileSystemProvider } from "./interfaces/service";

export namespace TabFactory {
  export async function create(uri: URI, fs: FileSystemProvider): Promise<Project | Extension> {
    const content = await fs.read(uri);
    const reader = new ZipReader(new Uint8ArrayReader(content));
    const entries = await reader.getEntries();
    const filenames = entries.map((e) => e.filename);

    if (filenames.includes("stage.msgpack")) {
      return new Project(uri);
    } else if (filenames.includes("extension.js")) {
      return new Extension(uri);
    }

    // 默认为 Project 以保持兼容性，或者抛出错误
    return new Project(uri);
  }
}
