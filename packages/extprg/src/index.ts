#!/usr/bin/env node

import cac from "cac";
import { runBuild } from "./commands/build";
import { runDev } from "./commands/dev";
import { runInstall } from "./commands/install";
import { runPackage } from "./commands/package";
import { DEFAULT_APP_ID } from "./constants";

const cli = cac("extprg");

cli
  .command("build", "Build the TypeScript code and generate metadata file")
  .option("--src <srcDir>", "Source directory", { default: "src" })
  .option("--dist <distDir>", "Dist directory", { default: "dist" })
  .action(runBuild);

cli
  .command("package", "Package the extension for distribution")
  .option("--dist <distDir>", "Dist directory", { default: "dist" })
  .option("--out <outDir>", "Output directory", { default: "out" })
  .action(runPackage);

cli
  .command("install", "Install the extension")
  .option("--src <srcDir>", "Source directory", { default: "src" })
  .option("--app-id <appId>", "Application ID", { default: DEFAULT_APP_ID })
  .action(runInstall);

cli
  .command("dev", "Start development server")
  .option("--src <srcDir>", "Source directory", { default: "src" })
  .option("--app-id <appId>", "Application ID", { default: DEFAULT_APP_ID })
  .action(runDev);

cli.help();

cli.parse();
