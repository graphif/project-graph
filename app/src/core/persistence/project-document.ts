import { compare, parse } from "semver";
import { z } from "zod";
import { assertBoundedData, parseTextGraph, textGraphDataSchema } from "./text-graph";

export function requireAppVersion(value: string): string {
  const parsed = parse(value);
  if (!parsed || `${parsed.version}${parsed.build.length ? `+${parsed.build.join(".")}` : ""}` !== value) {
    throw new Error("PRG: invalid application SemVer");
  }
  return value;
}

export function compareAppVersions(left: string, right: string): number {
  return compare(requireAppVersion(left), requireAppVersion(right));
}

const documentSchema = z.strictObject({
  format: z.literal("dev.graphif.prg"),
  version: z.string().max(256),
  graph: textGraphDataSchema,
  tags: z.array(z.string()),
  references: z.strictObject({
    sections: z.record(z.string(), z.array(z.string())),
    files: z.array(z.string()),
  }),
  extension: z
    .strictObject({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      version: z.string(),
      author: z.string(),
    })
    .optional(),
  attachments: z.array(
    z.strictObject({
      id: z
        .string()
        .regex(/^[a-zA-Z0-9-]+$/)
        .max(256),
      path: z.string(),
      type: z.string().min(1).max(256),
    }),
  ),
});

export type ProjectDocument = z.output<typeof documentSchema>;

export function parseProjectDocument(input: unknown): ProjectDocument {
  assertBoundedData(input);
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) throw new Error("PRG: invalid project document");
  const document = parsed.data;
  requireAppVersion(document.version);
  document.graph = parseTextGraph(document.graph);
  const ids = new Set<string>();
  for (const attachment of document.attachments) {
    if (ids.has(attachment.id)) throw new Error("PRG: duplicate attachment ID");
    ids.add(attachment.id);
    if (!new RegExp(`^attachments/${attachment.id}\\.[a-zA-Z0-9]+$`).test(attachment.path)) {
      throw new Error("PRG: invalid attachment index path");
    }
  }
  for (const object of document.graph.objects) {
    if ("attachmentId" in object && object.attachmentId && !ids.has(object.attachmentId)) {
      throw new Error("PRG: missing graph attachment");
    }
  }
  return document;
}
