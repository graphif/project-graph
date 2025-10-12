/// <reference types="vitest/config" />

import operatorOverload from "unplugin-operator-overload/vite";
import originalClassName from "unplugin-original-class-name/vite";
import ViteYaml from "@modyfi/vite-plugin-yaml";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-oxc";
import path from "node:path";
import { createLogger, defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export const viteLogger = createLogger("info", { prefix: "[project-graph]" });

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    originalClassName({
      staticMethodName: "className",
    }),
    operatorOverload(),
    // 将svg文件作为react组件导入
    // import Icon from "./icon.svg?react"
    svgr(),
    // 解析yaml文件，作为js对象导入
    // import config from "./config.yaml"
    ViteYaml(),
    // react插件
    react(),
    // 分析组件性能
    // reactScan(),
  ],

  // 不清屏，方便看rust报错
  clearScreen: false,
  // tauri需要固定的端口
  server: {
    port: 1420,
    // 端口冲突时直接报错，不尝试下一个可用端口
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  // 2024年10月3日发现 pnpm build 会报错，
  // Top-level await is not available in the configured target environment
  // 添加下面的配置解决了
  // 2024/10/05 main.tsx去掉了顶层await，所以不需要这个配置
  // build: {
  //   target: "esnext",
  // },

  // 环境变量前缀
  // 只有名字以LR_开头的环境变量才会被注入到前端
  // import.meta.env.LR_xxx
  envPrefix: "LR_",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    sourcemap: false,
  },
});
