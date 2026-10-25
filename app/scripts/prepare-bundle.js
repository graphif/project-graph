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
import { execSync } from "node:child_process";

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
 * If a single-arch macOS build is running, we still make sure the binary
 * is present by falling back to a plain copy of the only arch variant.
 */
function ensureMacOSBinaries() {
  if (!isMacOS()) return;

  const targetTriple = process.env.TAURI_ENV_TARGET_TRIPLE || "";
  const profile = process.env.TAURI_ENV_DEBUG === "true" ? "debug" : "release";
  const cargoTarget = process.env.CARGO_TARGET_DIR
    ? path.resolve(process.env.CARGO_TARGET_DIR)
    : path.join(srcTauriDir, "target");

  const EXE_SUFFIX = "";
  const SECONDARY_BINS = ["project-graph-ownership-helper"];

  // Figure out which arches we need to combine.
  // `universal-apple-darwin` -> merge both aarch64 + x86_64.
  // A specific arch triple (or empty) -> just copy/symlink if missing.
  const archTriples = [];
  if (targetTriple === "universal-apple-darwin" || targetTriple === "") {
    // Default to merging for universal when target is ambiguous (e.g. local dev
    // calls the script without the env var set).
    archTriples.push("aarch64-apple-darwin", "x86_64-apple-darwin");
  } else if (targetTriple.endsWith("apple-darwin")) {
    archTriples.push(targetTriple);
  } else {
    // Not a macOS target triple; nothing to do.
    return;
  }

  const outputDir = path.join(
    cargoTarget,
    targetTriple === "universal-apple-darwin" || !targetTriple ? "universal-apple-darwin" : targetTriple,
    profile,
  );

  if (!fs.existsSync(outputDir)) {
    // If the output dir doesn't exist yet, the build step hasn't produced
    // the main binary either; nothing to stage. Bundler would fail later
    // with a clearer message.
    return;
  }

  for (const binName of SECONDARY_BINS) {
    const outPath = path.join(outputDir, `${binName}${EXE_SUFFIX}`);
    if (existsFile(outPath)) {
      console.log(`[macos-helper-bins] ${binName}: already present at ${outPath}`);
      continue;
    }

    // Gather input candidates that actually exist on disk.
    const inputs = archTriples
      .map((t) => path.join(cargoTarget, t, profile, `${binName}${EXE_SUFFIX}`))
      .filter(existsFile);

    if (inputs.length === 0) {
      console.warn(
        `[macos-helper-bins] ${binName}: no arch build found under:\n  - ${archTriples
          .map((t) => path.join(cargoTarget, t, profile, binName))
          .join("\n  - ")}\n  (may fail during bundle)`,
      );
      continue;
    }

    if (inputs.length === 1) {
      // Single-arch build or only one arch compiled.
      console.log(`[macos-helper-bins] ${binName}: copying ${inputs[0]} -> ${outPath}`);
      fs.copyFileSync(inputs[0], outPath);
    } else {
      // Two arch builds available -> lipo merge.
      console.log(
        `[macos-helper-bins] ${binName}: lipo merging [${inputs
          .map((p) => path.basename(path.dirname(path.dirname(p))))
          .join(", ")}] -> ${outPath}`,
      );
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      execSync(["lipo", "-create", "-output", outPath, ...inputs].map((s) => JSON.stringify(s)).join(" "), {
        stdio: "inherit",
      });
    }

    try {
      fs.chmodSync(outPath, 0o755);
    } catch {
      // ignore
    }
  }
}

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function main() {
  // Always run the macOS secondary-binary lipo step when applicable.
  // This runs *before* bundling so Tauri sees the merged universal binary.
  try {
    ensureMacOSBinaries();
  } catch (e) {
    console.error("[macos-helper-bins] unexpected error:", e && e.stack ? e.stack : e);
    // Don't abort the whole build here; let the bundler surface the actual error.
  }
}

main();
