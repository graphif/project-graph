import originalClassName from "unplugin-original-class-name/rollup";
import { defineConfig } from "tsdown";

export default defineConfig({
  plugins: [originalClassName()],
});
