import type { PrgMetadata } from "@/types/metadata";
import { createDefaultMetadata, isValidMetadata } from "@/types/metadata";
import type { Decoder } from "@msgpack/msgpack";
import { BlobWriter, Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import mime from "mime";

export const LATEST_PROJECT_VERSION = "2.7.0";

export type ParsedProjectFile = {
  serializedStageObjects: any[];
  tags: string[];
  references: { sections: Record<string, string[]>; files: string[] };
  metadata: PrgMetadata;
  readme?: string;
};

export function compareProjectVersions(version1: string, version2: string): number {
  const version1Parts = version1.split(".").map(Number);
  const version2Parts = version2.split(".").map(Number);
  const maxLength = Math.max(version1Parts.length, version2Parts.length);

  for (let index = 0; index < maxLength; index++) {
    const version1Part = version1Parts[index] || 0;
    const version2Part = version2Parts[index] || 0;
    if (version1Part < version2Part) return -1;
    if (version1Part > version2Part) return 1;
  }
  return 0;
}

export async function parseProjectFile(
  fileContent: Uint8Array,
  decoder: Decoder,
  attachments: Map<string, Blob>,
): Promise<ParsedProjectFile> {
  const reader = new ZipReader(new Uint8ArrayReader(fileContent));
  const entries = await reader.getEntries();

  let serializedStageObjects: any[] = [];
  let tags: string[] = [];
  let references: { sections: Record<string, string[]>; files: string[] } = { sections: {}, files: [] };
  let metadata: PrgMetadata = createDefaultMetadata("2.0.0");
  let readme: string | undefined;

  for (const entry of entries) {
    if (entry.directory) continue;
    if (entry.filename === "stage.msgpack") {
      const stageRawData = await entry.getData!(new Uint8ArrayWriter());
      serializedStageObjects = decoder.decode(stageRawData) as any[];
    } else if (entry.filename === "tags.msgpack") {
      const tagsRawData = await entry.getData!(new Uint8ArrayWriter());
      tags = decoder.decode(tagsRawData) as string[];
    } else if (entry.filename === "reference.msgpack") {
      const referenceRawData = await entry.getData!(new Uint8ArrayWriter());
      references = decoder.decode(referenceRawData) as { sections: Record<string, string[]>; files: string[] };
    } else if (entry.filename === "metadata.msgpack") {
      const metadataRawData = await entry.getData!(new Uint8ArrayWriter());
      const decodedMetadata = decoder.decode(metadataRawData);
      metadata = isValidMetadata(decodedMetadata) ? decodedMetadata : createDefaultMetadata("2.0.0");
    } else if (entry.filename === "README.md") {
      const readmeRawData = await entry.getData!(new Uint8ArrayWriter());
      readme = new TextDecoder().decode(readmeRawData);
    } else if (entry.filename.startsWith("attachments/")) {
      const match = entry.filename.trim().match(/^attachments\/([a-zA-Z0-9-]+)\.([a-zA-Z0-9]+)$/);
      if (!match) {
        console.warn("[Project] 附件文件名不符合规范: %s", entry.filename);
        continue;
      }
      const [, uuid, extension] = match;
      const type = mime.getType(extension) || "application/octet-stream";
      attachments.set(uuid, await entry.getData!(new BlobWriter(type)));
    }
  }

  return { serializedStageObjects, tags, references, metadata, readme };
}
