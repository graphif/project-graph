import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { access, glob, mkdir, readFile, writeFile } from "fs/promises";
import { join, relative } from "path";
import { logger } from "../logger";

export async function runPackage({ dist: distDir, out: outDir }: { dist: string; out: string }) {
  try {
    await access(join(distDir, "extension.js"));
    await access(join(distDir, "metadata.msgpack"));
  } catch {
    logger.error("Build artifacts not found. Please run 'extprg build' first.");
    process.exit(1);
  }
  const writer = new ZipWriter(new Uint8ArrayWriter());
  for await (const file of glob(`${distDir}/**/*`, { withFileTypes: true })) {
    if (!file.isFile()) continue;
    const path = join(file.parentPath, file.name);
    const relativePath = relative(process.cwd(), path);
    const zipPath = relative(distDir, path);
    const data = await readFile(path);
    await writer.add(zipPath, new Uint8ArrayReader(data));
    logger.info({ path, relativePath, zipPath, length: data.length }, "Added to package");
  }
  const zipData = await writer.close();
  const manifest = JSON.parse(await readFile("package.json", "utf-8"));
  const { name, version } = manifest;
  const packageName = `${name}-v${version}.prg`;
  await mkdir(outDir, { recursive: true });
  const path = join(outDir, packageName);
  await writeFile(path, zipData);
  logger.info({ path, length: zipData.length }, "Package created");
}
