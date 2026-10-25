import { appVersion } from "../../mygo.config";
import { runProjectGraphCliProcess } from "./ProjectGraphCli";

await runProjectGraphCliProcess({
  version: appVersion,
  loadRuntime: () => import("./ProjectGraphCliDevelopmentRuntime"),
});
