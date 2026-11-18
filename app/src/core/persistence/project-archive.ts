import { Uint8ArrayReader, ZipReader, type FileEntry } from "@zip.js/zip.js";

export const PROJECT_ARCHIVE_LIMITS = Object.freeze({
  archiveBytes: 512 * 1024 * 1024,
  entries: 10_000,
  entryBytes: 256 * 1024 * 1024,
  structuredBytes: 64 * 1024 * 1024,
  totalBytes: 1024 * 1024 * 1024,
});

const structuredEntries = new Set([
  "stage.msgpack",
  "tags.msgpack",
  "reference.msgpack",
  "metadata.msgpack",
  "project.json",
  "README.md",
]);

export async function withProjectArchive<T>(
  content: Uint8Array,
  read: (entries: readonly FileEntry[], readEntry: (entry: FileEntry) => Promise<Blob>) => Promise<T>,
): Promise<T> {
  if (content.byteLength > PROJECT_ARCHIVE_LIMITS.archiveBytes) throw new Error("PRG: archive size limit exceeded");
  const reader = new ZipReader(new Uint8ArrayReader(content));
  try {
    const names = new Map<string, boolean>();
    const files: FileEntry[] = [];
    let declaredBytes = 0;
    let count = 0;
    for await (const entry of reader.getEntriesGenerator()) {
      if (++count > PROJECT_ARCHIVE_LIMITS.entries) throw new Error("PRG: entry count limit exceeded");
      const name = entry.filename;
      const path = entry.directory ? name.replace(/\/$/, "") : name;
      if (
        path.length === 0 ||
        path.length > 1024 ||
        /[\\:]/.test(path) ||
        [...path].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
        path.split("/").some((part) => !part || part === "." || part === ".." || part.trim() !== part)
      ) {
        throw new Error("PRG: unsafe entry name");
      }
      if (names.has(path)) throw new Error("PRG: duplicate or conflicting entry");
      names.set(path, entry.directory);
      if (entry.directory) continue;
      if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0) {
        throw new Error("PRG: invalid entry size");
      }
      const limit = structuredEntries.has(name)
        ? PROJECT_ARCHIVE_LIMITS.structuredBytes
        : PROJECT_ARCHIVE_LIMITS.entryBytes;
      if (entry.uncompressedSize > limit) throw new Error("PRG: entry size limit exceeded");
      declaredBytes += entry.uncompressedSize;
      if (declaredBytes > PROJECT_ARCHIVE_LIMITS.totalBytes) throw new Error("PRG: total size limit exceeded");
      files.push(entry);
    }
    for (const name of names.keys()) {
      const parts = name.split("/");
      for (let length = 1; length < parts.length; length++) {
        if (names.get(parts.slice(0, length).join("/")) === false) throw new Error("PRG: file/directory conflict");
      }
    }
    if (names.has("project.json")) {
      if (["stage.msgpack", "tags.msgpack", "reference.msgpack", "metadata.msgpack"].some((name) => names.has(name))) {
        throw new Error("PRG: conflicting JSON and legacy entries");
      }
      if (names.get("project.json")) throw new Error("PRG: project.json must be a file");
    } else if (!files.some(({ filename }) => filename === "stage.msgpack")) {
      throw new Error("PRG: missing stage.msgpack or project.json");
    }

    let actualBytes = 0;
    const readEntries = new Set<FileEntry>();
    return await read(files, async (entry) => {
      if (!files.includes(entry) || readEntries.has(entry)) throw new Error("PRG: invalid repeated entry read");
      readEntries.add(entry);
      const limit = structuredEntries.has(entry.filename)
        ? PROJECT_ARCHIVE_LIMITS.structuredBytes
        : PROJECT_ARCHIVE_LIMITS.entryBytes;
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let size = 0;
      await entry.getData(
        new WritableStream<Uint8Array>({
          write(chunk) {
            size += chunk.byteLength;
            actualBytes += chunk.byteLength;
            if (size > limit || size > entry.uncompressedSize || actualBytes > PROJECT_ARCHIVE_LIMITS.totalBytes) {
              throw new Error("PRG: decompressed size limit exceeded");
            }
            chunks.push(new Uint8Array(chunk));
          },
        }),
        { checkSignature: true },
      );
      if (size !== entry.uncompressedSize) throw new Error("PRG: decompressed size mismatch");
      return new Blob(chunks);
    });
  } finally {
    await reader.close();
  }
}
