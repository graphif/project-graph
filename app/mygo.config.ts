import { defineConfig } from "mygo-cli";

export const appVersion = "4.2.6-alpha1";
const acceptancePort = process.env.PROJECT_GRAPH_ACCEPTANCE_PORT;

export default defineConfig({
  name: "Project Graph",
  identifier: "dev.graphif.prg",
  version: appVersion,
  icon: "resources/icon.png",
  devUrl: acceptancePort ? `http://127.0.0.1:${acceptancePort}` : "http://localhost:1420",
  devCommand: acceptancePort ? "" : "bun run dev:webview",
  buildCommand: "bun run build",
  frontendDist: "dist",
  bindings: "src/generated/mygo.ts",
  out: "build",
  urlSchemes: ["prg"],
  fileAssociations: [
    {
      ext: ["prg"],
      name: "Project Graph Document",
      mimeType: "application/vnd.project-graph",
      role: "Editor",
    },
  ],
});
