import { spawnSync } from "node:child_process";
import { accessSync, chmodSync, constants, copyFileSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const outDirIndex = process.argv.indexOf("--outDir");
const outDirArgument = outDirIndex === -1 ? undefined : process.argv[outDirIndex + 1];
if (!outDirArgument) throw new Error("--outDir is required");
const version = process.env.PROJECT_GRAPH_CLI_VERSION;
if (!version) throw new Error("PROJECT_GRAPH_CLI_VERSION is required");
const ownershipHelperSource = process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH;
if (!ownershipHelperSource) throw new Error("PROJECT_GRAPH_OWNERSHIP_HELPER_PATH is required");
accessSync(ownershipHelperSource, constants.R_OK | constants.X_OK);

const repositoryRoot = resolve(import.meta.dirname, "../..");
const outDir = resolve(outDirArgument);
const ownershipHelperFileName =
  process.platform === "win32" ? "project-graph-ownership-helper.exe" : "project-graph-ownership-helper";

function run(args: readonly string[]): void {
  const result = spawnSync("pnpm", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status === 0) return;
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

run([
  "--config.inject-workspace-packages=true",
  "--silent",
  "--filter",
  "@graphif/project-graph-cli-runtime",
  "--prod",
  "deploy",
  outDir,
]);
const ownershipHelperTarget = join(outDir, ownershipHelperFileName);
copyFileSync(ownershipHelperSource, ownershipHelperTarget);
chmodSync(ownershipHelperTarget, statSync(ownershipHelperSource).mode);
const runtimePackagePath = join(outDir, "package.json");
const runtimePackage = JSON.parse(readFileSync(runtimePackagePath, "utf8")) as Record<string, unknown>;
runtimePackage.version = version;
writeFileSync(runtimePackagePath, `${JSON.stringify(runtimePackage, null, 2)}\n`);
run([
  "--silent",
  "--filter",
  "@graphif/project-graph",
  "exec",
  "vite",
  "build",
  "--config",
  "vite.cli.config.ts",
  "--outDir",
  outDir,
]);
