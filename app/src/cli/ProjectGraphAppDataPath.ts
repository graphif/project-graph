import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

const APP_IDENTIFIER = "liren.project-graph";
const PROJECT_OWNERSHIP_DIRECTORY = "project-ownership";

export function resolveProjectGraphAppDataDirectories(
  platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
  homeDirectory = homedir(),
): string[] {
  const path = platform === "win32" ? win32 : posix;
  const legacyDirectory = path.join(homeDirectory, "Library", "Application Support", APP_IDENTIFIER);
  let dataDirectory: string;
  if (platform === "darwin") {
    dataDirectory = path.join(homeDirectory, "Library", "Application Support");
  } else if (platform === "win32") {
    dataDirectory = environment.APPDATA ?? path.join(homeDirectory, "AppData", "Roaming");
  } else {
    dataDirectory = environment.XDG_DATA_HOME ?? path.join(homeDirectory, ".local", "share");
  }
  const nativeDirectory = path.join(dataDirectory, APP_IDENTIFIER);
  return nativeDirectory === legacyDirectory ? [nativeDirectory] : [nativeDirectory, legacyDirectory];
}

export function resolveProjectGraphOwnershipDirectory(
  platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
  homeDirectory = homedir(),
): string {
  const path = platform === "win32" ? win32 : posix;
  return path.join(
    resolveProjectGraphAppDataDirectories(platform, environment, homeDirectory)[0],
    PROJECT_OWNERSHIP_DIRECTORY,
  );
}

export function resolveProjectOwnershipArtifactPaths(
  canonicalProjectPath: string,
  ownershipDirectory = resolveProjectGraphOwnershipDirectory(),
  platform = process.platform,
): {
  ownershipLock: string;
  connectableOwnerLock: string;
  connectableOwnerRecord: string;
} {
  const path = platform === "win32" ? win32 : posix;
  const normalizedProjectPath =
    platform === "win32" ? stripWindowsVerbatimPrefix(canonicalProjectPath) : canonicalProjectPath;
  const key = createHash("sha256")
    .update(Buffer.from(normalizedProjectPath, platform === "win32" ? "utf16le" : "utf8"))
    .digest("hex");
  return {
    ownershipLock: path.join(ownershipDirectory, `${key}.lock`),
    connectableOwnerLock: path.join(ownershipDirectory, `${key}.connectable.lock`),
    connectableOwnerRecord: path.join(ownershipDirectory, `${key}.connectable`),
  };
}

function stripWindowsVerbatimPrefix(path: string): string {
  if (path.startsWith("\\\\?\\UNC\\")) return `\\\\${path.slice(8)}`;
  if (path.startsWith("\\\\?\\")) return path.slice(4);
  return path;
}
