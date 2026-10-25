import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const runtimeDirectory = join(repositoryRoot, "packages/project-graph-cli-runtime");

describe("Bun toolchain", () => {
  it("keeps production CLI dependencies inside the runtime workspace", () => {
    const runtimeRequire = createRequire(join(runtimeDirectory, "package.json"));
    for (const dependency of ["jsdom", "sharp"]) {
      const dependencyPath = realpathSync(runtimeRequire.resolve(dependency));
      const localPath = relative(join(runtimeDirectory, "node_modules"), dependencyPath);
      expect(localPath.startsWith(`..${sep}`)).toBe(false);
      expect(localPath).not.toBe("..");
    }
  });

  it("loads the platform-native image dependency after installation", async () => {
    const image = await sharp({
      create: { width: 2, height: 3, channels: 4, background: "white" },
    })
      .png()
      .toBuffer();
    expect(await sharp(image).metadata()).toMatchObject({ width: 2, height: 3, format: "png" });
  });

  it("copies a portable Node runtime dependency tree without development tools", () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-runtime-dependencies-"));
    try {
      cpSync(join(runtimeDirectory, "node_modules"), join(directory, "node_modules"), {
        recursive: true,
        dereference: true,
      });
      const entry = join(directory, "check.cjs");
      writeFileSync(
        entry,
        'const { JSDOM } = require("jsdom"); const sharp = require("sharp");\n' +
          'if (new JSDOM("<p>ok</p>").window.document.querySelector("p").textContent !== "ok") process.exit(1);\n' +
          "if (!sharp.versions.vips) process.exit(1);\n",
      );
      const result = spawnSync(process.execPath, [entry], { cwd: directory, encoding: "utf8" });
      expect(result.error).toBeUndefined();
      expect(result).toMatchObject({ status: 0, stdout: "", stderr: "" });
      expect(existsSync(join(directory, "node_modules/vite"))).toBe(false);
      expect(existsSync(join(directory, "node_modules/tsx"))).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("refuses nonempty CLI output before invoking any build", () => {
    const directory = mkdtempSync(join(tmpdir(), "project-graph-materialize-preflight-"));
    const sentinel = join(directory, "keep.txt");
    writeFileSync(sentinel, "keep");
    try {
      const result = spawnSync("bun", ["run", "app/scripts/materialize-cli.ts", "--outDir", directory], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PROJECT_GRAPH_OWNERSHIP_HELPER_PATH: process.execPath,
        },
      });
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Output directory must be empty");
      expect(readFileSync(sentinel, "utf8")).toBe("keep");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
