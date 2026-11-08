import type { PrgMetadata } from "@/types/metadata";
import { createDefaultMetadata } from "@/types/metadata";
import { Decoder } from "@msgpack/msgpack";
import mime from "mime";
import { z } from "zod";
import { withProjectArchive } from "./persistence/project-archive";
import { parseProjectDocument } from "./persistence/project-document";
import { assertBoundedData, type TextGraphData } from "./persistence/text-graph";

export const LATEST_PROJECT_VERSION = "2.7.0";

type ProjectFileFields = {
  tags: string[];
  references: { sections: Record<string, string[]>; files: string[] };
  metadata: PrgMetadata;
  readme?: string;
};

export type ParsedProjectFile = ProjectFileFields &
  ({ format: "legacy"; serializedStageObjects: any[] } | { format: "json"; graph: TextGraphData });

function legacyVersion(value: string): bigint[] {
  if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error("PRG: invalid legacy metadata version");
  }
  return value.split(".").map(BigInt);
}

export function compareProjectVersions(version1: string, version2: string): number {
  const left = legacyVersion(version1);
  const right = legacyVersion(version2);
  for (let index = 0; index < left.length; index++) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

export function parseProjectFile(fileContent: Uint8Array, attachments: Map<string, Blob>): Promise<ParsedProjectFile>;
export function parseProjectFile(
  fileContent: Uint8Array,
  decoder: Decoder,
  attachments: Map<string, Blob>,
): Promise<ParsedProjectFile>;
export async function parseProjectFile(
  fileContent: Uint8Array,
  decoderOrAttachments: Decoder | Map<string, Blob>,
  legacyAttachments?: Map<string, Blob>,
): Promise<ParsedProjectFile> {
  const decoder = decoderOrAttachments instanceof Map ? new Decoder() : decoderOrAttachments;
  const attachments = decoderOrAttachments instanceof Map ? decoderOrAttachments : legacyAttachments!;
  return withProjectArchive(fileContent, async (entries, readEntry) => {
    const pending = new Map<string, Blob>();
    const text = async (entry: (typeof entries)[number]) =>
      new TextDecoder("utf-8", { fatal: true }).decode(await (await readEntry(entry)).arrayBuffer());
    const unpack = async (entry: (typeof entries)[number]): Promise<unknown> => {
      const value = decoder.decode(new Uint8Array(await (await readEntry(entry)).arrayBuffer()));
      assertBoundedData(value);
      return value;
    };
    const notes = entries.find(({ filename }) => filename === "README.md");
    const readme = notes ? await text(notes) : undefined;
    const jsonEntry = entries.find(({ filename }) => filename === "project.json");
    let result: ParsedProjectFile;
    if (jsonEntry) {
      const document = parseProjectDocument(JSON.parse(await text(jsonEntry)));
      const indexed = new Set(document.attachments.map(({ path }) => path));
      for (const attachment of document.attachments) {
        const entry = entries.find(({ filename }) => filename === attachment.path);
        if (!entry) throw new Error("PRG: missing indexed attachment");
        pending.set(attachment.id, new Blob([await readEntry(entry)], { type: attachment.type }));
      }
      if (entries.some(({ filename }) => filename.startsWith("attachments/") && !indexed.has(filename))) {
        throw new Error("PRG: unindexed attachment");
      }
      result = {
        format: "json",
        graph: document.graph,
        tags: document.tags,
        references: document.references,
        metadata: { version: document.version, extension: document.extension },
        readme,
      };
    } else {
      let serializedStageObjects: any[] = [];
      let tags: string[] = [];
      let references: ProjectFileFields["references"] = { sections: {}, files: [] };
      let metadata: PrgMetadata = createDefaultMetadata("2.0.0");
      for (const entry of entries) {
        if (entry.filename === "stage.msgpack") {
          const stage = await unpack(entry);
          if (!Array.isArray(stage)) throw new Error("PRG: stage must be an array");
          serializedStageObjects = stage;
        } else if (entry.filename === "tags.msgpack") {
          tags = z.array(z.string()).parse(await unpack(entry));
        } else if (entry.filename === "reference.msgpack") {
          references = z
            .object({ sections: z.record(z.string(), z.array(z.string())), files: z.array(z.string()) })
            .parse(await unpack(entry));
        } else if (entry.filename === "metadata.msgpack") {
          const parsed = z
            .object({
              version: z.string(),
              extension: z
                .object({
                  id: z.string(),
                  name: z.string(),
                  description: z.string(),
                  version: z.string(),
                  author: z.string(),
                })
                .optional(),
            })
            .safeParse(await unpack(entry));
          if (!parsed.success) throw new Error("PRG: invalid legacy metadata");
          legacyVersion(parsed.data.version);
          metadata = parsed.data;
        } else if (entry.filename.startsWith("attachments/")) {
          const match = /^attachments\/([a-zA-Z0-9-]+)\.([a-zA-Z0-9]+)$/.exec(entry.filename);
          if (!match) throw new Error("PRG: invalid attachment path");
          const [, id, extension] = match;
          if (pending.has(id)) throw new Error("PRG: duplicate attachment ID");
          pending.set(
            id,
            new Blob([await readEntry(entry)], { type: mime.getType(extension) || "application/octet-stream" }),
          );
        }
      }
      result = { format: "legacy", serializedStageObjects, tags, references, metadata, readme };
    }
    for (const [id, blob] of pending) attachments.set(id, blob);
    return result;
  });
}
