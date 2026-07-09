import envPaths from "env-paths";
import { access, cp, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { logger } from "../logger";

export async function runInstall({ appId, dist: distDir }: { appId: string; dist: string }) {
  try {
    await access(join(distDir, "extension.js"));
    await access(join(distDir, "metadata.msgpack"));
  } catch {
    logger.error("Build artifacts not found. Please run 'extprg build' first.");
    process.exit(1);
  }
  const dataDir = envPaths(appId, { suffix: "" }).data;
  await mkdir(join(dataDir, "extensions"), { recursive: true });
  const manifest = JSON.parse(await readFile("package.json", "utf-8"));
  const targetDir = join(dataDir, "extensions", manifest.name);
  logger.info({ targetDir }, "Installing extension...");
  await cp(distDir, targetDir, {
    recursive: true,
  });
  logger.info("Extension installed successfully.");
}
