import { BlobReader, Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import mime from "mime";
import { parseProjectDocument, type ProjectDocument } from "./project-document";
import { PROJECT_ARCHIVE_LIMITS } from "./project-archive";

export async function writeProjectFile(
  input: Omit<ProjectDocument, "attachments">,
  attachments: ReadonlyMap<string, Blob>,
  readme?: string,
  thumbnail?: Blob,
): Promise<Uint8Array> {
  const document = parseProjectDocument({
    ...input,
    attachments: [...attachments].map(([id, blob]) => ({
      id,
      path: `attachments/${id}.${mime.getExtension(blob.type) || "bin"}`,
      type: blob.type || "application/octet-stream",
    })),
  });
  const json = new TextEncoder().encode(JSON.stringify(document));
  const notes = readme === undefined ? undefined : new TextEncoder().encode(readme);
  if (
    json.byteLength > PROJECT_ARCHIVE_LIMITS.structuredBytes ||
    (notes?.byteLength ?? 0) > PROJECT_ARCHIVE_LIMITS.structuredBytes
  ) {
    throw new Error("PRG: structured data size limit exceeded");
  }
  const entryCount = 1 + attachments.size + Number(notes !== undefined) + Number(thumbnail !== undefined);
  if (entryCount > PROJECT_ARCHIVE_LIMITS.entries) throw new Error("PRG: entry count limit exceeded");
  let total = json.byteLength + (notes?.byteLength ?? 0);
  for (const blob of [...attachments.values(), ...(thumbnail ? [thumbnail] : [])]) {
    if (blob.size > PROJECT_ARCHIVE_LIMITS.entryBytes) throw new Error("PRG: entry size limit exceeded");
    total += blob.size;
  }
  if (total > PROJECT_ARCHIVE_LIMITS.totalBytes) throw new Error("PRG: total size limit exceeded");
  const output = new Uint8ArrayWriter();
  const writer = new ZipWriter(output, { level: 6 });
  await writer.add("project.json", new Uint8ArrayReader(json));
  if (notes) await writer.add("README.md", new Uint8ArrayReader(notes));
  for (const attachment of document.attachments) {
    await writer.add(attachment.path, new BlobReader(attachments.get(attachment.id)!), { level: 0 });
  }
  if (thumbnail) await writer.add("thumbnail.png", new BlobReader(thumbnail), { level: 0 });
  await writer.close();
  const bytes = await output.getData();
  if (bytes.byteLength > PROJECT_ARCHIVE_LIMITS.archiveBytes) throw new Error("PRG: archive size limit exceeded");
  return bytes;
}
