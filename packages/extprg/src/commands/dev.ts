import { watch } from "chokidar";
import { glob, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { logger } from "../logger";
import { runBuild } from "./build";
import { runInstall } from "./install";

export async function runDev({ src: srcDir, appId }: { src: string; appId: string }) {
  const tempDir = await mkdtemp(join(tmpdir(), "extprg-"));
  const files = await Array.fromAsync(glob(`${srcDir}/**/*`));
  logger.info({ tempDir, files }, "Starting development server...");
  watch(files).on("all", async (event, path) => {
    logger.info({ event, path }, "File changed, rebuilding...");
    await runBuild({ src: srcDir, dist: tempDir });
    await runInstall({ dist: tempDir, appId });
  });
}
