import { defineConfig } from "tsdown";
import originalClassName from "unplugin-original-class-name/rollup";

export default defineConfig({
  plugins: [originalClassName()],
});
