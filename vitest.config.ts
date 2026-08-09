import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/src"),
    },
  },
  test: {
    include: ["app/src/**/*.test.{ts,tsx}", "packages/*/tests/**/*.test.{ts,tsx}"],
  },
});
