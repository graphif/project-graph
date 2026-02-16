import * as OpenCC from "opencc-js";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export function i18nAutoTW(): Plugin {
  const zhCNPath = path.resolve(__dirname, "../src/locales/zh_CN.yml");
  const zhTWPath = path.resolve(__dirname, "../src/locales/zh_TW.yml");

  const converter = OpenCC.Converter({ from: "cn", to: "tw" });

  function convert() {
    try {
      if (!fs.existsSync(zhCNPath)) return;

      const content = fs.readFileSync(zhCNPath, "utf-8");
      const converted = converter(content);

      // Only write if changed to avoid infinite loops or unnecessary writes
      if (fs.existsSync(zhTWPath)) {
        const currentTW = fs.readFileSync(zhTWPath, "utf-8");
        if (currentTW === converted) return;
      }

      fs.writeFileSync(zhTWPath, converted, "utf-8");
      console.log(`[i18n-auto-tw] Updated zh_TW.yml from zh_CN.yml`);
    } catch (error) {
      console.error(`[i18n-auto-tw] Error converting zh_CN to zh_TW:`, error);
    }
  }

  return {
    name: "vite-plugin-i18n-auto-tw",
    buildStart() {
      convert();
    },
    handleHotUpdate({ file }) {
      if (file === zhCNPath) {
        convert();
      }
    },
  };
}
