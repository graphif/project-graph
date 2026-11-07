import { getVersion } from "@/platform/app";
import { requireAppVersion } from "@/core/persistence/project-document";

declare const __PROJECT_GRAPH_CLI_VERSION__: string;

export async function getAppVersion(): Promise<string> {
  // Only the standalone CLI and tests inject a version; the WebView uses its actual host.
  return requireAppVersion(
    typeof __PROJECT_GRAPH_CLI_VERSION__ === "string" ? __PROJECT_GRAPH_CLI_VERSION__ : await getVersion(),
  );
}
