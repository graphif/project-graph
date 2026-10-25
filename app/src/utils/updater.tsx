import { Native } from "@/platform/desktop";

export async function checkUpdate() {
  return Native.checkForUpdates();
}
