import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Encoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const ownershipHelperPath = fileURLToPath(
  new URL(
    `../../src-tauri/target/debug/project-graph-ownership-helper${process.platform === "win32" ? ".exe" : ""}`,
    import.meta.url,
  ),
);
const temporaryDirectories: string[] = [];

function materializeProductionRuntime(version: string): string {
  const outputDirectory = mkdtempSync(join(tmpdir(), "project-graph-production-cli-"));
  temporaryDirectories.push(outputDirectory);
  const result = spawnSync(
    "pnpm",
    ["--silent", "--filter", "@graphif/project-graph", "materialize:cli", "--outDir", outputDirectory],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PROJECT_GRAPH_CLI_VERSION: version,
        PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
      },
    },
  );
  expect(result).toMatchObject({ status: 0, stderr: "" });
  return join(outputDirectory, "project-graph.mjs");
}

async function createProjectFixture(): Promise<string> {
  const directory = mkdtempSync(join(tmpdir(), "project-graph-production-project-"));
  temporaryDirectories.push(directory);
  const projectPath = join(directory, "fixture.prg");
  const encoder = new Encoder();
  const archive = new Uint8ArrayWriter();
  const writer = new ZipWriter(archive, { level: 0 });
  await writer.add("stage.msgpack", new Uint8ArrayReader(encoder.encode([])), { level: 0 });
  await writer.add("tags.msgpack", new Uint8ArrayReader(encoder.encode([])), { level: 0 });
  await writer.add("reference.msgpack", new Uint8ArrayReader(encoder.encode({ sections: {}, files: [] })), {
    level: 0,
  });
  await writer.add("metadata.msgpack", new Uint8ArrayReader(encoder.encode({ version: "2.7.0" })), { level: 0 });
  await writer.close();
  writeFileSync(projectPath, await archive.getData());
  return projectPath;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("Project Graph production CLI runtime", () => {
  it("refuses to materialize over existing output", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "project-graph-production-cli-nonempty-"));
    temporaryDirectories.push(outputDirectory);
    const sentinelPath = join(outputDirectory, "keep.txt");
    writeFileSync(sentinelPath, "keep");

    const result = spawnSync(
      "pnpm",
      ["--silent", "--filter", "@graphif/project-graph", "materialize:cli", "--outDir", outputDirectory],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PROJECT_GRAPH_CLI_VERSION: "3.2.1",
          PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: ownershipHelperPath,
        },
      },
    );

    expect(result.status).toBe(1);
    expect(readFileSync(sentinelPath, "utf8")).toBe("keep");
  });

  it("materializes a versioned Node entry without runtime TypeScript or Vite", () => {
    const entryPath = materializeProductionRuntime("3.2.1");
    const outputDirectory = dirname(entryPath);
    const manifest = JSON.parse(readFileSync(join(outputDirectory, "package.json"), "utf8")) as {
      version: string;
      dependencies: Record<string, string>;
    };
    expect(manifest).toMatchObject({
      version: "3.2.1",
      dependencies: {
        jsdom: expect.stringMatching(/^29\.1\.1/),
        sharp: expect.stringMatching(/^0\.35\.3/),
      },
    });
    const runtimeSources = [
      entryPath,
      ...readdirSync(join(outputDirectory, "chunks"))
        .filter((file) => file.endsWith(".mjs"))
        .map((file) => join(outputDirectory, "chunks", file)),
    ].map((file) => readFileSync(file, "utf8"));
    expect(runtimeSources.every((source) => !source.includes("tsx/esm"))).toBe(true);
    expect(runtimeSources.every((source) => !source.includes("ssrLoadModule"))).toBe(true);
    expect(existsSync(join(outputDirectory, "node_modules", "tsx"))).toBe(false);
    expect(existsSync(join(outputDirectory, "node_modules", "vite"))).toBe(false);
    expect(
      existsSync(
        join(
          outputDirectory,
          process.platform === "win32" ? "project-graph-ownership-helper.exe" : "project-graph-ownership-helper",
        ),
      ),
    ).toBe(true);

    for (const env of [process.env, { ...process.env, PROJECT_GRAPH_CLI_OWNERSHIP_ACQUIRED: "1" }]) {
      expect(spawnSync(process.execPath, [entryPath, "--version"], { encoding: "utf8", env })).toMatchObject({
        status: 0,
        stdout: "3.2.1\n",
        stderr: "",
      });
    }
  }, 60_000);

  it("uses the package-local helper for a Closed Project invocation", async () => {
    const entryPath = materializeProductionRuntime("3.2.1");
    const projectPath = await createProjectFixture();
    const referenceStoreDirectory = mkdtempSync(join(tmpdir(), "project-graph-production-references-"));
    temporaryDirectories.push(referenceStoreDirectory);
    const referenceStorePath = join(referenceStoreDirectory, "store.json");

    expect(
      spawnSync(
        process.execPath,
        [entryPath, "tool", "invoke", "get_all_nodes", "--project", projectPath, "--input", "{}"],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: join(referenceStoreDirectory, "external-helper"),
            PROJECT_GRAPH_REFERENCE_STORE_PATH: referenceStorePath,
          },
        },
      ),
    ).toMatchObject({ status: 0, stdout: '{"objects":[]}\n', stderr: "" });
  }, 60_000);

  it("reuses the real child-process contract suite", () => {
    const entryPath = materializeProductionRuntime("3.2.1");
    const result = spawnSync("pnpm", ["exec", "vitest", "run", "app/src/cli/ProjectGraphCli.test.ts"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PROJECT_GRAPH_CLI_TEST_ENTRY: entryPath,
        PROJECT_GRAPH_CLI_TEST_VERSION: "3.2.1",
      },
    });

    expect(result).toMatchObject({ status: 0, stderr: "" });
  }, 240_000);
});
