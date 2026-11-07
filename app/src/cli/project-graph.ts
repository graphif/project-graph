import { appVersion } from "../../mygo.config";
import { runProjectGraphCliProcess } from "./project-graph-cli";

await runProjectGraphCliProcess({
  version: appVersion,
  loadRuntime: () => import("./project-graph-cli-development-runtime"),
});
