import { DirEntry, FileInfo } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";
import { FileSystemProviderDraft } from "./FileSystemProviderDraft";
import { FileSystemProviderFile } from "./FileSystemProviderFile";
import { FileSystemProviderHttp } from "./FileSystemProviderHttp";
import { FileSystemProviderTest } from "./FileSystemProviderTest";

export const fileSystemProviders: Record<string, new () => FileSystemProvider> = {
  test: FileSystemProviderTest,
  file: FileSystemProviderFile,
  draft: FileSystemProviderDraft,
  http: FileSystemProviderHttp,
  https: FileSystemProviderHttp,
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

export class DynamicFileSystemProvider implements FileSystemProvider {
  private providerCache: Map<string, FileSystemProvider> = new Map();
  private getProvider(uri: URI): FileSystemProvider {
    const scheme = uri.scheme;
    if (!this.providerCache.has(scheme)) {
      const ProviderClass = fileSystemProviders[scheme];
      if (!ProviderClass) {
        throw new Error(`No file system provider found for scheme: ${scheme}`);
      }
      this.providerCache.set(scheme, new ProviderClass());
    }
    return this.providerCache.get(scheme)!;
  }

  read(uri: URI) {
    return this.getProvider(uri).read(uri);
  }
  readDir(uri: URI) {
    return this.getProvider(uri).readDir(uri);
  }
  write(uri: URI, content: Uint8Array) {
    return this.getProvider(uri).write(uri, content);
  }
  remove(uri: URI) {
    return this.getProvider(uri).remove(uri);
  }
  exists(uri: URI) {
    return this.getProvider(uri).exists(uri);
  }
  mkdir(uri: URI) {
    return this.getProvider(uri).mkdir(uri);
  }
  rename(oldUri: URI, newUri: URI) {
    return this.getProvider(oldUri).rename(oldUri, newUri);
  }
  stat(uri: URI) {
    return this.getProvider(uri).stat(uri);
  }
}

export const fs = new DynamicFileSystemProvider();
