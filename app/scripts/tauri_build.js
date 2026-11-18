/* eslint-disable */
import { spawn } from "node:child_process";

const tauriBuildArgs = JSON.parse(process.env.TAURI_BUILD_ARGS || "[]");
if (!Array.isArray(tauriBuildArgs) || !tauriBuildArgs.every((arg) => typeof arg === "string")) {
  throw new Error("TAURI_BUILD_ARGS must be a JSON array of strings");
}
const args = ["tauri", "build", ...tauriBuildArgs];

const pnpmBin = process.env.npm_execpath;
if (!pnpmBin) throw new Error("Run this script through pnpm");

let child;

// 使用 spawn 执行命令
if (pnpmBin.endsWith("js")) {
  child = spawn("node", [pnpmBin, ...args], {
    stdio: "inherit",
  });
} else {
  child = spawn(pnpmBin, args, {
    stdio: "inherit",
  });
}

// 处理退出
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
