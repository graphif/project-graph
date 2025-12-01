import { DirEntry } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";

export interface Service {
  tick?(): void;
  dispose?(): void | Promise<void>;
}

export interface FileSystemProvider {
  read(uri: URI): Promise<Uint8Array>;
  /**
   * 可选方法：直接读取文件为 Blob 对象，避免一次性加载整个文件到内存
   */
  readAsBlob?(uri: URI): Promise<Blob>;
  readDir(uri: URI): Promise<DirEntry[]>;
  write(uri: URI, content: Uint8Array): Promise<void>;
  remove(uri: URI): Promise<void>;
  exists(uri: URI): Promise<boolean>;
  mkdir(uri: URI): Promise<void>;
  rename(oldUri: URI, newUri: URI): Promise<void>;
}
