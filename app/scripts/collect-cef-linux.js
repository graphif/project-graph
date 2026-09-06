/* eslint-disable */
/**
 * Stage CEF Linux runtime files for deb/rpm/appimage packaging.
 *
 * Install path: /usr/lib/project-graph
 * (matches rpath $ORIGIN/../lib/project-graph and resolve_cef_resource_dir)
 *
 * Source priority:
 * 1. CEF_PATH
 * 2. target/<profile> next to the project-graph binary
 * 3. CARGO_TARGET_DIR if set
 *
 * Staging dir (relative to src-tauri): cef-linux-runtime/
 *
 * --- macOS universal helper (lipo) ---
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
const stageDir = path.join(srcTauriDir, "cef-linux-runtime");

const CEF_FILES = [
  "libcef.so",
  "libEGL.so",
  "libGLESv2.so",
  "libvulkan.so.1",
  "libvk_swiftshader.so",
  "vk_swiftshader_icd.json",
  "icudtl.dat",
  "v8_context_snapshot.bin",
  "chrome_100_percent.pak",
  "chrome_200_percent.pak",
  "resources.pak",
];

function isLinux() {
  const platform = process.env.TAURI_ENV_PLATFORM || process.platform;
  return platform === "linux" || platform === "linux-gnu";
}

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
    targetTriple === "universal-apple-darwin" || !targetTriple
      ? "universal-apple-darwin"
      : targetTriple,
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
      execSync(
        ["lipo", "-create", "-output", outPath, ...inputs]
          .map((s) => JSON.stringify(s))
          .join(" "),
        { stdio: "inherit" },
      );
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

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function candidateDirs() {
  const dirs = [];
  if (process.env.CEF_PATH) {
    dirs.push(path.resolve(process.env.CEF_PATH));
  }

  const profile = process.env.TAURI_ENV_DEBUG === "true" ? "debug" : "release";
  const cargoTarget = process.env.CARGO_TARGET_DIR
    ? path.resolve(process.env.CARGO_TARGET_DIR)
    : path.join(srcTauriDir, "target");

  // Prefer the active profile, then fall back so release packaging can
  // still pick up files that cef-dll-sys only copied into debug.
  for (const p of [profile, "release", "debug"]) {
    dirs.push(path.join(cargoTarget, p));
  }

  // Common system install used during development.
  dirs.push("/usr/lib/cef");

  return dirs;
}

function findSourceDir() {
  for (const dir of candidateDirs()) {
    if (!existsDir(dir)) continue;
    const missing = CEF_FILES.filter((name) => !existsFile(path.join(dir, name)));
    if (missing.length === 0) {
      return dir;
    }
  }
  return null;
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      copyFile(from, to);
    }
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

  if (!isLinux()) {
    console.log("[collect-cef-linux] skip (not linux)");
    return;
  }

  const sourceDir = findSourceDir();
  if (!sourceDir) {
    const searched = candidateDirs().join("\n  - ");
    console.error(
      `[collect-cef-linux] CEF runtime files not found.\n` +
        `Need all of: ${CEF_FILES.join(", ")}\n` +
        `Searched:\n  - ${searched}\n` +
        `Set CEF_PATH to a directory that contains them.`,
    );
    process.exit(1);
  }

  console.log(`[collect-cef-linux] source: ${sourceDir}`);
  console.log(`[collect-cef-linux] stage:  ${stageDir}`);

  rmrf(stageDir);
  fs.mkdirSync(stageDir, { recursive: true });

  for (const name of CEF_FILES) {
    copyFile(path.join(sourceDir, name), path.join(stageDir, name));
  }

  // CEF expects locales under the resource dir; runtime sets locales_dir_path there.
  const localesSrc = path.join(sourceDir, "locales");
  if (existsDir(localesSrc)) {
    copyDir(localesSrc, path.join(stageDir, "locales"));
  } else {
    console.warn("[collect-cef-linux] warning: locales/ not found; CEF may fail to load language packs");
  }

  const staged = fs.readdirSync(stageDir);
  console.log(`[collect-cef-linux] staged ${staged.length} entries for /usr/lib/project-graph`);
}

main();
