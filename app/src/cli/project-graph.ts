import packageJson from "../../../package.json" with { type: "json" };
import { runProjectGraphCliProcess } from "./ProjectGraphCli";

await runProjectGraphCliProcess({
  version: packageJson.version,
  loadRuntime: () => import("./ProjectGraphCliDevelopmentRuntime"),
});
