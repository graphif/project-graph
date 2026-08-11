import type { ClosedProjectInvocationResult } from "./ClosedProjectInvocation";
import { runClosedProjectRuntime } from "./ProjectGraphCliClosedRuntime";
import { createProjectGraphCliRuntime } from "./ProjectGraphCliRuntime";
import type { ClosedProjectRuntimeOptions } from "./ProjectGraphCliRuntime";

function invokeClosedProjectToolInProduction(
  options: ClosedProjectRuntimeOptions,
): Promise<ClosedProjectInvocationResult> {
  return runClosedProjectRuntime(async () => {
    const { invokeClosedProjectTool, loadPrecompiledClosedProjectModule } = await import("./ClosedProjectInvocation");
    return invokeClosedProjectTool(options, loadPrecompiledClosedProjectModule);
  });
}

export const { runPathRoutedInvocation } = createProjectGraphCliRuntime(invokeClosedProjectToolInProduction);
