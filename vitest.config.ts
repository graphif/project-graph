import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [
    {
      name: "test-original-class-name",
      resolveId(id) {
        return id === "virtual:original-class-name" ? `\0${id}` : undefined;
      },
      load(id) {
        return id === "\0virtual:original-class-name"
          ? "export const getOriginalNameOf = value => value.name"
          : undefined;
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/src"),
    },
  },
  test: {
    include: ["app/src/**/*.test.{ts,tsx}", "packages/*/tests/**/*.test.{ts,tsx}"],
  },
});
