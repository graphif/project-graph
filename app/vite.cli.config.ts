import path from "node:path";
import { defineConfig } from "vite";
import {
  projectGraphCliRuntimeCompatibilityPlugin,
  projectGraphCliRuntimeStubDescriptors,
  resolveProjectGraphCliRuntimeStubs,
} from "./src/cli/ProjectGraphCliRuntimeCompatibility";

const version = process.env.PROJECT_GRAPH_CLI_VERSION;
if (!version) throw new Error("PROJECT_GRAPH_CLI_VERSION is required");
const runtimeStubs = resolveProjectGraphCliRuntimeStubs(new URL("./src/cli/", import.meta.url).href);

export default defineConfig({
  logLevel: "silent",
  plugins: [projectGraphCliRuntimeCompatibilityPlugin(runtimeStubs)],
  define: {
    __PROJECT_GRAPH_CLI_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: [
      ...projectGraphCliRuntimeStubDescriptors.map(({ matcher, stubKey }) => ({
        find: matcher,
        replacement: runtimeStubs[stubKey],
      })),
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
    ],
  },
  ssr: {
    external: ["jsdom", "sharp"],
    noExternal: true,
  },
  build: {
    emptyOutDir: false,
    target: "node26",
    ssr: path.resolve(import.meta.dirname, "./src/cli/project-graph-production.ts"),
    rolldownOptions: {
      output: {
        entryFileNames: "project-graph.mjs",
        chunkFileNames: "chunks/[name]-[hash].mjs",
      },
    },
  },
});
