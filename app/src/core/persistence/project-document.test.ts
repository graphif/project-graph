import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { describe, expect, it } from "vitest";
import { appVersion } from "../../../mygo.config";
import { parseProjectFile } from "../project-file";
import { compareAppVersions, parseProjectDocument, requireAppVersion } from "./project-document";
import { writeProjectFile } from "./write-project-file";

function document(version = appVersion) {
  return {
    format: "dev.graphif.prg" as const,
    version,
    graph: { objects: [], order: [] },
    tags: ["test"],
    references: { sections: {}, files: ["other.prg"] },
    extension: { id: "test", name: "Example", description: "", version: "1.0.0", author: "Test" },
  };
}

async function archive(json: unknown, entries: [string, Uint8Array][] = []) {
  const output = new Uint8ArrayWriter();
  const writer = new ZipWriter(output);
  await writer.add("project.json", new Uint8ArrayReader(new TextEncoder().encode(JSON.stringify(json))));
  for (const [name, bytes] of entries) await writer.add(name, new Uint8ArrayReader(bytes));
  await writer.close();
  return output.getData();
}

describe("application version envelope", () => {
  it.each(["4.2.6-alpha1", "4.2.6-alpha.10+build.007", "4.2.6+build.42", "4.3.0"])("preserves %s", (version) => {
    expect(requireAppVersion(version)).toBe(version);
  });
  it.each(["", "v4.2.6", " 4.2.6", "4.2.6\n", "04.2.6", "4.2", "4.2.6-alpha.01", "4.2.6+"])("rejects %j", (version) => {
    expect(() => requireAppVersion(version)).toThrow("SemVer");
  });
  it("compares prereleases numerically and ignores build metadata", () => {
    expect(compareAppVersions("4.2.6-alpha.10", "4.2.6-alpha.2")).toBe(1);
    expect(compareAppVersions("4.2.6-alpha1", "4.2.6")).toBe(-1);
    expect(compareAppVersions("4.2.6+one", "4.2.6+two")).toBe(0);
    expect(compareAppVersions("4.2.7", "4.2.6")).toBe(1);
  });
});

describe("JSON PRG container", () => {
  it("writes Deflate JSON, preserves metadata, notes and binary attachments, and reopens", async () => {
    const attachments = new Map([["image", new Blob([new Uint8Array([0, 255, 32])], { type: "image/png" })]]);
    const bytes = await writeProjectFile(document(), attachments, "Notes: 中文");
    const reader = new ZipReader(new Uint8ArrayReader(bytes));
    try {
      const entries = await reader.getEntries();
      expect(entries.map(({ filename }) => filename)).toEqual(["project.json", "README.md", "attachments/image.png"]);
      expect(entries[0].compressionMethod).toBe(8);
    } finally {
      await reader.close();
    }
    const loaded = new Map<string, Blob>();
    expect(await parseProjectFile(bytes, loaded)).toMatchObject({
      format: "json",
      graph: document().graph,
      tags: ["test"],
      metadata: { version: appVersion, extension: document().extension },
      readme: "Notes: 中文",
      references: document().references,
    });
    expect(loaded.get("image")?.type).toBe("image/png");
    expect(new Uint8Array(await loaded.get("image")!.arrayBuffer())).toEqual(new Uint8Array([0, 255, 32]));
  });

  it("does not require a schema migration for application patch versions", async () => {
    for (const version of ["4.2.6-alpha1", "4.2.6", "4.2.7+patch"]) {
      const parsed = await parseProjectFile(await writeProjectFile(document(version), new Map()), new Map());
      expect(parsed.metadata.version).toBe(version);
    }
  });

  it.each([
    [{ id: "image", path: "attachments/../image.png", type: "image/png" }],
    [{ id: "image", path: "attachments/other.png", type: "image/png" }],
    [
      { id: "image", path: "attachments/image.png", type: "image/png" },
      { id: "image", path: "attachments/image.jpg", type: "image/jpeg" },
    ],
  ])("rejects invalid attachment indexes (%j)", (...attachments) => {
    expect(() => parseProjectDocument({ ...document(), attachments })).toThrow();
  });

  it("requires all indexed bytes, rejects unindexed attachments, and does not commit partial results", async () => {
    const input = { ...document(), attachments: [{ id: "image", path: "attachments/image.png", type: "image/png" }] };
    const old = new Blob(["old"]);
    const loaded = new Map([["existing", old]]);
    await expect(parseProjectFile(await archive(input), loaded)).rejects.toThrow("missing indexed attachment");
    await expect(
      parseProjectFile(
        await archive({ ...document(), attachments: [] }, [["attachments/image.png", new Uint8Array()]]),
        loaded,
      ),
    ).rejects.toThrow("unindexed");
    await expect(
      parseProjectFile(
        await archive(input, [
          ["attachments/image.png", new Uint8Array()],
          ["README.md", new Uint8Array([255])],
        ]),
        loaded,
      ),
    ).rejects.toThrow();
    expect([...loaded]).toEqual([["existing", old]]);
  });

  it("checks graph identity, attachment references and JSON-only values before writing", async () => {
    await expect(
      writeProjectFile({ ...document(), graph: { objects: [], order: ["missing"] } }, new Map()),
    ).rejects.toThrow("missing object");
    const input = {
      ...document(),
      attachments: [],
      graph: {
        order: ["image"],
        objects: [
          {
            kind: "image-node",
            id: "image",
            rectangle: { location: { x: 0, y: 0 }, size: { x: 10, y: 10 } },
            attachmentId: "missing",
          },
        ],
      },
    };
    expect(() => parseProjectDocument(input)).toThrow("missing graph attachment");
    expect(() => parseProjectDocument({ ...document(), attachments: [], extra: Infinity })).toThrow();
  });
});
