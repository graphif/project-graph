/* eslint-disable */
/**
 * Tauri 2.x only lipos the main binary when building a universal target
 * (--target universal-apple-darwin). Additional binaries under src/bin/*.rs
 * (e.g. project-graph-ownership-helper) are NOT merged automatically but the
 * bundler still expects them under the universal target dir. We perform the
 * lipo step here as beforeBundleCommand so every downstream build benefits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const srcTauriDir = path.join(appDir, "src-tauri");

function isMacOS() {
  const platform = process.env.TAURI_ENV_PLATFORM || process.platform;
  return platform === "darwin" || platform === "macos";
}

/**
 * Ensure secondary `src/bin/*.rs` binaries exist for macOS universal builds.
 *
 * Tauri only lipos the main binary into <target>/universal-apple-darwin/.
 * Any additional [[bin]] targets (e.g. project-graph-ownership-helper) are
 * compiled per-arch but never merged, which makes the bundler fail with:
 *   Failed to copy binary from "<...>/universal-apple-darwin/release/<bin>": does not exist
 *
 * We merge them ourselves using `lipo -create`.
 *
 * Single-architecture builds already use the directory Cargo populated.
 */
function ensureMacOSBinaries() {
  if (!isMacOS()) return;

  const targetTriple = process.env.TAURI_ENV_TARGET_TRIPLE || "";
  const profile = process.env.TAURI_ENV_DEBUG === "true" ? "debug" : "release";
  const cargoTarget = process.env.CARGO_TARGET_DIR
    ? path.resolve(process.env.CARGO_TARGET_DIR)
    : path.join(srcTauriDir, "target");

  const universal = "universal-apple-darwin";
  const outputDir = path.join(cargoTarget, universal, profile);
  if (targetTriple ? targetTriple !== universal : !fs.existsSync(outputDir)) return;

  const helper = "project-graph-ownership-helper";
  const outPath = path.join(outputDir, helper);
  const inputs = ["aarch64-apple-darwin", "x86_64-apple-darwin"].map((triple) =>
    path.join(cargoTarget, triple, profile, helper),
  );
  const missing = inputs.filter((input) => !existsFile(input));
  if (missing.length > 0) {
    throw new Error(`Cannot bundle a universal helper. Missing: ${missing.join(", ")}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });
  execFileSync("lipo", ["-create", "-output", outPath, ...inputs], { stdio: "inherit" });
  const architectures = execFileSync("lipo", ["-archs", outPath], { encoding: "utf8" }).trim().split(/\s+/);
  if (!architectures.includes("arm64") || !architectures.includes("x86_64")) {
    throw new Error(`Invalid universal helper architectures: ${architectures.join(", ")}`);
  }
  fs.chmodSync(outPath, 0o755);
}

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

ensureMacOSBinaries();
