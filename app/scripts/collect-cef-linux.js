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
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
