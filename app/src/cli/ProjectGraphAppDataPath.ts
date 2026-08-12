import { homedir } from "node:os";
import { posix, win32 } from "node:path";

const APP_IDENTIFIER = "liren.project-graph";

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
