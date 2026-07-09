import { encode } from "@msgpack/msgpack";
import { build } from "esbuild";
import { access, cp, mkdir, readFile, rm, writeFile } from "fs/promises";
import { extname, join } from "path";
import { PRG_VERSION } from "../constants";
import { logger } from "../logger";

export async function runBuild({ src: srcDir, dist: distDir }: { src: string; dist: string }) {
  try {
    await access("package.json");
  } catch {
    logger.error("package.json not found or unreadable");
    process.exit(1);
  }
  try {
    await access(join(srcDir, "extension.ts"));
  } catch {
    logger.error("src/extension.ts not found or unreadable");
    process.exit(1);
  }

  logger.info({ distDir }, "Cleaning dist directory...");
  await rm(distDir, { recursive: true, force: true });
  logger.info({ srcDir }, "Building with esbuild...");
  try {
    const result = await build({
      entryPoints: [join(srcDir, "extension.ts")],
      bundle: true,
      minify: true,
      platform: "browser",
      conditions: ["worker"],
      format: "esm",
      write: false,
    });
    const code = result.outputFiles[0].text;
    logger.info({ length: code.length }, "Built extension.js");
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, "extension.js"), code);
  } catch (error) {
    logger.error("Build failed: " + error);
    process.exit(1);
  }
  try {
    const manifest = JSON.parse(await readFile("package.json", "utf-8"));
    const { name, displayName, version, description, author } = manifest;
    const extensionMetadata = {
      id: name,
      name: displayName ?? name,
      version,
      description,
      author,
    };
    await writeFile(
      join(distDir, "metadata.msgpack"),
      encode({
        version: PRG_VERSION,
        extension: extensionMetadata,
      }),
    );
    logger.info({ PRG_VERSION, extensionMetadata }, `Wrote metadata.msgpack`);
  } catch (error) {
    logger.error("Failed to parse package.json: " + error);
    process.exit(1);
  }
  try {
    await access("README.md");
    await cp("README.md", join(distDir, "README.md"));
  } catch {
    logger.warn("README.md not found or unreadable, skipping");
  }
  try {
    const manifest = JSON.parse(await readFile("package.json", "utf-8"));
    const icon = manifest.icon;
    if (icon) {
      const ext = extname(icon).toLowerCase();
      if ([".svg", ".webp", ".png", ".jpg"].includes(ext)) {
        const iconName = `icon${ext}`;
        await cp(icon, join(distDir, iconName));
        logger.info({ icon, iconName }, "Copied icon to dist");
      } else {
        logger.warn({ icon, ext }, "Unsupported icon format, skipping");
      }
    }
  } catch {
    logger.warn("Failed to process icon field");
  }
  logger.info("Build completed successfully");
}
