import { FileSystemProvider } from "@/core/fileSystemProvider";

export class FileSystemProviderTest implements FileSystemProvider {
  async read() {
    return new Uint8Array();
  }
  async readDir() {
    return [
      {
        name: "test1.txt",
        isDirectory: false,
        isFile: true,
        isSymlink: false,
      },
    ];
  }
  async write() {}
  async remove() {}
  async exists() {
    return true;
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
