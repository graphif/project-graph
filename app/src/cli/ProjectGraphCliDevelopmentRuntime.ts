import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { ClosedProjectInvocationResult } from "./ClosedProjectInvocation";
import { runClosedProjectRuntime } from "./ProjectGraphCliClosedRuntime";
import { createProjectGraphCliRuntime } from "./ProjectGraphCliRuntime";
import type { ClosedProjectRuntimeOptions } from "./ProjectGraphCliRuntime";
import {
  projectGraphCliRuntimeCompatibilityPlugin,
  projectGraphCliRuntimeStubDescriptors,
  resolveProjectGraphCliRuntimeStubs,
} from "./ProjectGraphCliRuntimeCompatibility";

async function invokeClosedProjectToolInDevelopment(
  options: ClosedProjectRuntimeOptions,
): Promise<ClosedProjectInvocationResult> {
  const appRoot = fileURLToPath(new URL("../..", import.meta.url));
  const stubs = resolveProjectGraphCliRuntimeStubs(import.meta.url);
  let server: Awaited<ReturnType<typeof createServer>> | undefined;
  return runClosedProjectRuntime(async () => {
    server = await createServer({
      configFile: false,
      root: appRoot,
      logLevel: "silent",
      optimizeDeps: { noDiscovery: true },
      ssr: { noExternal: ["@platejs/math"] },
      resolve: {
        alias: [
          ...projectGraphCliRuntimeStubDescriptors.map(({ matcher, stubKey }) => ({
            find: matcher,
            replacement: stubs[stubKey],
          })),
          { find: "@", replacement: `${appRoot}/src` },
        ],
      },
      server: { middlewareMode: true },
      plugins: [projectGraphCliRuntimeCompatibilityPlugin(stubs)],
    });
    const runtime = (await server.ssrLoadModule("/src/cli/ClosedProjectInvocation.ts")) as {
      invokeClosedProjectTool: (
        value: typeof options,
        loadModule: (id: string) => Promise<Record<string, unknown>>,
      ) => Promise<ClosedProjectInvocationResult>;
    };
    return runtime.invokeClosedProjectTool(options, (id) => server!.ssrLoadModule(id));
  }, [async () => server?.close()]);
}

export const { runPathRoutedInvocation } = createProjectGraphCliRuntime(invokeClosedProjectToolInDevelopment);
