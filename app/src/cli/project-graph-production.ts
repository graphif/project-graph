import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectGraphCliProcess } from "./ProjectGraphCli";

declare const __PROJECT_GRAPH_CLI_VERSION__: string;

process.env.PROJECT_GRAPH_OWNERSHIP_HELPER_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  process.platform === "win32" ? "project-graph-ownership-helper.exe" : "project-graph-ownership-helper",
);

await runProjectGraphCliProcess({
  version: __PROJECT_GRAPH_CLI_VERSION__,
  loadRuntime: () => import("./ProjectGraphCliProductionRuntime"),
});
