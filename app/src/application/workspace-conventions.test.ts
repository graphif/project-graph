import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve("app/src");

/** 文档、字体授权与本地化文件名按约定保留，不参与 kebab-case 检查。 */
const allowedFileNames = new Set([
  "README.md",
  "OFL.txt",
  "NotoSansSC-Regular.otf",
  "zh_CN.yml",
  "zh_TW.yml",
  "zh_TWC.yml",
]);

/** 字体、图片等外部资源文件按原名保留，只检查源码与配置文件。 */
const checkedExtensions = new Set([".ts", ".tsx", ".css", ".json", ".yml", ".yaml", ".html"]);

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
    }),
  );
  return nested.flat();
}

describe("前端目录约定", () => {
  it("目录与文件使用 kebab-case", async () => {
    const offenders: string[] = [];
    for (const file of await collectFiles(sourceRoot)) {
      const relative = path.relative(sourceRoot, file);
      const segments = relative.split(path.sep);
      const fileName = segments.at(-1)!;
      const extension = path.extname(fileName);
      if (!checkedExtensions.has(extension) || allowedFileNames.has(fileName)) {
        // 外部资源文件不检查文件名，但同目录名仍需遵守 kebab-case。
      } else if (!/^[a-z0-9][a-z0-9.-]*$/.test(fileName)) {
        offenders.push(relative);
      }
      for (const directory of segments.slice(0, -1)) {
        if (!/^[a-z0-9][a-z0-9.-]*$/.test(directory)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("只有包含 JSX 的文件使用 .tsx", async () => {
    const offenders: string[] = [];
    for (const file of await collectFiles(sourceRoot)) {
      if (!file.endsWith(".tsx")) continue;
      const source = await readFile(file, "utf8");
      if (!source.includes("</") && !source.includes("/>")) offenders.push(path.relative(sourceRoot, file));
    }
    expect(offenders).toEqual([]);
  });

  it("不使用 index.tsx 作为目录入口", async () => {
    const offenders = (await collectFiles(sourceRoot)).filter((file) => path.basename(file) === "index.tsx");
    expect(offenders.map((file) => path.relative(sourceRoot, file))).toEqual([]);
  });

  it("core 不反向导入 feature 层", async () => {
    const coreRoot = path.join(sourceRoot, "core");
    const offenders: string[] = [];
    for (const file of await collectFiles(coreRoot)) {
      if (!/\.tsx?$/.test(file)) continue;
      const source = await readFile(file, "utf8");
      if (/from\s+["']@\/features\//u.test(source)) offenders.push(path.relative(sourceRoot, file));
    }
    expect(offenders).toEqual([]);
  });
});
