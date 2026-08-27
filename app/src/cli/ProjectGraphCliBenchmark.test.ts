import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Decoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import { afterEach, describe, expect, it } from "vitest";
import { LATEST_PROJECT_VERSION } from "../core/ProjectFile";
import {
  ATTACHMENT_COUNT,
  ATTACHMENT_PAYLOAD_BYTES,
  EDGE_COUNT,
  NODE_COUNT,
  buildBenchmarkArtifact,
  createLargeProjectFixture,
  nearestRankPercentile,
} from "./ProjectGraphCliBenchmark";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Project Graph CLI cold-start benchmark", () => {
  it("creates the fixed current-schema large Project fixture", async () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-cli-benchmark-fixture-"));
    temporaryDirectories.push(directory);
    const projectPath = join(directory, "large-current-schema.prg");

    await createLargeProjectFixture(projectPath);

    const reader = new ZipReader(new Uint8ArrayReader(readFileSync(projectPath)));
    const entries = await reader.getEntries();
    const stageEntry = entries.find(({ filename }) => filename === "stage.msgpack");
    const metadataEntry = entries.find(({ filename }) => filename === "metadata.msgpack");
    const attachmentEntries = entries.filter(({ filename }) => filename.startsWith("attachments/"));
    if (!stageEntry || stageEntry.directory || !metadataEntry || metadataEntry.directory) {
      throw new Error("Benchmark fixture is missing required Project entries");
    }
    const decoder = new Decoder();
    const stage = decoder.decode(await stageEntry.getData(new Uint8ArrayWriter())) as Array<Record<string, unknown>>;
    const metadata = decoder.decode(await metadataEntry.getData(new Uint8ArrayWriter())) as { version: string };
    await reader.close();

    const nodes = stage.filter(({ _ }) => _ === "TextNode");
    const edges = stage.filter(({ _ }) => _ === "LineEdge");
    expect(metadata.version).toBe(LATEST_PROJECT_VERSION);
    expect(nodes).toHaveLength(NODE_COUNT);
    expect(edges).toHaveLength(EDGE_COUNT);
    expect(attachmentEntries).toHaveLength(ATTACHMENT_COUNT);
    expect(attachmentEntries.reduce((total, entry) => total + entry.uncompressedSize, 0)).toBe(
      ATTACHMENT_PAYLOAD_BYTES,
    );

    for (const edge of edges) {
      const associationList = edge.associationList as Array<{ $: string }>;
      expect(associationList).toHaveLength(2);
      expect(associationList[0].$).not.toBe(associationList[1].$);
      for (const reference of associationList) {
        const target = stage[Number(reference.$.slice(1))];
        expect(target?._).toBe("TextNode");
      }
    }
  });

  it("uses nearest-rank sample 19 for a 20-sample p95", () => {
    const samples = [20, 7, 13, 2, 18, 4, 10, 1, 15, 6, 8, 5, 12, 9, 14, 3, 11, 16, 19, 17];

    expect(nearestRankPercentile(samples, 0.95)).toBe(19);
  });

  it("records raw samples, the fixed threshold, and the reproducibility environment", () => {
    const samplesMs = [20, 7, 13, 2, 18, 4, 10, 1, 15, 6, 8, 5, 12, 9, 14, 3, 11, 16, 19, 17];

    const artifact = buildBenchmarkArtifact({
      generatedAt: "2026-08-09T00:00:00.000Z",
      fixtureSha256: "fixture-sha",
      samplesMs,
      environment: {
        hardware: { model: "Mac", chip: "Apple Silicon", memoryBytes: 16 },
        macOS: { productVersion: "26.0", buildVersion: "25A1" },
        node: "v26.0.0",
        pnpm: "11.3.0",
        projectGraphRuntime: "1.0.0",
      },
    });

    expect(artifact).toMatchObject({
      benchmark: "GRAPH-27",
      command: "pnpm benchmark:cli:cold-start",
      tool: "get_all_nodes",
      measurement: {
        start: "Project Graph CLI process start",
        end: "selected executor immediately before invocation",
        excludes: "tool execution",
        processIsolation: "20 independent cold CLI processes",
        osFileCache: "not cleared",
      },
      fixture: {
        schemaVersion: LATEST_PROJECT_VERSION,
        sha256: "fixture-sha",
        textNodes: NODE_COUNT,
        lineEdges: EDGE_COUNT,
        attachments: { count: ATTACHMENT_COUNT, totalPayloadBytes: ATTACHMENT_PAYLOAD_BYTES },
      },
      threshold: { sampleCount: 20, percentile: 0.95, nearestRank: 19, maximumMs: 5_000 },
      samplesMs,
      summary: { minimumMs: 1, maximumMs: 20, meanMs: 10.5, p95Ms: 19, passed: true },
      environment: {
        hardware: { model: "Mac", chip: "Apple Silicon", memoryBytes: 16 },
        macOS: { productVersion: "26.0", buildVersion: "25A1" },
        node: "v26.0.0",
        pnpm: "11.3.0",
        projectGraphRuntime: "1.0.0",
      },
    });
  });
});
