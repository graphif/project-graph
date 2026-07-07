/* eslint-disable */

import { readFileSync, writeFileSync } from "fs";

const features = (process.argv[2] ?? "").split(",").filter(Boolean);

const CARGO_TOML_PATH = "app/src-tauri/Cargo.toml";

const conf = readFileSync(CARGO_TOML_PATH);
const updated = conf
  .toString()
  .replaceAll(
    /^aha = { version = "(.*)", features = \["(.*)"\] }$/gm,
    `aha = { version = "$1", features = ${JSON.stringify(features)} }`,
  );

writeFileSync(CARGO_TOML_PATH, updated);

console.log(updated);
