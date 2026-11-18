import { defineConfig } from "vitest/config";
import path from "node:path";
import { appVersion } from "./app/mygo.config";

export default defineConfig({
  define: { __PROJECT_GRAPH_CLI_VERSION__: JSON.stringify(appVersion) },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/src"),
    },
  },
  test: {
    css: { include: [/katex\.min\.css/] },
    server: { deps: { inline: ["@platejs/math"] } },
    include: ["app/src/**/*.test.{ts,tsx}", "packages/*/tests/**/*.test.{ts,tsx}"],
    maxWorkers: 4,
  },
});
