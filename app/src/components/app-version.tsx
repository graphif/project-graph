import { getVersion } from "@tauri-apps/api/app";
import { use } from "react";

const appVersionPromise = getVersion();
export default function AppVersion() {
  const appVersion = use(appVersionPromise);
  return appVersion;
}
