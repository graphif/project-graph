import * as OpenCC from "opencc-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const zhCNPath = path.resolve(__dirname, "../src/locales/zh_CN.yml");
const zhTWPath = path.resolve(__dirname, "../src/locales/zh_TW.yml");

const converter = OpenCC.Converter({ from: "cn", to: "tw" });

function convert() {
  try {
    if (!fs.existsSync(zhCNPath)) {
      console.error(`Source file not found: ${zhCNPath}`);
      return;
    }

    const content = fs.readFileSync(zhCNPath, "utf-8");
    const converted = converter(content);

    fs.writeFileSync(zhTWPath, converted, "utf-8");
    console.log(`Successfully updated zh_TW.yml from zh_CN.yml`);
  } catch (error) {
    console.error(`Error during conversion:`, error);
  }
}

convert();
