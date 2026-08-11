import { runProjectGraphCliProcess } from "./ProjectGraphCli";

declare const __PROJECT_GRAPH_CLI_VERSION__: string;

await runProjectGraphCliProcess({
  version: __PROJECT_GRAPH_CLI_VERSION__,
  loadRuntime: () => import("./ProjectGraphCliProductionRuntime"),
});
