import { encode } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { describe, expect, it } from "vitest";
import { compareProjectVersions, parseProjectFile } from "./project-file";
import { PROJECT_ARCHIVE_LIMITS } from "./persistence/project-archive";

async function archive(entries: [string, Uint8Array][], level: 0 | 6 = 0): Promise<Uint8Array> {
  const output = new Uint8ArrayWriter();
  const writer = new ZipWriter(output, { level });
  for (const [name, data] of entries) await writer.add(name, new Uint8ArrayReader(data));
  await writer.close();
  return output.getData();
}

function parse(bytes: Uint8Array, attachments = new Map<string, Blob>()) {
  return parseProjectFile(bytes, attachments);
}

function replaceAscii(bytes: Uint8Array, from: string, to: string) {
  if (from.length !== to.length) throw new Error("fixture replacement must preserve size");
  const source = new TextEncoder().encode(from);
  const replacement = new TextEncoder().encode(to);
  for (let offset = 0; offset <= bytes.length - source.length; offset++) {
    if (source.every((byte, index) => bytes[offset + index] === byte)) bytes.set(replacement, offset);
  }
}

describe("PRG archive trust boundary", () => {
  it.each([0, 6] as const)(
    "reads legacy level %s and commits attachments only after successful parse",
    async (level) => {
      const attachments = new Map<string, Blob>();
      const result = await parse(
        await archive(
          [
            ["stage.msgpack", encode([])],
            ["metadata.msgpack", encode({ version: "2.7.0" })],
            ["tags.msgpack", encode(["tag"])],
            ["reference.msgpack", encode({ sections: { section: ["ref"] }, files: ["file.prg"] })],
            ["README.md", new TextEncoder().encode("Project notes")],
            ["attachments/image.png", new Uint8Array([1, 2, 3])],
          ],
          level,
        ),
        attachments,
      );
      expect(result).toMatchObject({
        serializedStageObjects: [],
        tags: ["tag"],
        metadata: { version: "2.7.0" },
        readme: "Project notes",
        references: { sections: { section: ["ref"] }, files: ["file.prg"] },
      });
      expect(attachments.get("image")?.type).toBe("image/png");
      expect(new Uint8Array(await attachments.get("image")!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    },
  );

  it("retains the metadata-less historical 2.0.0 container interpretation", async () => {
    expect((await parse(await archive([["stage.msgpack", encode([])]]))).metadata.version).toBe("2.0.0");
  });

  it.each(["", "garbage", "2", "2.7", "2.7.NaN", "02.7.0", "2.7.0 ", "2.7.0\n", "2.7.0-alpha1"])(
    "rejects invalid legacy schema version %s instead of treating it as current",
    async (version) => {
      await expect(
        parse(
          await archive([
            ["stage.msgpack", encode([])],
            ["metadata.msgpack", encode({ version })],
          ]),
        ),
      ).rejects.toThrow("invalid legacy metadata");
      expect(() => compareProjectVersions(version, "2.7.0")).toThrow();
    },
  );

  it("compares numeric legacy versions without lexicographic or floating point rounding", () => {
    expect(compareProjectVersions("2.10.0", "2.9.0")).toBe(1);
    expect(compareProjectVersions("2.7.0", "2.7.0")).toBe(0);
    expect(compareProjectVersions("2.7.0", "3.0.0")).toBe(-1);
    expect(compareProjectVersions("2.9007199254740993.0", "2.9007199254740992.0")).toBe(1);
  });

  it.each([
    [0xdd, 0xff, 0xff, 0xff, 0xff],
    [0xdf, 0xff, 0xff, 0xff, 0xff],
    [0xc6, 0x00, 0x00, 0x00, 0x01, 0xff],
  ])("rejects declared MessagePack allocations and embedded binary before model creation (%j)", async (...bytes) => {
    await expect(parse(await archive([["stage.msgpack", new Uint8Array(bytes)]]))).rejects.toThrow();
  });

  it.each(["../stage.msgpack", "/stage.msgpack", "attachments/../a.png", "attachments\\a.png", "bad:stream"])(
    "rejects unsafe archive name %s",
    async (name) => {
      await expect(
        parse(
          await archive([
            ["stage.msgpack", encode([])],
            [name, encode([])],
          ]),
        ),
      ).rejects.toThrow("unsafe entry");
    },
  );

  it("rejects duplicated entries and file/directory conflicts before extraction", async () => {
    const duplicate = await archive([
      ["stage.msgpack", encode([])],
      ["other.msgpack", encode([])],
    ]);
    replaceAscii(duplicate, "other.msgpack", "stage.msgpack");
    await expect(parse(duplicate)).rejects.toThrow("duplicate or conflicting");
    await expect(
      parse(
        await archive([
          ["stage.msgpack", encode([])],
          ["attachments", encode([])],
          ["attachments/a.png", encode([])],
        ]),
      ),
    ).rejects.toThrow("file/directory conflict");
  });

  it("rejects conflicting formats, missing stage and invalid JSON instead of opening empty projects", async () => {
    await expect(parse(await archive([["README.md", new Uint8Array()]]))).rejects.toThrow("missing stage");
    await expect(parse(await archive([["project.json", new Uint8Array()]]))).rejects.toThrow();
    await expect(
      parse(
        await archive([
          ["stage.msgpack", encode([])],
          ["project.json", new Uint8Array()],
        ]),
      ),
    ).rejects.toThrow("conflicting JSON");
  });

  it("rejects duplicate attachment IDs across extensions and malformed attachment paths", async () => {
    await expect(
      parse(
        await archive([
          ["stage.msgpack", encode([])],
          ["attachments/a.png", new Uint8Array()],
          ["attachments/a.jpg", new Uint8Array()],
        ]),
      ),
    ).rejects.toThrow("duplicate attachment ID");
    await expect(
      parse(
        await archive([
          ["stage.msgpack", encode([])],
          ["attachments/a/b.png", new Uint8Array()],
        ]),
      ),
    ).rejects.toThrow("invalid attachment");
  });

  it.each([
    ["stage.msgpack", encode({ objects: [] }), "stage must be an array"],
    ["tags.msgpack", encode([42]), ""],
    ["reference.msgpack", encode({ sections: {}, files: 42 }), ""],
    ["metadata.msgpack", encode({ version: 42 }), "invalid legacy metadata"],
    ["README.md", new Uint8Array([0xff]), ""],
  ] as const)("does not expose partially parsed attachments after invalid %s", async (name, data, message) => {
    const existing = new Blob(["existing"]);
    const attachments = new Map([["existing", existing]]);
    const entries: [string, Uint8Array][] = [
      ["attachments/existing.png", new Uint8Array([1])],
      ["stage.msgpack", encode([])],
    ];
    if (name === "stage.msgpack") entries.pop();
    entries.push([name, data]);
    const result = expect(parse(await archive(entries), attachments)).rejects;
    if (message) await result.toThrow(message);
    else await result.toThrow();
    expect([...attachments]).toEqual([["existing", existing]]);
  });

  it("checks CRC and rejects claimed oversized or understated decompression sizes", async () => {
    const corrupt = await archive([["stage.msgpack", encode([])]]);
    const corruptView = new DataView(corrupt.buffer, corrupt.byteOffset, corrupt.byteLength);
    const dataOffset = 30 + corruptView.getUint16(26, true) + corruptView.getUint16(28, true);
    corrupt[dataOffset] ^= 1;
    await expect(parse(corrupt)).rejects.toThrow();

    for (const size of [PROJECT_ARCHIVE_LIMITS.structuredBytes + 1, 0]) {
      const bytes = await archive([["stage.msgpack", encode([])]]);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let offset = 0; offset < bytes.byteLength - 46; offset++) {
        if (view.getUint32(offset, true) === 0x02014b50) view.setUint32(offset + 24, size, true);
      }
      await expect(parse(bytes)).rejects.toThrow();
    }
  });
});
