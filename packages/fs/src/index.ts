import { URI } from "vscode-uri";

export interface DirEntry {
  /** The name of the entry (file name with extension or directory name) */
  name: string;
  /** Specifies whether this entry is a directory or not */
  isDirectory: boolean;
  /** Specifies whether this entry is a file or not */
  isFile: boolean;
  /** Specifies whether this entry is a symlink or not */
  isSymlink: boolean;
}

export interface FileInfo {
  /**
   * True if this is info for a regular file. Mutually exclusive to
   * `FileInfo.isDirectory` and `FileInfo.isSymlink`.
   */
  isFile: boolean;
  /**
   * True if this is info for a regular directory. Mutually exclusive to
   * `FileInfo.isFile` and `FileInfo.isSymlink`.
   */
  isDirectory: boolean;
  /**
   * True if this is info for a symlink. Mutually exclusive to
   * `FileInfo.isFile` and `FileInfo.isDirectory`.
   */
  isSymlink: boolean;
  /** The size of the file, in bytes */
  size: number;
  /**
   * The last modification time of the file. This corresponds to the `mtime`
   * field from `stat` on Linux/Mac OS and `ftLastWriteTime` on Windows. This
   * may not be available on all platforms.
   */
  mtime?: Date;
  /**
   * The last access time of the file. This corresponds to the `atime`
   * field from `stat` on Unix and `ftLastAccessTime` on Windows. This may not
   * be available on all platforms.
   */
  atime?: Date;
  /**
   * The creation time of the file. This corresponds to the `birthtime`
   * field from `stat` on Mac/BSD and `ftCreationTime` on Windows. This may
   * not be available on all platforms.
   */
  birthtime?: Date;
  /** Whether this is a readonly (unwritable) file */
  readonly: boolean;
  /**
   * This field contains the file system attribute information for a file
   * or directory. For possible values and their descriptions, see
   * {@link https://docs.microsoft.com/en-us/windows/win32/fileio/file-attribute-constants | File Attribute Constants} in the Windows Dev Center
   */
  fileAttributes?: number;
  /** ID of the device containing the file */
  dev?: number;
  /** Inode number */
  ino?: number;
  /** The underlying raw `st_mode` bits that contain the standard Unix permissions for this file/directory */
  mode?: number;
  /** Number of hard links pointing to this file */
  nlink?: number;
  /** User ID of the owner of this file */
  uid?: number;
  /** Group ID of the owner of this file */
  gid?: number;
  /** Device ID of this file */
  rdev?: number;
  /** Blocksize for filesystem I/O */
  blksize?: number;
  /** Number of blocks allocated to the file, in 512-byte units */
  blocks?: number;
}

export interface FsProvider {
  /**
   * `cat`
   * Reads the content of a file at the given URI.
   */
  read(uri: URI): Promise<Uint8Array>;
  /**
   * `ls`
   * Reads the contents of a directory at the given URI.
   */
  readDir(uri: URI): Promise<DirEntry[]>;
  /**
   * `>`
   * Writes content to a file at the given URI.
   * Returns a new URI if the file was wrote to a different location.
   */
  write(uri: URI, content: Uint8Array): Promise<URI | void>;
  /**
   * `rm`
   * Removes a file or directory at the given URI.
   */
  remove(uri: URI): Promise<void>;
  /**
   * `test -e`
   * Checks if a file or directory exists at the given URI.
   */
  exists(uri: URI): Promise<boolean>;
  /**
   * `mkdir`
   * Creates a new directory at the given URI.
   */
  mkdir(uri: URI): Promise<void>;
  /**
   * `mv`
   * Renames or moves a file or directory from oldUri to newUri.
   */
  rename(oldUri: URI, newUri: URI): Promise<void>;
  /**
   * `stat`
   * Retrieves information about a file or directory at the given URI.
   */
  stat(uri: URI): Promise<FileInfo>;
}

export interface FsProviderConstructor<A extends unknown[] = []> {
  schemes: string[];
  new (...args: A): FsProvider;
}

class Fs implements FsProvider {
  providers: Map<string, FsProvider> = new Map();

  use<A extends unknown[]>(Provider: FsProviderConstructor<A>, ...args: A) {
    const schemes = Provider.schemes;
    const provider = new Provider(...args);
    for (const scheme of schemes) {
      this.providers.set(scheme, provider);
    }
    return this;
  }

  getProvider(scheme: string): FsProvider | undefined {
    return this.providers.get(scheme);
  }
  getProviderOrThrow(scheme: string): FsProvider {
    const provider = this.getProvider(scheme);
    if (!provider) {
      throw new Error(`No provider for scheme: ${scheme}`);
    }
    return provider;
  }

  read(uri: URI): Promise<Uint8Array> {
    return this.getProviderOrThrow(uri.scheme).read(uri);
  }
  readDir(uri: URI): Promise<DirEntry[]> {
    return this.getProviderOrThrow(uri.scheme).readDir(uri);
  }
  write(uri: URI, content: Uint8Array): Promise<URI | void> {
    return this.getProviderOrThrow(uri.scheme).write(uri, content);
  }
  remove(uri: URI): Promise<void> {
    return this.getProviderOrThrow(uri.scheme).remove(uri);
  }
  exists(uri: URI): Promise<boolean> {
    return this.getProviderOrThrow(uri.scheme).exists(uri);
  }
  mkdir(uri: URI): Promise<void> {
    return this.getProviderOrThrow(uri.scheme).mkdir(uri);
  }
  async rename(oldUri: URI, newUri: URI): Promise<void> {
    if (oldUri.scheme !== newUri.scheme) {
      // First copy, then remove
      const content = await this.read(oldUri);
      const writeResult = await this.write(newUri, content);
      await this.remove(oldUri);
      if (writeResult && writeResult.toString() !== newUri.toString()) {
        console.warn(`Warning: Renamed URI differs from target URI: ${writeResult.toString()} vs ${newUri.toString()}`);
      }
      return;
    }
    return await this.getProviderOrThrow(oldUri.scheme).rename(oldUri, newUri);
  }
  stat(uri: URI): Promise<FileInfo> {
    return this.getProviderOrThrow(uri.scheme).stat(uri);
  }
}

export function createFs(): Fs {
  return new Fs();
}
