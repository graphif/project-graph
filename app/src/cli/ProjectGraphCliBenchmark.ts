import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Encoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import packageJson from "../../../package.json" with { type: "json" };
import { LATEST_PROJECT_VERSION } from "../core/ProjectFile";

export const NODE_COUNT = 5_000;
export const EDGE_COUNT = 10_000;
export const ATTACHMENT_COUNT = 8;
export const ATTACHMENT_PAYLOAD_BYTES = 512 * 1024;
const SAMPLE_COUNT = 20;
const P95 = 0.95;
const MAXIMUM_P95_MS = 5_000;
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const ownershipHelperPath = fileURLToPath(
  new URL(
    `../../src-tauri/target/debug/project-graph-ownership-helper${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url,
  ),
);
const artifactPath = join(repositoryRoot, "benchmarks", "project-graph-cli-cold-start", "GRAPH-27.json");

export type BenchmarkEnvironment = {
  hardware: { model: string; chip: string; memoryBytes: number };
  macOS: { productVersion: string; buildVersion: string };
  node: string;
  pnpm: string;
  projectGraphRuntime: string;
};

function fixtureUuid(kind: number, index: number): string {
  return `00000000-0000-4${kind.toString().padStart(3, "0")}-8000-${index.toString().padStart(12, "0")}`;
}

function createSerializedTextNode(index: number): Record<string, unknown> {
  return {
    _: "TextNode",
    uuid: fixtureUuid(1, index),
    text: `Benchmark node ${index}`,
    collisionBox: {
      _: "CollisionBox",
      shapes: [
        {
          _: "Rectangle",
          location: { _: "Vector", x: (index % 100) * 120, y: Math.floor(index / 100) * 80 },
          size: { _: "Vector", x: 100, y: 50 },
        },
      ],
    },
  };
}

function createSerializedLineEdge(index: number): Record<string, unknown> {
  return {
    _: "LineEdge",
    uuid: fixtureUuid(2, index),
    associationList: [{ $: `/${index % NODE_COUNT}` }, { $: `/${(index + 1) % NODE_COUNT}` }],
  };
}

export async function createLargeProjectFixture(projectPath: string): Promise<void> {
  const stage = [
    ...Array.from({ length: NODE_COUNT }, (_, index) => createSerializedTextNode(index)),
    ...Array.from({ length: EDGE_COUNT }, (_, index) => createSerializedLineEdge(index)),
  ];
  const encoder = new Encoder();
  const archive = new Uint8ArrayWriter();
  const writer = new ZipWriter(archive, { level: 0 });
  await writer.add("stage.msgpack", new Uint8ArrayReader(encoder.encode(stage)), { level: 0 });
  await writer.add("tags.msgpack", new Uint8ArrayReader(encoder.encode([])), { level: 0 });
  await writer.add("reference.msgpack", new Uint8ArrayReader(encoder.encode({ sections: {}, files: [] })), {
    level: 0,
  });
  await writer.add("metadata.msgpack", new Uint8ArrayReader(encoder.encode({ version: LATEST_PROJECT_VERSION })), {
    level: 0,
  });

  const attachmentSize = ATTACHMENT_PAYLOAD_BYTES / ATTACHMENT_COUNT;
  for (let index = 0; index < ATTACHMENT_COUNT; index++) {
    await writer.add(
      `attachments/${fixtureUuid(3, index)}.bin`,
      new Uint8ArrayReader(new Uint8Array(attachmentSize).fill(index)),
      { level: 0 },
    );
  }
  await writer.close();
  await writeFile(projectPath, await archive.getData());
}

export function nearestRankPercentile(samples: readonly number[], percentile: number): number {
  if (samples.length === 0) throw new Error("At least one sample is required");
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.ceil(percentile * sorted.length) - 1];
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function buildBenchmarkArtifact(options: {
  generatedAt: string;
  fixtureSha256: string;
  samplesMs: number[];
  environment: BenchmarkEnvironment;
}) {
  const p95Ms = nearestRankPercentile(options.samplesMs, P95);
  return {
    benchmark: "GRAPH-27",
    generatedAt: options.generatedAt,
    command: "pnpm benchmark:cli:cold-start",
    tool: "get_all_nodes",
    measurement: {
      start: "Project Graph CLI process start",
      end: "selected executor immediately before invocation",
      excludes: "tool execution",
      processIsolation: `${SAMPLE_COUNT} independent cold CLI processes`,
      osFileCache: "not cleared",
    },
    fixture: {
      schemaVersion: LATEST_PROJECT_VERSION,
      sha256: options.fixtureSha256,
      textNodes: NODE_COUNT,
      lineEdges: EDGE_COUNT,
      attachments: { count: ATTACHMENT_COUNT, totalPayloadBytes: ATTACHMENT_PAYLOAD_BYTES },
    },
    threshold: {
      sampleCount: SAMPLE_COUNT,
      percentile: P95,
      nearestRank: Math.ceil(SAMPLE_COUNT * P95),
      maximumMs: MAXIMUM_P95_MS,
    },
    samplesMs: options.samplesMs,
    summary: {
      minimumMs: Math.min(...options.samplesMs),
      maximumMs: Math.max(...options.samplesMs),
      meanMs: roundMilliseconds(options.samplesMs.reduce((sum, sample) => sum + sample, 0) / options.samplesMs.length),
      p95Ms,
      passed: p95Ms <= MAXIMUM_P95_MS,
    },
    environment: options.environment,
  };
}

function commandOutput(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function collectEnvironment(): BenchmarkEnvironment {
  return {
    hardware: {
      model: commandOutput("/usr/sbin/sysctl", ["-n", "hw.model"]),
      chip: commandOutput("/usr/sbin/sysctl", ["-n", "machdep.cpu.brand_string"]),
      memoryBytes: Number(commandOutput("/usr/sbin/sysctl", ["-n", "hw.memsize"])),
    },
    macOS: {
      productVersion: commandOutput("/usr/bin/sw_vers", ["-productVersion"]),
      buildVersion: commandOutput("/usr/bin/sw_vers", ["-buildVersion"]),
    },
    node: process.version,
    pnpm: commandOutput("pnpm", ["--version"]),
    projectGraphRuntime: packageJson.version,
  };
}

async function runColdStartSample(options: {
  projectPath: string;
  referenceStorePath: string;
  executorReadyPath: string;
}): Promise<number> {
  await rm(options.executorReadyPath, { force: true });
  const startedAt = process.hrtime.bigint();
  const result = await new Promise<{ exitCode: number | null; stderr: string }>((resolveResult, reject) => {
    const child = spawn(
      "pnpm",
      ["cli", "--", "tool", "invoke", "get_all_nodes", "--project", options.projectPath, "--input", "{}"],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          NO_COLOR: "1",
          PROJECT_GRAPH_CLI_EXECUTOR_READY_PATH: options.executorReadyPath,
          PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
          PROJECT_GRAPH_REFERENCE_STORE_PATH: options.referenceStorePath,
        },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (exitCode) => resolveResult({ exitCode, stderr }));
  });
  if (result.exitCode !== 0) {
    throw new Error(`Cold CLI process failed with exit ${result.exitCode}: ${result.stderr.trim()}`);
  }
  const executorReadyAt = BigInt(await readFile(options.executorReadyPath, "utf8"));
  return roundMilliseconds(Number(executorReadyAt - startedAt) / 1_000_000);
}

export async function runColdStartBenchmark(): Promise<ReturnType<typeof buildBenchmarkArtifact>> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "project-graph-cli-cold-start-"));
  try {
    const projectPath = join(temporaryDirectory, "large-current-schema.prg");
    const executorReadyPath = join(temporaryDirectory, "executor-ready.txt");
    await createLargeProjectFixture(projectPath);
    const fixtureSha256 = createHash("sha256")
      .update(await readFile(projectPath))
      .digest("hex");
    const samplesMs: number[] = [];
    for (let index = 0; index < SAMPLE_COUNT; index++) {
      const sample = await runColdStartSample({
        projectPath,
        referenceStorePath: join(temporaryDirectory, `ai-project-references-${index}.json`),
        executorReadyPath,
      });
      samplesMs.push(sample);
      process.stderr.write(`GRAPH-27 cold start ${index + 1}/${SAMPLE_COUNT}: ${sample.toFixed(3)} ms\n`);
    }

    const artifact = buildBenchmarkArtifact({
      generatedAt: new Date().toISOString(),
      fixtureSha256,
      samplesMs,
      environment: collectEnvironment(),
    });
    await mkdir(dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    return artifact;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runColdStartBenchmark()
    .then((artifact) => {
      process.stdout.write(`${JSON.stringify(artifact.summary)}\n`);
      if (!artifact.summary.passed) process.exitCode = 1;
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
