import { appDataDir, join } from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";

export namespace ExtensionManager {
  export async function getExtensionsDir() {
    return await join(await appDataDir(), "extensions");
  }
  export async function getExtensions() {
    const extensionsDir = await getExtensionsDir();
    const entries = await readDir(extensionsDir);
    return entries.filter((it) => it.isFile).map((it) => it.name);
  }
}
