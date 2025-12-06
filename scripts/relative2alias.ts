import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const SRC_DIR = resolve(process.cwd(), "src"); // @ 指向目录
const EXTS = [".ts", ".tsx", ".js", ".jsx"];

/**
 * 判断是否为相对路径
 */
// const isRelative = (p: string) => p.startsWith("./") || p.startsWith("../");

/**
 * 将相对路径 import 转换成 @/xxx
 */
function toAlias(currentFile: string, rawImport: string) {
  const absolute = resolve(currentFile, "..", rawImport);
  const rel = relative(SRC_DIR, absolute).replace(/\\/g, "/");
  if (rel.startsWith("..")) return null; // 超出 src 范围，保持原样
  return `@/${rel}`;
}

/**
 * 替换单个文件
 */
function fixFile(file: string) {
  const code = readFileSync(file, "utf8");
  const newCode = code.replace(/from\s+['"]([^'"]+)['"]/g, (_, quote: string) => {
    if (!quote.includes("./")) return _;
    const alias = toAlias(file, quote);
    return alias ? `from "@/${relative(SRC_DIR, resolve(file, "..", quote)).replace(/\\/g, "/")}"` : _;
  });
  if (newCode !== code) {
    writeFileSync(file, newCode);
    console.log(`✅ ${file}`);
  }
}

/**
 * 递归目录
 */
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (EXTS.includes(extname(name))) {
      fixFile(full);
    }
  }
}

walk(SRC_DIR);
