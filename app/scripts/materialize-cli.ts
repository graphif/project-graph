import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  constants,
  copyFileSync,
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { appVersion } from "../mygo.config";

const outDirIndex = process.argv.indexOf("--outDir");
const outDirArgument = outDirIndex === -1 ? undefined : process.argv[outDirIndex + 1];
if (!outDirArgument) throw new Error("--outDir is required");
const ownershipHelperSource = process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH;
if (!ownershipHelperSource) throw new Error("PROJECT_GRAPH_OWNERSHIP_HELPER_PATH is required");
accessSync(ownershipHelperSource, constants.R_OK | constants.X_OK);

const repositoryRoot = resolve(import.meta.dirname, "../..");
const outDir = resolve(outDirArgument);
mkdirSync(outDir, { recursive: true });
if (readdirSync(outDir).length !== 0) throw new Error("Output directory must be empty");
const ownershipHelperFileName =
  process.platform === "win32" ? "project-graph-ownership-helper.exe" : "project-graph-ownership-helper";

function run(args: readonly string[]): void {
  const result = spawnSync("bun", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status === 0) return;
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const runtimeDirectory = join(repositoryRoot, "packages/project-graph-cli-runtime");
// Bun's workspace hoisting barrier keeps this tree independent of the development workspace.
cpSync(join(runtimeDirectory, "node_modules"), join(outDir, "node_modules"), {
  recursive: true,
  dereference: true,
});
const ownershipHelperTarget = join(outDir, ownershipHelperFileName);
copyFileSync(ownershipHelperSource, ownershipHelperTarget);
chmodSync(ownershipHelperTarget, statSync(ownershipHelperSource).mode);
const runtimePackagePath = join(outDir, "package.json");
const runtimePackage = JSON.parse(readFileSync(join(runtimeDirectory, "package.json"), "utf8")) as Record<
  string,
  unknown
>;
runtimePackage.version = appVersion;
writeFileSync(runtimePackagePath, `${JSON.stringify(runtimePackage, null, 2)}\n`);
run(["run", "--cwd", "app", "vite", "build", "--config", "vite.cli.config.ts", "--outDir", outDir]);
