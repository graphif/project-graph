import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node20",
  clean: true,
  shims: true,
  dts: {
    build: true,
  },
  minify: true,
  deps: {
    alwaysBundle: [/.*/],
    neverBundle: ["esbuild"],
  },
  tsconfig: "tsconfig.json",
});
