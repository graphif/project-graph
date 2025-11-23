import { DirEntry, FileInfo } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";
import { FileSystemProviderDraft } from "./FileSystemProviderDraft";
import { FileSystemProviderFile } from "./FileSystemProviderFile";
import { FileSystemProviderTest } from "./FileSystemProviderTest";

export const fileSystemProviders: Record<string, new () => FileSystemProvider> = {
  file: FileSystemProviderFile,
  draft: FileSystemProviderDraft,
  test: FileSystemProviderTest,
};

export interface FileSystemProvider {
  read(uri: URI): Promise<Uint8Array>;
  readDir(uri: URI): Promise<DirEntry[]>;
  write(uri: URI, content: Uint8Array): Promise<URI | void>;
  remove(uri: URI): Promise<void>;
  exists(uri: URI): Promise<boolean>;
  mkdir(uri: URI): Promise<void>;
  rename(oldUri: URI, newUri: URI): Promise<void>;
  stat(uri: URI): Promise<FileInfo>;
}
